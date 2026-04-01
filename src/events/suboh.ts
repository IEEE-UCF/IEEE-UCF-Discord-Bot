import { Message } from 'discord.js';
import { Event } from '../structs/Event.ts';

export class suboh extends Event {
	constructor(client: any) {
		super(client, {
			name: 'messageCreate',
		});
	}

	async run(message: Message) {

		// suboh (case insensitive)
		const content = message.content.toLowerCase();
		if (!content.includes('suboh')) return;

		// suboh
		const gifUrl = 'https://cdn.discordapp.com/attachments/818545502605541426/1372436427346018375/lv_0_20240930154536.gif';

		await message.reply({
			content: gifUrl,
		});

	}
}