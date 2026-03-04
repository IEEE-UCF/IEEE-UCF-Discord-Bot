import { 
	SlashCommandBuilder, 
	ChatInputCommandInteraction, 
	StringSelectMenuBuilder, 
	StringSelectMenuOptionBuilder,
	ActionRowBuilder,
	ComponentType
} from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';
import * as schema from '../../modules/database/Schema.ts';
import { eq } from 'drizzle-orm';

export class InfoCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'info',
			description: 'Gets information about committees, projects, or officers.',
			usage: 'info',
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
		await interaction.deferReply(); // bot is thinking

		try {
			// Initial dropdown menu
			const categorySelect = new StringSelectMenuBuilder()
				.setCustomId('info_category')
				.setPlaceholder('Select a category') // placeholder text shown before user clicks on dropdown
				.addOptions( // dropdown options
					new StringSelectMenuOptionBuilder()
						.setLabel('Committees')
						.setValue('committees')
						.setEmoji('📋'),
					new StringSelectMenuOptionBuilder()
						.setLabel('Projects')
						.setValue('projects')
						.setEmoji('🔧'),
					new StringSelectMenuOptionBuilder()
						.setLabel('Officers')
						.setValue('officers')
						.setEmoji('⭐')
				);

			const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect);

			const response = await interaction.editReply({
				content: 'What would you like to know about?', // actual text
				components: [row], // dropdown
			});

			const categoryCollector = response.createMessageComponentCollector({ // waits for a selection
				componentType: ComponentType.StringSelect,
				time: 60000,
			});

			categoryCollector.on('collect', async (i) => { // runs when the above variable is activated (someone selects something)
				if (i.user.id !== interaction.user.id) {
					await i.reply({ content: 'This menu is not for you!', ephemeral: true }); // if somebody besides the initial user tries to use menu
					return;
				}

				const category = i.values[0]; // which category was selected

				if (category === 'officers') {
					// Show officers directly
					await i.deferUpdate();
					await this.showOfficers(interaction); // function showing officers
					categoryCollector.stop();
				} else if (category === 'committees') {
					// Show committee selection
					await i.deferUpdate();
					await this.showCommitteeSelection(interaction, categoryCollector); // function showing committees to choose from
				} else if (category === 'projects') {
					// Show project selection
					await i.deferUpdate();
					await this.showProjectSelection(interaction, categoryCollector); // function showing projects to choose from
				}
			});

			categoryCollector.on('end', async (collected, reason) => {
				if (reason === 'time') {
					await interaction.editReply({
						content: 'Selection timed out.',
						components: [],
					});
				}
			});
		} catch (error) {
			this.client.logger.fail(`Error in info command: ${error}`);
			console.error(error);
			await interaction.editReply({
				content: 'An error occurred while fetching information.',
				components: [],
			});
		}
	}

	async getChapterChair(): Promise<string> {
		// Get the Executive Chair
		const chair = await this.client.database.getDB()
			.select()
			.from(schema.members)
			.where(eq(schema.members.officerRole, 'Executive Chair')); // pulls member with role 'Executive Chair' into var chair

		if (chair.length > 0) {
			return `${chair[0].firstName} ${chair[0].lastName}`; // chair's first and last name
		}
		return 'N/A';
	}

	async showCommitteeSelection(interaction: ChatInputCommandInteraction, parentCollector: any): Promise<void> {
		const committees = await this.client.database.getDB()
			.select()
			.from(schema.committees)
			.where(eq(schema.committees.active, true));

		if (committees.length === 0) {
			await interaction.editReply({
				content: 'No active committees found.',
				components: [],
			});
			return;
		}

		const committeeSelect = new StringSelectMenuBuilder() // new dropdown
			.setCustomId('committee_select')
			.setPlaceholder('Select a committee') // placeholder text
			.addOptions(
				committees.map((c: any) =>
					new StringSelectMenuOptionBuilder() // creates options for each committee
						.setLabel(c.title) // label - committee title
						.setValue(c.id) // value - committee ID
				)
			);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(committeeSelect);

		await interaction.editReply({
			content: 'Select a committee:', // placeholder text
			components: [row], // dropdown
		});

		const committeeCollector = interaction.channel?.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 60000,
		});

		if (!committeeCollector) return;

		committeeCollector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'This menu is not for you!', ephemeral: true });
                return;
            }

            await i.deferUpdate();
            const committeeId = i.values[0] as string;

            await this.showCommitteeInfo(interaction, committeeId); // calls funcion that actually shows the committee details
            committeeCollector.stop();
            parentCollector.stop();
        });
	}

	async showProjectSelection(interaction: ChatInputCommandInteraction, parentCollector: any): Promise<void> {
		const projects = await this.client.database.getDB()
			.select()
			.from(schema.projects)
			.where(eq(schema.projects.active, true));

		if (projects.length === 0) {
			await interaction.editReply({
				content: 'No active projects found.',
				components: [],
			});
			return;
		}

		const projectSelect = new StringSelectMenuBuilder()
			.setCustomId('project_select')
			.setPlaceholder('Select a project')
			.addOptions(
				projects.map((p: any) =>
					new StringSelectMenuOptionBuilder()
						.setLabel(p.title)
						.setValue(p.id)
				)
			);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(projectSelect);

		await interaction.editReply({
			content: 'Select a project:',
			components: [row],
		});

		const projectCollector = interaction.channel?.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 60000,
		});

		if (!projectCollector) return;

		projectCollector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'This menu is not for you!', ephemeral: true });
                return;
            }

            await i.deferUpdate();
            const projectId = i.values[0] as string;
            await this.showProjectInfo(interaction, projectId);
            projectCollector.stop();
            parentCollector.stop();
        });
	}

	async showCommitteeInfo(interaction: ChatInputCommandInteraction, committeeId: string): Promise<void> {
		const committee = await this.client.database.getDB()
			.select()
			.from(schema.committees)
			.where(eq(schema.committees.id, committeeId));

		if (committee.length === 0) {
			await interaction.editReply({
				content: 'Committee not found.',
				components: [],
			});
			return;
		}

		const c = committee[0];

		// Get chair info
		const chair = await this.client.database.getDB()
			.select()
			.from(schema.members)
			.where(eq(schema.members.id, c.chairId));

		const chairName = chair.length > 0 ? `${chair[0].firstName} ${chair[0].lastName}` : 'N/A';

		// Get members
		const committeeMembers = await this.client.database.getDB()
			.select()
			.from(schema.committeeMembers)
			.where(eq(schema.committeeMembers.committeeId, c.id));

		const memberNames = await Promise.all(
			committeeMembers.map(async (cm: any) => {
				const member = await this.client.database.getDB()
					.select()
					.from(schema.members)
					.where(eq(schema.members.id, cm.memberId));
				
				if (member.length > 0) {
					return `${member[0].firstName} ${member[0].lastName}${cm.isChair ? ' (Chair)' : ''}`;
				}
				return null;
			})
		);

		const validMembers = memberNames.filter((m) => m !== null);

		// Get upcoming events
		const upcomingEvents = await this.client.database.getDB()
			.select()
			.from(schema.events)
			.where(eq(schema.events.committeeId, c.id));

		const now = new Date();
		const futureEvents = upcomingEvents.filter((e: any) => new Date(e.startTime) > now);

		const chapterChair = await this.getChapterChair();

		const embed = this.client.createEmbed()
			.setTitle(`📋 ${c.title}`)
			.setDescription(`**IEEE @ UCF Chapter Chair: ${chapterChair}**\n\n${c.about}`)
			.setTimestamp();

		embed.addFields({
			name: '👤 Committee Chair',
			value: chairName,
			inline: true,
		});

		embed.addFields({
			name: '👥 Member Count',
			value: `${validMembers.length}`,
			inline: true,
		});

		if (c.discordRoleId) {
			embed.addFields({
				name: '🎭 Discord Role',
				value: `<@&${c.discordRoleId}>`,
				inline: true,
			});
		}

		if (validMembers.length > 0) {
			const memberList = validMembers.slice(0, 25).join('\n');
			embed.addFields({
				name: '📝 Members',
				value: memberList.length > 1024 ? memberList.substring(0, 1021) + '...' : memberList,
				inline: false,
			});
		}

		if (futureEvents.length > 0) {
			const eventList = futureEvents
				.slice(0, 5)
				.map((e: any) => `${e.title} - <t:${Math.floor(new Date(e.startTime).getTime() / 1000)}:F>`)
				.join('\n');
			
			embed.addFields({
				name: '📅 Upcoming Events',
				value: eventList,
				inline: false,
			});
		}

		await interaction.editReply({
			content: null,
			embeds: [embed],
			components: [],
		});
	}

	async showProjectInfo(interaction: ChatInputCommandInteraction, projectId: string): Promise<void> {
		const project = await this.client.database.getDB()
			.select()
			.from(schema.projects)
			.where(eq(schema.projects.id, projectId));

		if (project.length === 0) {
			await interaction.editReply({
				content: 'Project not found.',
				components: [],
			});
			return;
		}

		const p = project[0];

		// Get project members
		const projectMembers = await this.client.database.getDB()
			.select()
			.from(schema.projectMembers)
			.where(eq(schema.projectMembers.projectId, p.id));

		const memberInfo = await Promise.all(
			projectMembers.map(async (pm: any) => {
				const member = await this.client.database.getDB()
					.select()
					.from(schema.members)
					.where(eq(schema.members.id, pm.memberId));
				
				if (member.length > 0) {
					return {
						name: `${member[0].firstName} ${member[0].lastName}`,
						isLead: pm.isLead,
					};
				}
				return null;
			})
		);

		const validMembers = memberInfo.filter((m) => m !== null);
		const leads = validMembers.filter((m) => m?.isLead).map((m) => m?.name);
		const members = validMembers.filter((m) => !m?.isLead).map((m) => m?.name);

		const chapterChair = await this.getChapterChair();

		const embed = this.client.createEmbed()
			.setTitle(`🔧 ${p.title}`)
			.setDescription(`**IEEE @ UCF Chapter Chair: ${chapterChair}**\n\n${p.overview}`)
			.setTimestamp();

		if (leads.length > 0) {
			embed.addFields({
				name: '👑 Project Lead(s)',
				value: leads.join('\n'),
				inline: true,
			});
		}

		embed.addFields({
			name: '👥 Team Size',
			value: `${validMembers.length}`,
			inline: true,
		});

		if (p.discordRoleId) {
			embed.addFields({
				name: '🎭 Discord Role',
				value: `<@&${p.discordRoleId}>`,
				inline: true,
			});
		}

		if (p.hardwareInfo) {
			embed.addFields({
				name: '🔩 Hardware',
				value: p.hardwareInfo.length > 1024 ? p.hardwareInfo.substring(0, 1021) + '...' : p.hardwareInfo,
				inline: false,
			});
		}

		if (p.softwareInfo) {
			embed.addFields({
				name: '💻 Software',
				value: p.softwareInfo.length > 1024 ? p.softwareInfo.substring(0, 1021) + '...' : p.softwareInfo,
				inline: false,
			});
		}

		if (p.skills) {
			embed.addFields({
				name: '🎯 Skills',
				value: p.skills.length > 1024 ? p.skills.substring(0, 1021) + '...' : p.skills,
				inline: false,
			});
		}

		if (members.length > 0) {
			const memberList = members.slice(0, 25).join('\n');
			embed.addFields({
				name: '📝 Team Members',
				value: memberList.length > 1024 ? memberList.substring(0, 1021) + '...' : memberList,
				inline: false,
			});
		}

		await interaction.editReply({
			content: null,
			embeds: [embed],
			components: [],
		});
	}

	async showOfficers(interaction: ChatInputCommandInteraction): Promise<void> {
		const officers = await this.client.database.getDB()
			.select()
			.from(schema.members)
			.where(eq(schema.members.officerStatus, true));

		if (officers.length === 0) {
			await interaction.editReply({
				content: 'No officers found.',
				components: [],
			});
			return;
		}

		const chapterChair = await this.getChapterChair();

		const embed = this.client.createEmbed()
			.setTitle('⭐ IEEE@UCF Officers')
			.setDescription(`**IEEE @ UCF Chapter Chair: ${chapterChair}**\n\nOur dedicated officer team for this academic year.`)
			.setTimestamp();

		// Group officers by role
		const officersByRole: Record<string, string[]> = {};

		for (const officer of officers) {
			const role = officer.officerRole || 'General Officer';
			const name = `${officer.firstName} ${officer.lastName}`;
			
			if (!officersByRole[role]) {
				officersByRole[role] = [];
			}
			officersByRole[role].push(name);
		}

		// Add fields for each role
		const roleOrder = [
			'Executive Chair',
			'Vice Chair',
			'Treasurer',
			'Secretary',
			'Project Chair',
			'Workshop Chair',
			'Conference Chair',
			'Outreach Chair',
			'Service Chair',
			'Social Chair',
			'Professional Development Chair',
			'Marketing Chair',
			'Software Chair',
			'General Officer',
		];

		for (const role of roleOrder) {
			if (officersByRole[role]) {
				embed.addFields({
					name: role,
					value: officersByRole[role].join('\n'),
					inline: true,
				});
			}
		}

		await interaction.editReply({
			content: null,
			embeds: [embed],
			components: [],
		});
	}
}