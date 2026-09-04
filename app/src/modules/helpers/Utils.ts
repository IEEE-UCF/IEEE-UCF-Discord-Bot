import { Client, User, GuildMember, Guild, OAuth2Scopes } from 'discord.js';
import type { PermissionResolvable } from 'discord.js';

export enum PermissionLevel {
	GUEST = 0, // Not in database (unregistered Discord users)
	MEMBER = 1, // Registered members
	COMMITTEE_MEMBER = 2, // Member of at least one committee
	PROJECT_LEAD = 3, // Leads at least one project
	COMMITTEE_CHAIR = 4, // Chairs at least one committee
	OFFICER = 5, // Any officer role
	EXECUTIVE = 6, // Executive roles only (chair, vice chair, secretary, treasurer)
	ADMINISTRATOR = 7 // Full admin access (includes config owners)
}

export const PermissionLevelNames: Record<PermissionLevel, string> = {
	[PermissionLevel.GUEST]: 'Guest',
	[PermissionLevel.MEMBER]: 'Member',
	[PermissionLevel.COMMITTEE_MEMBER]: 'Committee Member',
	[PermissionLevel.PROJECT_LEAD]: 'Project Lead',
	[PermissionLevel.COMMITTEE_CHAIR]: 'Committee Chair',
	[PermissionLevel.OFFICER]: 'Officer',
	[PermissionLevel.EXECUTIVE]: 'Executive',
	[PermissionLevel.ADMINISTRATOR]: 'Administrator',
};

export class Utils {
	private client: Client;

	constructor(client: Client) {
		if (!client) {
			throw new TypeError('Discord client must be valid.');
		}
		this.client = client;
	}

	/**
	 * Fetch a Discord user by mention or ID
	 */
	async fetchUser(key: string): Promise<User | undefined> {
		if (!key || typeof key !== 'string') return;

		// Handle mentions like <@123456789> or <@!123456789>
		const mentionMatch = key.match(/^<@!?(\d+)>$/);
		if (mentionMatch?.[1]) {
			const userId = mentionMatch[1];
			const user = await this.client.users.fetch(userId).catch(() => undefined);
			if (user) return user;
		}

		// Try direct ID fetch
		return this.client.users.fetch(key).catch(() => undefined);
	}

	/**
	 * Fetch a guild member by mention or ID
	 */
	async fetchMember(key: string, guild: Guild): Promise<GuildMember | undefined> {
		if (!key || typeof key !== 'string') return;

		// Handle mentions like <@123456789> or <@!123456789>
		const mentionMatch = key.match(/^<@!?(\d+)>$/);
		if (mentionMatch?.[1]) {
			const userId = mentionMatch[1];
			const member = await guild.members.fetch(userId).catch(() => undefined);
			if (member) return member;
		}

		// Try direct ID fetch
		return guild.members.fetch(key).catch(() => undefined);
	}

	/**
	 * Discord formatting utilities
	 */
	codeBlock(language: string, text?: string): string {
		return `\`\`\`${language}\n${text ?? String.fromCharCode(8203)}\`\`\``;
	}

	inlineCode(text: string): string {
		return `\`${text}\``;
	}

	quote(text: string): string {
		return `> ${text}`;
	}

	clean(text: string, token: string): string {
		return text.replace(new RegExp(token, 'g'), '███████████████████████');
	}

