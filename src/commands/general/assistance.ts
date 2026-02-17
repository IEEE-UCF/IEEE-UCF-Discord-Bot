import { SlashCommandBuilder, ChatInputCommandInteraction, type SlashCommandOptionsOnlyBuilder, TextChannel } from 'discord.js';
import { Command } from '../../structs/Command.js';
import { PermissionLevel } from '../../modules/helpers/Utils.js';

export class assistanceCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'assistance', 
			description: 'Sends an assistance request.', 
			usage: 'assistance <type> <title> <summary>', 
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 0,
		});
	}

	command(): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description)

			.addStringOption(option =>
				option.setName('type')
					.setDescription('The type of assistance needed')
					.setRequired(true)
					.addChoices(
						{ name: 'Administrative', value: 'admin' },
						{ name: 'Website/Software', value: 'software' }
					)
			)

			.addStringOption(option =>
				option.setName('title')
					.setDescription('The title of the assistance request')
					.setRequired(true)
			)

			.addStringOption(option =>
				option.setName('message')
					.setDescription('The summary of what assistance is needed')
					.setRequired(true)
			)
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {

		const channelID = this.client.config.servers.main.channels.assistance;
        const channel = this.client.channels.cache.get(channelID) as TextChannel;

		const type = interaction.options.getString('type', true);
		const roleID = type === 'admin' 
			? this.client.config.servers.main.assistanceRoleAdmin 
			: this.client.config.servers.main.assistanceRoleSoftware;
        const roleMention = roleID ? `<@&${roleID}>` : '';

        const title = interaction.options.getString('title', true);
        const message = interaction.options.getString('message', true);

		const embed = this.client.createEmbed()
			.setTitle(`‼️ ${title} ‼️`)
			.setDescription(message)
			.setFooter({
				text: `Assistance requested by ${interaction.user.username} • ${this.client.config.embed.footer}`,
				iconURL: interaction.user.displayAvatarURL({ size: 1024 }),
			})
			.setTimestamp();

		await channel.send({ 
			content: roleMention, 
            embeds: [embed] 
		});

        await interaction.reply({
			content: `Assistance request sent successfully.`,
			ephemeral: true,
        });

	}
}