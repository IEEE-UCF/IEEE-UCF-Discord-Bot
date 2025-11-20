import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class PingCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'ping',
			description: 'Shows the bot\'s connection status to the Discord API.',
			usage: 'ping',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 5,
		});
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const timeDiff = Date.now() - interaction.createdTimestamp;

		const embed = this.client.createEmbed()
			.setThumbnail(this.client.user?.displayAvatarURL() ?? null)
			.setTitle(`${this.client.user?.username ?? 'Larry'} Ping`)
			.setDescription([
				`🔂 **RTT**: ${timeDiff} ms`,
				`💟 **Heartbeat**: ${Math.round(this.client.ws.ping)} ms`,
			].join('\n'))
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