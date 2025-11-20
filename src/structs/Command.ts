import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	Collection,
	EmbedBuilder,
} from 'discord.js';
import type { PermissionResolvable } from 'discord.js';
import { PermissionLevel } from '../modules/helpers/Utils.ts';

export interface CommandOptions {
	name: string;
	description: string;
	category?: string;
	usage?: string;
	enabled?: boolean;
	guildOnly?: boolean;
	cooldown?: number; // in seconds
	permissionLevel?: PermissionLevel;
	botPerms?: PermissionResolvable;
	options?: any[]; // For slash command options
}

export abstract class Command {
	public client: any; // Larry client instance
	public name: string;
	public description: string;
	public category: string;
	public usage: string;
	public enabled: boolean;
	public guildOnly: boolean;
	public cooldown: number;
	public permissionLevel: PermissionLevel;
	public botPerms: PermissionResolvable;
	public options: any[];

	private cooldowns: Collection<string, number>;

	constructor(client: any, options: CommandOptions) {
		this.client = client;
		this.name = options.name;
		this.description = options.description;
		this.category = options.category ?? 'general';
		this.usage = options.usage ?? this.name;
		this.enabled = options.enabled ?? true;
		this.guildOnly = options.guildOnly ?? false;
		this.cooldown = (options.cooldown ?? 2) * 1000; // Convert to milliseconds
		this.permissionLevel = options.permissionLevel ?? PermissionLevel.MEMBER;
		this.botPerms = options.botPerms ?? [];
		this.options = options.options ?? [];

		this.cooldowns = new Collection();
	}

	/**
	 * Execute the command
	 */
	abstract run(interaction: ChatInputCommandInteraction): Promise<void>;

	/**
	 * Build the slash command
	 */
	abstract command(): SlashCommandBuilder;

	/**
	 * Check if user is on cooldown
	 */
	isOnCooldown(userId: string): boolean {
		if (!this.cooldown) return false;

		const cooldownEnd = this.cooldowns.get(userId);
		if (!cooldownEnd) return false;

		const timeLeft = cooldownEnd - Date.now();
		return timeLeft > 0;
	}

	/**
	 * Set cooldown for user
	 */
	setCooldown(userId: string): void {
		if (!this.cooldown) return;
		this.cooldowns.set(userId, Date.now() + this.cooldown);
	}

	/**
	 * Get cooldown time left for user
	 */
	getCooldownTime(userId: string): number {
		const cooldownEnd = this.cooldowns.get(userId);
		if (!cooldownEnd) return 0;

		const timeLeft = cooldownEnd - Date.now();
		return Math.max(0, Math.ceil(timeLeft / 1000));
	}

	/**
	 * Check if user has permission to use this command
	 */
	async hasPermission(userId: string): Promise<boolean> {
		try {
			return await this.client.hasPermission(userId, this.permissionLevel);
		} catch (error) {
			console.error(`Error checking permission for command ${this.name}:`, error);
			return false;
		}
	}

	/**
	 * Get cooldown embed message
	 */
	getCooldownEmbed(timeLeft: number): EmbedBuilder {
		return this.client.createEmbed()
			.setTitle('⏰ Command on Cooldown')
			.setDescription(`You can use this command again in **${timeLeft}** ${timeLeft === 1 ? 'second' : 'seconds'}.`);
	}

	/**
	 * Get permission error embed
	 */
	getPermissionEmbed(requiredLevel: PermissionLevel): EmbedBuilder {
		return this.client.createEmbed()
			.setTitle('🔒 Insufficient Permissions')
			.setDescription(`You need **${PermissionLevel[requiredLevel]}** permission level to use this command.`);
	}

	/**
	 * Get error embed
	 */
	getErrorEmbed(error: string): EmbedBuilder {
		return this.client.createEmbed()
			.setTitle('❌ Error')
			.setDescription(error);
	}

	/**
	 * Clean expired cooldowns
	 */
	cleanCooldowns(): void {
		const now = Date.now();
		this.cooldowns.sweep(endTime => endTime <= now);
	}
}