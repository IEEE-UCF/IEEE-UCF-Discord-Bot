/* Accessible to event organizers, project leads, and officers */
/* Accepts a channel, title, message, and role to ping to send a formatted announcement */

import { SlashCommandBuilder, ChatInputCommandInteraction, type SlashCommandOptionsOnlyBuilder, TextChannel } from 'discord.js';
import { Command } from '../../structs/Command.js';
import { PermissionLevel } from '../../modules/helpers/Utils.js';

export class AnnouncementCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'announcement', 
			description: 'Sends an announcement to a specified channel.', 
			usage: 'announcement <channel> <title> <message> [role]', 
			category: 'admin',
			permissionLevel: PermissionLevel.ADMINISTRATOR,
			guildOnly: false,
			cooldown: 0, // no cooldown for announcement
		});
	}

	command(): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description)

			// channel dropdown
			.addChannelOption(option =>
				option.setName('channel')
					.setDescription('The channel to send the announcement in')
					.setRequired(true)
			)

			.addStringOption(option =>
				option.setName('title')
					.setDescription('The title of the announcement')
					.setRequired(true)
			)

			.addStringOption(option =>
				option.setName('message')
					.setDescription('The announcement message')
					.setRequired(true)
			)

			// role dropdown
			.addRoleOption(option =>
				option.setName('role')
					.setDescription('Role to mention in the announcement')
					.setRequired(false)
			);
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {

		const channel = interaction.options.getChannel('channel', true) as TextChannel;
		const title = interaction.options.getString('title', true);
		const message = interaction.options.getString('message', true);
		const role = interaction.options.getRole('role', false);

		const embed = this.client.createEmbed()
			.setTitle(`📢 ${title} 📢`)
			.setDescription(message)
			.setFooter({
				text: `Announcement by ${interaction.user.username} • ${this.client.config.embed.footer}`,
				iconURL: interaction.user.displayAvatarURL({ size: 1024 }),
			})
			.setTimestamp();

		const roleMention = role ? `<@&${role.id}>` : '';
		await channel.send({ 
			content: roleMention, embeds: [embed] 
		});

        await interaction.reply({
			content: `Announcement successfully sent to ${channel}.`,
			ephemeral: true,
        });

	}
}