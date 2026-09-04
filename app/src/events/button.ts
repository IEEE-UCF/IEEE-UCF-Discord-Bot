import { type Interaction } from 'discord.js';
import { Event } from '../structs/Event.ts';
import { getCommandFromButton } from '../modules/helpers/buttons.ts';

export class button extends Event {
	constructor(client: any) {
		super(client, {
			name: 'interactionCreate',
		});
	}

	async run(interaction: Interaction) {
		if (!interaction.isButton()) return;

		const commandName = getCommandFromButton(interaction.customId);
		if (!commandName) return;

		// Get the command
		const command = this.client.commands.get(commandName);
		if (!command) {
			await interaction.reply({
				content: `Command \`/${commandName}\` not found.`,
				flags: 64, // ephemeral
			});
			return;
		}

		try {
			// Defer the button response first
			await interaction.deferReply({ flags: 64 }); // ephemeral

			// Create a fake interaction that uses editReply instead of reply
			const fakeInteraction = {
				...interaction,
				isChatInputCommand: () => true,
				commandName: commandName,
				options: {
					getString: () => null,
					getInteger: () => null,
					getBoolean: () => null,
					getUser: () => null,
					getMember: () => null,
					getRole: () => null,
					getChannel: () => null,
					getMentionable: () => null,
					getAttachment: () => null,
					getNumber: () => null,
					getSubcommand: () => null,
					getSubcommandGroup: () => null,
					data: [],
				},
				// Override reply to use editReply since we already deferred
				reply: async (options: any) => {
					return await interaction.editReply(options);
				},
			};

			// Run the command with the fake interaction
			await command.run(fakeInteraction as any);
		} catch (error) {
			console.error(`Error executing command ${commandName} from button:`, error);

			const errorMessage = {
				content: 'There was an error executing this command.',
			};

			if (interaction.deferred) {
				await interaction.editReply(errorMessage);
			} else {
				await interaction.reply({ ...errorMessage, flags: 64 });
			}
		}
	}
}