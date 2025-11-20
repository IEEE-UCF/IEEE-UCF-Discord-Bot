import { Event } from '../structs/Event';
import type { Message } from 'discord.js';

export class MessageCreateEvent extends Event {
	constructor(client: any) {
		super(client, {
			name: 'messageCreate',
			once: false,
		});
	}

	async run(message: Message): Promise<void> {
		// Ignore messages from bots
		if (message.author?.bot) return;
		// console.log(this);
		await this.client.tomfoolery.trollResponse(message);
	}
}