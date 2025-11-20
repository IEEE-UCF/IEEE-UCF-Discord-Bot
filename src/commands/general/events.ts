import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, time, TimestampStyles } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class EventsCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'events',
			description: 'Lists all the upcoming club events.',
			usage: 'events',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 5,
		});
	}
	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();

		try {
			const events = await this.client.calendar.fetchCalendarEvents();

			if (events.length === 0) {
				await interaction.editReply('There are no upcoming events.');
				return;
			}

			// Filter events to only show those in the next 7 days
			const now = new Date();
			const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
			const eventsThisWeek = events.filter((event: any) => {
				const eventDate = event.start as Date;
				return eventDate >= now && eventDate <= oneWeekFromNow;
			});

			if (eventsThisWeek.length === 0) {
				await interaction.editReply('There are no events scheduled in the next week.');
				return;
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

			// Limit to first 5 events
			const upcomingEvents = eventsThisWeek.slice(0, 5);

			const embed = new EmbedBuilder()
				.setTitle('📅 Events This Week')
				.setColor(this.client.config.embed.color)
				.setTimestamp()
				.setFooter({ text: `Showing ${upcomingEvents.length} of ${eventsThisWeek.length} event${eventsThisWeek.length !== 1 ? 's' : ''}` });

			for (const event of upcomingEvents) {
				const duration = event.end && event.start
					? Math.floor(((event.end as Date).getTime() - (event.start as Date).getTime()) / 1000)
					: null;

				const eventDate = time(event.start as Date, TimestampStyles.ShortDateTime);
				const relativeTime = time(event.start as Date, TimestampStyles.RelativeTime);
				const location = event.location ? `📍 ${event.location}` : '📍 TBA';
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

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			this.client.logger.fail(`Error fetching calendar events: ${error}`);
			await interaction.editReply('An error occurred while fetching events. Please try again later.');
		}
	}

	command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}
}