import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';
import * as schema from '../../modules/database/Schema.ts';
import { eq } from 'drizzle-orm';

export class StatsCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'stats',
			description: 'Displays IEEE @ UCF chapter statistics.',
			usage: 'stats',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 10,
		});
	}

	command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}

	/**
	 * Get academic year start date (August of previous year or current year)
	 */
	getAcademicYearStart(): Date {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth(); // 0-indexed (0 = January)

		// If we're before August (month 7), academic year started last August
		// If we're August or later, academic year started this August
		const academicYearStartYear = currentMonth < 7 ? currentYear - 1 : currentYear;

		return new Date(`${academicYearStartYear}-08-01T00:00:00Z`);
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();

		try {
			const academicYearStart = this.getAcademicYearStart();

			// Get all active members
			const allMembers = await this.client.database.getDB()
				.select()
				.from(schema.members)
				.where(eq(schema.members.active, true));

			const totalMembers = allMembers.length;

			// Count new members this academic year
			const newMembers = allMembers.filter((m: any) => {
				const joinDate = new Date(m.createdAt);
				return joinDate >= academicYearStart;
			});
			const newMemberCount = newMembers.length;

			// Get all active committees
			const committees = await this.client.database.getDB()
				.select()
				.from(schema.committees)
				.where(eq(schema.committees.active, true));

			// Get committee member counts
			const committeeStats = await Promise.all(
				committees.map(async (committee: any) => {
					const members = await this.client.database.getDB()
						.select()
						.from(schema.committeeMembers)
						.where(eq(schema.committeeMembers.committeeId, committee.id));

					return {
						title: committee.title,
						memberCount: members.length,
					};
				}),
			);

			// Sort by member count (largest first)
			committeeStats.sort((a, b) => b.memberCount - a.memberCount);

			// Get all active projects
			const projects = await this.client.database.getDB()
				.select()
				.from(schema.projects)
				.where(eq(schema.projects.active, true));

			// Get project member counts
			const projectStats = await Promise.all(
				projects.map(async (project: any) => {
					const members = await this.client.database.getDB()
						.select()
						.from(schema.projectMembers)
						.where(eq(schema.projectMembers.projectId, project.id));

					return {
						title: project.title,
						memberCount: members.length,
					};
				}),
			);

			// Sort by member count (largest first)
			projectStats.sort((a, b) => b.memberCount - a.memberCount);

			// Build embed
			const embed = this.client.createEmbed()
				.setTitle('IEEE @ UCF Chapter Statistics')
				.setTimestamp();

			// Overview section
			embed.addFields({
				name: 'Overview:',
				value: `👥 **\u00A0\Total Active Members:** ${totalMembers}\n🆕\u00A0\** New Members This Year:** ${newMemberCount}`,
				inline: false,
			});

			// Committees section
			if (committeeStats.length > 0) {
				const committeeList = committeeStats
					.map((c) => `${c.title}: **${c.memberCount}** member${c.memberCount !== 1 ? 's' : ''}`)
					.join('\n');

				embed.addFields({
					name: 'Committees:',
					value: committeeList,
					inline: false,
				});
			} else {
				embed.addFields({
					name: 'Committees:',
					value: 'No active committees 😡',
					inline: false,
				});
			}

			// Projects section
			if (projectStats.length > 0) {
				const projectList = projectStats
					.map((p) => `${p.title}: **${p.memberCount}** member${p.memberCount !== 1 ? 's' : ''}`)
					.join('\n');

				embed.addFields({
					name: 'Projects:',
					value: projectList,
					inline: false,
				});
			} else {
				embed.addFields({
					name: 'Projects:',
					value: 'No active projects 😡',
					inline: false,
				});
			}

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			this.client.logger.fail(`Error fetching stats: ${error}`);
			console.error(error);
			await interaction.editReply('An error occurred while fetching statistics.');
		}
	}
}
