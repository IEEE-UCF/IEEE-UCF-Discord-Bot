import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, time, TimestampStyles } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class EventsCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'events',
			description: 'Lists all the events coming up on the calendar.',
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

			const durationString = (seconds: number): string => {
				const days = Math.floor(seconds / 86400);
				const hrs = Math.floor((seconds % 86400) / 3600);
				const mins = Math.floor((seconds % 3600) / 60);
				const secs = seconds % 60;
				let result = '';
				if (days > 0) result += `${days}d `;
				if (hrs > 0) result += `${hrs}h `;
				if (mins > 0) result += `${mins}m `;
				if (secs > 0) result += `${secs}s`;
				return result.trim();
			};

			const embeds = [];
			// Limit to first 10 events (Discord's embed limit per message)
			const upcomingEvents = events.slice(0, 10);

			for (const event of upcomingEvents) {
				const duration = event.end && event.start
					? Math.floor(((event.end as Date).getTime() - (event.start as Date).getTime()) / 1000)
					: null;

				const embed = new EmbedBuilder()
					.setTitle(event.summary ?? 'Untitled Event')
					.addFields(
						{
							name: 'Location',
							value: event.location ? event.location.toString() : 'N/A',
						},
						{
							name: 'Scheduled for',
							value: time(event.start as Date, TimestampStyles.LongDateTime),
							inline: true,
						},
						{
							name: 'Duration',
							value: duration ? durationString(duration) : 'N/A',
							inline: true,
						},
					)
					.setColor(this.client.config.embed.color)
					.setTimestamp();

				embeds.push(embed);
			}

			await interaction.editReply({ content: null, embeds });
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