import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Creates a button that triggers a slash command when clicked
 */
export function createCommandButton(
	customId: string,
	label: string,
	commandName: string,
	style: ButtonStyle = ButtonStyle.Primary,
): { row: ActionRowBuilder<ButtonBuilder>; commandName: string } {
	const button = new ButtonBuilder()
		.setCustomId(`cmd_${commandName}_${customId}`)
		.setLabel(label)
		.setStyle(style);

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

	return { row, commandName };
}

/**
 * Parse button custom ID to get command name
 */
export function getCommandFromButton(customId: string): string | null {
	if (!customId.startsWith('cmd_')) return null;
	const parts = customId.split('_');
	return parts[1] || null;
}