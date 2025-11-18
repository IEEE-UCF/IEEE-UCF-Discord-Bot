import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.js';
import { PermissionLevel } from '../../modules/helpers/Utils.js';

export class HelpCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'Help',
			description: 'Displays a list useful commands and how to use them',
			usage: 'help',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 5,
		});
	}

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
            const embed = this.client.createEmbed()
                .setThumbnail(this.client.user?.displayAvatarURL() ?? null)
                .setTitle(`${this.client.user?.username ?? 'Larry'} Help`)
                .setDescription([
                    `hello twin...`,
                ].join('\n'))
                .setFooter({
                    text: `Requested by ${interaction.user.username} • ${this.client.config.embed.footer}`,
                    iconURL: interaction.user.displayAvatarURL({ size: 1024 }),
                });

            await interaction.reply({
                embeds: [embed],
            });
	}

    command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}
}