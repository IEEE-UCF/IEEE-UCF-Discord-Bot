import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class ReloadCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'reload',
			description: 'Reloads all bot slash commands in memory without restarting.',
			usage: 'reload',
			category: 'admin',
			permissionLevel: PermissionLevel.ADMINISTRATOR,
			guildOnly: false,
			cooldown: 3,
		});
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ ephemeral: true });

		try {
			await this.client.reloadCommands();
			await this.replySuccess(
				interaction,
				'Commands Reloaded!',
				`Successfully reloaded **${this.client.commands.size}** commands in memory!`,
				true,
			);
		} catch (error) {
			this.client.logger.fail(`Failed to reload commands: ${error}`);
			await this.replyError(
				interaction,
				'Reload Failed',
				`An error occurred while reloading commands: ${error}`,
				true,
			);
		}
	}

	command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}
}

export default ReloadCommand;
