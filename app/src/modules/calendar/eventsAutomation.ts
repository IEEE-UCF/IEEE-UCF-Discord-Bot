import { EmbedBuilder, TextChannel, Message, time, TimestampStyles } from 'discord.js';

interface TrackedReminder {
	eventId: string;
	messageId: string;
	eventStartTime: number;
}

export class eventsAutomation {
	client: any;
	weeklyBoardMessage: Message | null = null;
	activeReminders = new Map<string, TrackedReminder>();
	updateInterval: NodeJS.Timeout | null = null;
	reminderCheckInterval: NodeJS.Timeout | null = null;

	constructor(client: any) {
		this.client = client;
	}

	private started = false;
	/**
	 * Start the automation system
	 */
	async start() {
		// Check if automation is enabled
		if (!this.client.config.servers.main.eventsAutomation.enabled) {
			this.client.logger.log('Events automation is disabled in config.');
			return;
		}

		this.client.logger.log('Starting events automation...');
		if (this.started) return;
		this.started = true;

		// Post initial weekly board
		await this.updateWeeklyBoard();

		// Update weekly board based on config interval
		const intervalMinutes = this.client.config.servers.main.eventsAutomation.updateIntervalMinutes;
		this.updateInterval = setInterval(async () => {
			await this.updateWeeklyBoard();
		}, intervalMinutes * 60 * 1000);

		// Check for upcoming events every 5 minutes
		this.reminderCheckInterval = setInterval(async () => {
			await this.checkUpcomingEvents();
		}, 5 * 60 * 1000);

		this.client.logger.success('Events automation started.');
	}

	/**
	 * Stop the automation system
	 */
	stop() {
		if (this.updateInterval) clearInterval(this.updateInterval);
		if (this.reminderCheckInterval) clearInterval(this.reminderCheckInterval);
		if (this.started) {
			this.client.logger.log('Events automation stopped.');
		}
	}

	/**
	 * Create or update the weekly events board
	 */
	async updateWeeklyBoard() {
		try {
			const channelId = this.client.config.servers.main.channels.calendar;
			if (!channelId) {
				this.client.logger.fail('Calendar channel not configured.');
				return;
			}

			const channel = this.client.channels.cache.get(channelId) as TextChannel;
			if (!channel?.isTextBased()) {
				this.client.logger.fail('Calendar channel not found or not a text channel.');
				return;
			}

			const embed = await this.buildWeeklyEventsEmbed();

			if (this.weeklyBoardMessage) {
				// Update existing message
				await this.weeklyBoardMessage.edit({ embeds: [embed] });
			} else {
				// Post new message
				this.weeklyBoardMessage = await channel.send({ embeds: [embed] });
			}

			if (this.client.config.debug) {
				this.client.logger.log('Weekly events board updated.');
			}
		} catch (error) {
			this.client.logger.fail(`Error updating weekly board: ${error}`);
		}
	}

	/**
	 * Build the weekly events embed (reuses logic from /events)
	 */
	async buildWeeklyEventsEmbed(): Promise<EmbedBuilder> {
		const events = await this.client.calendar.fetchCalendarEvents();
		const now = new Date();
		const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
		const eventsThisWeek = events.filter((event: any) => {
			const eventDate = event.start as Date;
			return eventDate >= now && eventDate <= oneWeekFromNow;
		});

		if (eventsThisWeek.length === 0) {
			return this.client.createEmbed()
				.setTitle('📅  Events This Week')
				.setDescription('No events scheduled for this week.')
				.setTimestamp()
				.setFooter({ text: `Last updated • ${this.client.config.embed.footer}` });
		}

		const durationString = (seconds: number): string => {
			const days = Math.floor(seconds / 86400);
			const hrs = Math.floor((seconds % 86400) / 3600);
			const mins = Math.floor((seconds % 3600) / 60);
			let result = '';
			if (days > 0) result += `${days}d `;
			if (hrs > 0) result += `${hrs}h `;
			if (mins > 0) result += `${mins}m`;
			return result.trim() || '<1m';
		};

		const upcomingEvents = eventsThisWeek;

		const embed = new EmbedBuilder()
			.setTitle('📅  Events This Week')
			.setColor(this.client.config.embed.color)
			.setTimestamp()
			.setFooter({ text: `${this.client.config.embed.footer}` });

		for (const event of upcomingEvents) {
			const duration = event.end && event.start
				? Math.floor(((event.end as Date).getTime() - (event.start as Date).getTime()) / 1000)
				: null;

			const eventDate = time(event.start as Date, TimestampStyles.ShortDateTime);
			const relativeTime = time(event.start as Date, TimestampStyles.RelativeTime);
			const location = event.location ? `📍 ${event.location}` : '📍 TBA/Check Announcement';
			const durationText = duration ? `⏱️ ${durationString(duration)}` : '';

			const fieldValue = [
				`${eventDate} (${relativeTime})`,
				location,
				durationText,
			].filter(Boolean).join('\n');

			embed.addFields({
				name: event.summary ?? 'Untitled Event',
				value: fieldValue,
				inline: false,
			});
		}

		return embed;
	}

