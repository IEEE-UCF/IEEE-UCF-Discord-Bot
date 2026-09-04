import { SlashCommandBuilder, ChatInputCommandInteraction, type SlashCommandOptionsOnlyBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';
import * as schema from '../../modules/database/Schema.ts';

export class MembersCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'members',
			description: 'Lists all active members in the database.',
			usage: 'members',
			category: 'admin',
			permissionLevel: PermissionLevel.ADMINISTRATOR,
			guildOnly: false,
			cooldown: 5,
		});
	}

	command(): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description)
			.addBooleanOption(option =>
				option.setName('officers')
					.setDescription('Show only officers')
					.setRequired(false),
			);
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();

		try {
			const officersOnly = interaction.options.getBoolean('officers') ?? false;

			// Query database for members
			const allMembers = await this.client.database.getDB().select().from(schema.members);

			const members = allMembers.filter((m: any) => {
				if (!m.active) return false;
				if (officersOnly && !m.officerStatus) return false;
				return true;
			});

			if (members.length === 0) {
				await interaction.editReply({
					content: officersOnly
						? 'No officers found in the database.'
						: 'No members found in the database.',
				});
				return;
			}

			// Build embed
			const embed = this.client.createEmbed()
				.setTitle(officersOnly ? '👥 Officers' : '👥  Active Members')
				.setDescription(`Total: ${members.length}`)
				.setTimestamp();

			// Simple list format
			const memberList = members
				.sort((a: any, b: any) => a.lastName.localeCompare(b.lastName))
				.slice(0, 100) // First X members
				.map((m: any) => {
					const name = `${m.firstName} ${m.lastName}`;
					const badges = [];
					if (m.administrator) badges.push('👑');
					if (m.officerStatus) badges.push('⭐');
					if (m.duesPaid) badges.push('✅');
					return `${name} ${badges.join(' ')}`;
				})
				.join('\n');

			embed.addFields({
				name: 'Members',
				value: memberList || 'None',
			});

			embed.addFields({
				name: 'Legend',
				value: '👑 Admin • ⭐ Officer • ✅ Dues Paid',
			});

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			this.client.logger.fail(`Error fetching members: ${error}`);
			console.error(error);
			await interaction.editReply('An error occurred while fetching members.');
		}
	}
}