import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class TestCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'test',
			description: 'Simple test command that replies with Hello World!',
			usage: 'test',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 1,
		});
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.reply('Hello World!');
	}

	command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}
}

export default TestCommand;