	/**
	 * Check for events starting soon and manage reminders
	 */
	async checkUpcomingEvents() {
		if (!this.client.config.servers.main.eventReminders.enabled) {
			return;
		}

		try {
			const events = await this.client.calendar.fetchCalendarEvents();
			const now = new Date();
			const reminderMinutes = this.client.config.servers.main.eventReminders.reminderMinutes;
			const reminderTime = reminderMinutes * 60 * 1000; // Convert to milliseconds

			for (const event of events) {
				const eventStart = event.start as Date;
				const timeDiff = eventStart.getTime() - now.getTime();

				// Create unique ID for this event occurrence
				const eventId = `${event.uid || event.summary}_${eventStart.getTime()}`;

				// Check if event has passed - delete reminder if exists
				if (timeDiff < 0 && this.activeReminders.has(eventId)) {
					await this.deleteReminder(eventId);
					continue;
				}

				// Check if event is within reminder window, +/- 10 minutes
				const reminderWindow = 10 * 60 * 1000; // 10 minute window

				const isInReminderWindow = timeDiff <= reminderTime && timeDiff > reminderTime - (5 * 60 * 1000);
				if (isInReminderWindow && !this.activeReminders.has(eventId)) {
					await this.sendReminder(event, eventId);
				}
			}
		} catch (error) {
			this.client.logger.fail(`Error checking upcoming events: ${error}`);
		}
	}

	/**
	 * Send a reminder for an upcoming event
	 */
	async sendReminder(event: any, eventId: string) {
		try {
			const channelId = this.client.config.servers.main.channels.reminders;
			if (!channelId) return;

			const channel = this.client.channels.cache.get(channelId) as TextChannel;
			if (!channel?.isTextBased()) return;

			const reminderHours = this.client.config.servers.main.eventReminders.reminderMinutes / 60;
			const roleToPing = this.client.config.servers.main.roleToPing;

			const embed = this.client.createEmbed()
				.setTitle(`⏰  Event Starting in ${reminderHours} hour!`)
				.setDescription(`**${event.summary ?? 'Untitled Event'}** is starting soon!`)
				.addFields(
					{ name: '📅  Start Time', value: time(event.start as Date, TimestampStyles.LongDateTime), inline: true },
					{ name: '📍 Location', value: event.location || 'Check Announcement', inline: true },
				)
				.setColor('#FF6B6B'); // Red/orange for urgency - not IEEE hex code? lmao

			const content = roleToPing ? `<@&${roleToPing}>` : '';
			const message = await channel.send({ content, embeds: [embed] });

			// Track this reminder
			this.activeReminders.set(eventId, {
				eventId,
				messageId: message.id,
				eventStartTime: (event.start as Date).getTime(),
			});

			this.client.logger.success(`Sent reminder for: ${event.summary}`);
		} catch (error) {
			this.client.logger.fail(`Error sending reminder: ${error}`);
		}
	}

	/**
	 * Delete a reminder message
	 */
	async deleteReminder(eventId: string) {
		try {
			const reminder = this.activeReminders.get(eventId);
			if (!reminder) return;

			const channelId = this.client.config.servers.main.channels.reminders;
			if (!channelId) return;

			const channel = this.client.channels.cache.get(channelId) as TextChannel;
			if (!channel?.isTextBased()) return;

			const message = await channel.messages.fetch(reminder.messageId).catch(() => null);
			if (message) {
				await message.delete();
				this.client.logger.log(`Deleted reminder for event: ${eventId}`);
			}

			this.activeReminders.delete(eventId);
		} catch (error) {
			this.client.logger.fail(`Error deleting reminder: ${error}`);
		}
	}

	async cleanupOnShutdown() {
		try {
			// Delete weekly board
			if (this.weeklyBoardMessage) {
				await this.weeklyBoardMessage.delete().catch(() => null);
				this.client.logger.log('Deleted weekly board message on shutdown.');
			}

			// Delete all active reminders
			for (const [eventId, reminder] of this.activeReminders.entries()) {
				const channelId = this.client.config.servers.main.channels.reminders;
				const channel = this.client.channels.cache.get(channelId) as TextChannel;

				if (channel?.isTextBased()) {
					const msg = await channel.messages.fetch(reminder.messageId).catch(() => null);
					if (msg) await msg.delete().catch(() => null);
				}

				this.activeReminders.delete(eventId);
			}

			this.client.logger.log('Cleaned up reminders on shutdown.');
		} catch (err) {
			this.client.logger.fail(`Error during shutdown cleanup: ${err}`);
		}
	}

}