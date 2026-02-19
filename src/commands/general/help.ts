import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class HelpCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'help',
			description: 'Displays a list of useful commands.',
			usage: 'help',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: false,
			cooldown: 5,
		});
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		const embed = this.client.createEmbed()
			.setTitle('Welcome to IEEE UCF!')
			.setAuthor({
				name: this.client.user?.username ?? 'Larry',
				iconURL: this.client.user?.displayAvatarURL({ size: 512 }) ?? undefined,
			})
			.setThumbnail(this.client.user?.displayAvatarURL() ?? null)
			.setFooter({
				text: `Requested by ${interaction.user.username} • ${this.client.config.embed.footer}`,
				iconURL: interaction.user.displayAvatarURL({ size: 1024 }),
			})
			.setTimestamp();

		const categories: string[] = [];
		const commands = Array.from(this.client.commands.values()) as Command[];

		// Collect unique categories
		commands.forEach((command: Command) => {
			if (command.category && !categories.includes(command.category)) {
				// Only show admin category to administrators
				if (command.category === 'admin') {
					const userPermLevel = this.client.getPermissionLevel(interaction.user.id);
					if (userPermLevel < PermissionLevel.ADMINISTRATOR) return;
				}
				categories.push(command.category);
			}
		});

		// Sort categories alphabetically
		categories.sort();

		// Add fields for each category
		categories.forEach((category) => {
			const categoryCommands = commands.filter((cmd: Command) => cmd.category === category);
			const commandList = categoryCommands
				.map((cmd: Command) => `**${cmd.name}** - ${cmd.description}`)
				.join('\n');

			// Capitalize first letter of category
			const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

			embed.addFields({
				name: `${categoryName}`,
				value: commandList || 'No commands',
			});
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