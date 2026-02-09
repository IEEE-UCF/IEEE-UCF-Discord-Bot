import { GatewayIntentBits, Partials, ActivityType } from 'discord.js';

interface Config {
	token: string;
	servers: {
		main: {
			id: string;
			channels: {
				calendar: string;
				reminders: string;
			};
			eventReminders: {
				enabled: boolean;
				reminderMinutes: number;
				roleToPing: string;
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

	custom: Record<string, any>;
}

const config: Config = {
	token: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',

	servers: {
		main: {
			id: '',
			channels: {
				calendar: '',
				reminders: '',
			},
			eventReminders: {
				enabled: false,
				reminderMinutes: 0,
				roleToPing: '',
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
		footer: 'IEEE@UCF Discord Bot',
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

	custom: {},
};

export default config;