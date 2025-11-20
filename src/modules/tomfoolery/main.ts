export class Tomfoolery {
	client: any;
	features: string[];
	constructor(client: any) {
		this.client = client;
		this.features = this.client.config.tomfoolery.features;
	}

	async trollResponse(message: any) {
		const trollResponseConfig = this.client.config.tomfoolery.trollResponse;
		if (!trollResponseConfig?.enabled) return;

		// Check if channel or user is disabled
		if (trollResponseConfig.disabled.channels.includes(message.channel.id)) return;
		if (trollResponseConfig.disabled.users.includes(message.author.id)) return;

		const messageContent = message.content.toLowerCase();
		let config: any = null;
		let deleteTime = 500;

		// Check keyword triggers first
		for (const [keyword, triggerConfig] of Object.entries(trollResponseConfig.keywords)) {
			if (messageContent.includes(keyword.toLowerCase())) {
				config = triggerConfig;
				deleteTime = (triggerConfig as any).deleteTime;
				break;
			}
		}

		// If no keyword trigger, use chance-based response
		if (!config) {
			const messageUserId = message.author.id;
			const memberConfig = trollResponseConfig.members[messageUserId];

			// Use member config if exists, otherwise use default
			const baseConfig = memberConfig ?? trollResponseConfig.default;
			const chance = Math.random();
			if (chance > baseConfig.chance) return;

			config = baseConfig;
			deleteTime = baseConfig.deleteTime;
		}

		// Get responses
		if (config.responses.length === 0) return;

		const response = config.responses[Math.floor(Math.random() * config.responses.length)];

		const messageReply = await message.reply({
			content: response,
		});
		
		// Only delete if deleteTime is not -1
		if (deleteTime !== -1) {
			setTimeout(() => {
				void messageReply.delete().catch(() => { /* ignore */ });
			}, deleteTime);
		}
	}
}