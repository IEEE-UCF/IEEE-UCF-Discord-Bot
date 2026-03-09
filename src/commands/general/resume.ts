import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class ResumeCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'resume',
			description: 'Shows the LaTeX Resume Format resource.',
			usage: 'resume',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 5,
		});
	}

	command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();

		try {
			const creatorId = '239553056818200576'; // the goat yousef
			
			// Fetch the user to get their info
			const creator = await this.client.users.fetch(creatorId).catch(() => null);
			
			// Get their server nickname if they're in the server
			let displayName = creator?.username || 'Unknown';
			if (interaction.guild) {
				const member = await interaction.guild.members.fetch(creatorId).catch(() => null);
				if (member) {
					displayName = member.displayName;
				}
			}

			const embed = this.client.createEmbed()
				.setTitle('**LaTeX Resume Format **')
				.setDescription(`Check out the github below, created by ${displayName}!
                    https://github.com/Quil180/resume`)
				.setThumbnail(creator?.displayAvatarURL({ size: 256 }) || '')
				.setTimestamp();

			await interaction.editReply({
				embeds: [embed],
			});
		} catch (error) {
			this.client.logger.fail(`Error in resume command: ${error}`);
			console.error(error);
			await interaction.editReply('An error occurred while fetching the resume information.');
		}
	}
}