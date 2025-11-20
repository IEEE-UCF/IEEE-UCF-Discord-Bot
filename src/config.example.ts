import { GatewayIntentBits, Partials, ActivityType } from 'discord.js';

interface Config {
	token: string;
	servers: {
		main: {
			id: string;
			channels: {
				calendar: string;
			};
		};
		dev: {
			id: string;
			channels: {
				calendar: string;
				logs: string;
			};
		};
	};
	embed: {
		color: string;
		footer: string;
	};
	postgres: string;
	calendarURLs?: string[];
	owners: {
		id: string;
		name: string;
	}[];
	status: {
		name: string;
		type: ActivityType;
	};
	debug: boolean;
	intents: GatewayIntentBits[];
	partials: Partials[];
	tomfoolery: {
		trollResponse: {
			enabled: boolean;
			default: {
				responses: string[];
				chance: number;
				deleteTime: number;
			};
			members: Record<string, {
				responses: string[];
				chance: number;
				deleteTime: number;
			}>;
			keywords: Record<string, {
				responses: string[];
				deleteTime: number;
			}>;
			disabled: {
				channels: string[];
				users: string[];
			};
		};
	};
	custom: Record<string, any>;
}

const config: Config = {
	token: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',

	servers: {
		main: {
			id: '',
			channels: {
				calendar: '',
			},
		},
		dev: {
			id: '',
			channels: {
				calendar: '',
				logs: '',
			},
		},
	},

	embed: {
		color: '#FFD61A',
		footer: 'Larry | IEEE@UCF Software Committee',
	},

	postgres: '',

	calendarURLs: [],

	owners: [
		{
			id: '',
			name: '',
		},
	],

	status: {
		name: 'you',
		type: ActivityType.Watching,
	},

	debug: false,

	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
	],

	partials: [
		Partials.Message,
		Partials.Channel,
		Partials.Reaction,
		Partials.GuildMember,
		Partials.User,
		Partials.GuildScheduledEvent,
		Partials.ThreadMember,
		Partials.SoundboardSound,
	],

	tomfoolery: {
		trollResponse: {
			enabled: false,
			default: {
				responses: [
					'https://tenor.com/view/speech-bubble-speech-dog-meme-gif-25299613',
				],
				chance: 0.1,
				deleteTime: 500,
			},
			members: {
				// 'MEMBER_ID_HERE': {
				// 	responses: ['no way', 'stop it', 'https://example.com/gif1.gif'],
				// 	chance: 0.1,
				// 	deleteTime: 500,
				// },
			},
			keywords: {
				// keyword: {
				// 	responses: ['triggered!', 'https://example.com/gif.gif'],
				// 	deleteTime: 1000,
				// },
			},
			disabled: {
				channels: [],
				users: [],
			},
		},
	},

	custom: {},
};

export default config;