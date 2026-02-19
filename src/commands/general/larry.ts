import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';

export class LarryCommand extends Command {
    constructor(client: any) {
        super(client, {
            name: 'larry',
            description: 'Displays a gif of Larry.',
            usage: 'larry',
            category: 'general',
            permissionLevel: PermissionLevel.GUEST,
            guildOnly: false,
            cooldown: 5,
        });
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        const gifUrl =
            'https://tenor.com/view/larry-larry-cat-chat-larry-meme-chat-meme-cat-gif-10061556685042597078';

        await interaction.reply(gifUrl);
    }

    command(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }
}
