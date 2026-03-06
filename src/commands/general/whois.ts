import { SlashCommandBuilder, ChatInputCommandInteraction, type SlashCommandOptionsOnlyBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';
import * as schema from '../../modules/database/Schema.ts';
import { eq } from 'drizzle-orm';

export class WhoisCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'whois',
			description: 'Gets detailed information about a member.',
			usage: 'whois <name>',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 5,
		});
	}

	command(): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description)
			.addStringOption(option =>
				option.setName('name')
					.setDescription('Full name or partial name of the member')
					.setRequired(true)
			);
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();

		try {
			const searchName = interaction.options.getString('name', true).toLowerCase();

			// Search for member by name
			const allMembers = await this.client.database.getDB().select().from(schema.members);
			
			const matchingMembers = allMembers.filter((m: any) => {
				const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
				return m.active && fullName.includes(searchName);
			});

			if (matchingMembers.length === 0) {
				await interaction.editReply({
					content: `No member found matching "${searchName}".`,
				});
				return;
			}

			if (matchingMembers.length > 1) {
				const names = matchingMembers
					.slice(0, 10)
					.map((m: any) => `${m.firstName} ${m.lastName}`)
					.join('\n');
				
				await interaction.editReply({
					content: `Multiple members found. Please be more specific:\n${names}`,
				});
				return;
			}

			const member = matchingMembers[0];

			// Get related data
			const [committees, projects] = await Promise.all([
				this.client.database.getDB()
					.select()
					.from(schema.committeeMembers)
					.where(eq(schema.committeeMembers.memberId, member.id)),
				this.client.database.getDB()
					.select()
					.from(schema.projectMembers)
					.where(eq(schema.projectMembers.memberId, member.id)),
			]);

			// Get committee names
			const committeeNames: string[] = [];
			for (const cm of committees) {
				const committee = await this.client.database.getDB()
					.select()
					.from(schema.committees)
					.where(eq(schema.committees.id, cm.committeeId));
				
				if (committee[0]) {
					const name = cm.isChair ? `${committee[0].title} (Chair)` : committee[0].title;
					committeeNames.push(name);
				}
			}

			// Get project names
			const projectNames: string[] = [];
			for (const pm of projects) {
				const project = await this.client.database.getDB()
					.select()
					.from(schema.projects)
					.where(eq(schema.projects.id, pm.projectId));
				
				if (project[0]) {
					const name = pm.isLead ? `${project[0].title} (Lead)` : project[0].title;
					projectNames.push(name);
				}
			}

			// Build embed
			const embed = this.client.createEmbed()
				.setTitle(`${member.firstName} ${member.lastName}`)
				.setTimestamp();

			// Add profile picture if Discord ID exists
			if (member.discordId) {
				try {
					const user = await this.client.users.fetch(member.discordId);
					embed.setThumbnail(user.displayAvatarURL({ size: 256 }));
				} catch (e) {
					// User not found or not in cache, skip thumbnail
				}
			}

			// Basic info
			embed.addFields({
				name: '📚  Academic Info:',
				value: `**Major: ** ${member.major}\n**Graduation Year: ** ${member.graduationYear}`,
				inline: false,
			});

			// Biography
			if (member.biography) {
				embed.addFields({
					name: '📝  Biography:',
					value: member.biography.length > 1024 
						? member.biography.substring(0, 1021) + '...' 
						: member.biography,
					inline: false,
				});
			}

			// Roles & Status
			const roles = [];
			if (member.officerStatus && member.officerRole) roles.push(`⭐ ${member.officerRole}`);

			// Committees
			if (committeeNames.length > 0) {
				embed.addFields({
					name: '📋 Committees:',
					value: committeeNames.join('\n'),
					inline: true,
				});
			}

			// Projects
			if (projectNames.length > 0) {
				embed.addFields({
					name: '🔧 Projects:',
					value: projectNames.join('\n'),
					inline: true,
				});
			}

			// Links (only populated ones)
			const links = [];
			if (member.linkedinUrl) links.push(`[LinkedIn](${member.linkedinUrl})`);
			if (member.githubUrl) links.push(`[GitHub](${member.githubUrl})`);
			if (member.websiteUrl) links.push(`[Website](${member.websiteUrl})`);
			if (member.resumeUrl) links.push(`[Resume](${member.resumeUrl})`);

			if (links.length > 0) {
				embed.addFields({
					name: '🔗  Links:',
					value: links.join('  •  '),
					inline: false,
				});
			}

			await interaction.editReply({ 
				content: `<@${member.discordId}>`,
				embeds: [embed] });
		} catch (error) {
			this.client.logger.fail(`Error fetching member info: ${error}`);
			console.error(error);
			await interaction.editReply('An error occurred while fetching member information.');
		}
	}
}