import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class ShutdownCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'shutdown',
			description: 'Shuts the bot down.',
			usage: 'shutdown',
			category: 'admin',
			permissionLevel: PermissionLevel.ADMINISTRATOR,
			guildOnly: false,
			cooldown: 0, // No cooldown for shutdown
		});
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const embed = this.client.createEmbed()
			.setTitle('🔴  **Bot is now shutting down.**')
			.setFooter({
				text: `Requested by ${interaction.user.username} • ${this.client.config.embed.footer}`,
				iconURL: interaction.user.displayAvatarURL({ size: 1024 }),
			});

		await interaction.reply({
			embeds: [embed],
		});

		// Give time for the message to send
		await this.client.utils.sleep(1);

		// Graceful shutdown
		await this.client.destroy();

		// Small delay before exit
		await this.client.utils.sleep(1);

		process.exit(0);
	}

	command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}
}