	/**
	 * String manipulation utilities
	 */
	toTitleCase(str: string): string {
		return str.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]\S*/g, (txt) =>
			Utils.titleCaseVariants[txt] ?? txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
		);
	}

	toSnakeCase(str: string): string {
		return str.split(/\s/g).join('_');
	}

	trimString(str: string, max: number = 30): string {
		if (str.length > max) return `${str.slice(0, max)}...`;
		return str;
	}

	toggleCase(str: string): string {
		if (str.length !== 1) return str;
		if (str.match(/^[A-z]$/)) {
			if (str.toUpperCase() === str) {
				return str.toLowerCase();
			} else {
				return str.toUpperCase();
			}
		}
		return str;
	}

	/**
	 * Random utilities
	 */
	random(n1: number, n2: number): number {
		return Math.floor(Math.random() * (n2 - n1)) + n1;
	}

	randomArray<T>(array: T[]): T {
		if (array.length === 0) throw new Error('Array cannot be empty');
		return array[this.random(0, array.length)]!;
	}

	shuffleArray<T>(arr: T[]): T[] {
		return arr.reduce((newArr, _, i) => {
			const rand = i + (Math.floor(Math.random() * (newArr.length - i)));
			[newArr[rand], newArr[i]] = [newArr[i]!, newArr[rand]!];
			return newArr;
		}, [...arr]);
	}

	/**
	 * Type checking utilities
	 */
	isUnicodeEmoji(str: string): boolean {
		return /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c([\ud000-\udfff]){1,2}|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])$/.test(str);
	}

	isFunction(input: any): input is (...args: any[]) => any {
		return typeof input === 'function';
	}

	isObject(input: any): input is object {
		return input?.constructor === Object;
	}

	isArray(input: any): input is any[] {
		return Array.isArray(input);
	}

	isThenable(input: any): input is Promise<any> {
		if (!input) return false;
		return (input instanceof Promise) ||
			(input !== Promise.prototype && this.isFunction(input.then) && this.isFunction(input.catch));
	}

	objectIsEmpty(obj: object): boolean {
		return Object.entries(obj).length === 0;
	}

	/**
	 * ID and encoding utilities
	 */
	generateID(): string {
		return Date.now().toString(35).toUpperCase();
	}

	base32(int: number): string {
		const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

		if (int === 0) {
			return alphabet[0]!;
		}

		let res = '';
		while (int > 0) {
			res = alphabet[int % 32]! + res;
			int = Math.floor(int / 32);
		}
		return res;
	}

	/**
	 * Async utilities
	 */
	sleep(seconds: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, seconds * 1000);
		});
	}

	/**
	 * Date formatting
	 */
	formatDate(date: Date): string {
		const formats = {
			days: {
				0: 'Sunday',
				1: 'Monday',
				2: 'Tuesday',
				3: 'Wednesday',
				4: 'Thursday',
				5: 'Friday',
				6: 'Saturday',
			} as Record<number, string>,
			month: {
				0: 'January',
				1: 'February',
				2: 'March',
				3: 'April',
				4: 'May',
				5: 'June',
				6: 'July',
				7: 'August',
				8: 'September',
				9: 'October',
				10: 'November',
				11: 'December',
			} as Record<number, string>,
			date: {
				1: 'st',
				2: 'nd',
				3: 'rd',
				4: 'th',
				5: 'th',
				6: 'th',
				7: 'th',
				8: 'th',
				9: 'th',
				0: 'th',
			} as Record<number, string>,
		};

		const dayOfWeek = formats.days[date.getDay()]!;
		const dayOfMonth = date.getDate().toString();
		const month = formats.month[date.getMonth()]!;
		const lastDigit = parseInt(dayOfMonth.slice(-1));
		const suffix = formats.date[lastDigit]!;

		return `${dayOfWeek} ${dayOfMonth}${suffix} ${month} | ${date.toLocaleTimeString()}`;
	}

	/**
	 * Number formatting with abbreviations
	 */
	formatNumber(num: number | string): string | number {
		let number = typeof num === 'string' ? parseInt(num) : num;

		const decPlaces = Math.pow(10, 1);
		const abbrev = ['k', 'm', 'g', 't', 'p', 'e'];

		for (let i = abbrev.length - 1; i >= 0; i--) {
			const size = Math.pow(10, (i + 1) * 3);

			if (size <= number) {
				number = Math.round((number * decPlaces) / size) / decPlaces;

				if (number === 1000 && i < abbrev.length - 1) {
					number = 1;
					i++;
				}

				return number + abbrev[i]!;
			}
		}

		return number;
	}

	/**
	 * Generate bot invite link
	 */
	generateInvite(permissions?: PermissionResolvable, scopes?: OAuth2Scopes[]): string {
		return this.client.generateInvite({
			permissions: permissions ?? [],
			scopes: scopes ?? [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
		});
	}

	/**
	 * Static lookup for title case variants
	 */
	static readonly titleCaseVariants: Record<string, string> = {
		textchannel: 'TextChannel',
		voicechannel: 'VoiceChannel',
		categorychannel: 'CategoryChannel',
		guildmember: 'GuildMember',
		guildmemberrolemanager: 'GuildMemberRoleManager',
		messagereactionuserreactioncollector: 'MessageReactionUserReactionCollector',
	};
}

export default Utils;