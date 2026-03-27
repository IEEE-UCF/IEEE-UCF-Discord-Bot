import { Message } from 'discord.js';
import { Event } from '../structs/Event.ts';

export class guha extends Event {
    constructor(client: any) {
        super(client, {
            name: 'messageCreate',
        });
    }

    async run(message: Message) {

        // guha (case insensitive)
        const content = message.content.toLowerCase();
        if (!content.includes('guha')) return;

        // guha
        const gifUrl = 'https://media.discordapp.net/attachments/851492257373880343/1288247500955713626/caption.gif?ex=69c6f37a&is=69c5a1fa&hm=bad3251bd450da0f0df9234f0a1c3dcf91b74404535976a512c0b56b7cf663c7&';

        await message.reply({
            content: gifUrl,
        });

    }
}