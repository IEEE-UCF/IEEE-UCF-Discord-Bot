import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

// Store previous ping values per user
const previousPings = new Map<string, { rtt: number; heartbeat: number }>();

export class PingCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'ping',
			description: 'Shows the bot\'s connection status to the Discord API.',
			usage: 'ping',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 1,
		});
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const currentRTT = Date.now() - interaction.createdTimestamp;
		const currentHeartbeat = Math.round(this.client.ws.ping);

		// Get previous values for this user
		const previous = previousPings.get(interaction.user.id);

		// Calculate differences
		let rttText = `🔂 **RTT**: ${currentRTT} ms`;
		let heartbeatText = `💟 **Heartbeat**: ${currentHeartbeat} ms`;

		if (previous) {
			const rttDiff = currentRTT - previous.rtt;
			const heartbeatDiff = currentHeartbeat - previous.heartbeat;

			// Add comparison arrows and colors
			const rttArrow = rttDiff > 0 ? ` +${rttDiff}` : rttDiff < 0 ? ` ${rttDiff}` : ' ±0';
			const hbArrow = heartbeatDiff > 0 ? ` +${heartbeatDiff}` : heartbeatDiff < 0 ? ` ${heartbeatDiff}` : ' ±0';

			rttText += ` (${rttArrow} ms )`;
			heartbeatText += ` (${hbArrow} ms )`;
		}

		// Store current values for next time
		previousPings.set(interaction.user.id, {
			rtt: currentRTT,
			heartbeat: currentHeartbeat,
		});

		const embed = this.client.createEmbed()
			.setThumbnail(this.client.user?.displayAvatarURL() ?? null)
			.setTitle(`${this.client.user?.username ?? 'Larry'} Ping`)
			.setDescription([rttText, heartbeatText].join('\n'))
			.setFooter({
				text: `Requested by ${interaction.user.username} • ${this.client.config.embed.footer}`,
				iconURL: interaction.user.displayAvatarURL({ size: 1024 }),
			});

		await interaction.reply({
			embeds: [embed],
		});
	}

	command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}
}