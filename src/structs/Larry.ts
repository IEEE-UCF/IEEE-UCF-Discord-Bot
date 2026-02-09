import { Client, Collection, REST, Routes, EmbedBuilder } from 'discord.js';
import { glob } from 'glob';
import { pathToFileURL } from 'url';
import path from 'path';
import { eq } from 'drizzle-orm';
import config from '../config.ts';
import logger from '../modules/helpers/Logger.ts';
import { Database } from '../modules/database/Database.ts';
import { Calendar } from '../modules/calendar/main.ts';
import { Utils, PermissionLevel } from '../modules/helpers/Utils.ts';
import * as schema from '../modules/database/Schema.ts';
import { Command } from './Command.ts';
import { Event } from './Event.ts';
import { eventsAutomation } from '../modules/calendar/eventsAutomation.ts';

interface CachedPermission {
	level: PermissionLevel;
	expiresAt: number;
}

class Larry extends Client {
	public config: any;
	public commands: Collection<string, Command>;
	public events: Collection<string, Event>;
	public logger: any;
	public database: Database;
	public calendar: any;
	public eventsAutomation: eventsAutomation;
	public utils: Utils;
	private permissionCache: Collection<string, CachedPermission>;
	private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

	constructor() {
		super({
			allowedMentions: {
				parse: ['users'],
			},
			intents: config.intents,
			partials: config.partials,
		});

		this.config = config;
		this.logger = new logger(this);
		this.database = new Database(this, this.config.postgres);
		this.calendar = new Calendar(this, this.config.calendarURLs);
		this.eventsAutomation = new eventsAutomation(this);
		this.utils = new Utils(this);
		this.permissionCache = new Collection();

		this.commands = new Collection();
		this.events = new Collection();
	}

	/**
	 * Create embed with default styling from config
	 */
	createEmbed(): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(this.config.embed.color)
			.setFooter({ text: this.config.embed.footer })
			.setTimestamp();
	}

	/**
	 * Get client ID from token
	 */
	getClientId(): string {
		// Discord bot tokens are base64 encoded with the client ID at the beginning
		const tokenParts = this.config.token.split('.');
		if (tokenParts.length >= 1) {
			return atob(tokenParts[0]!);
		}
		throw new Error('Invalid token format');
	}

	/**
	 * Get a user's permission level (with caching)
	 */
	async getPermissionLevel(discordId: string): Promise<PermissionLevel> {
		// Check cache first
		const cached = this.permissionCache.get(discordId);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.level;
		}

		// Fetch from database
		const level = await this.calculatePermissionLevel(discordId);

		// Cache the result
		this.permissionCache.set(discordId, {
			level,
			expiresAt: Date.now() + this.CACHE_TTL,
		});

		return level;
	}

	/**
	 * Calculate permission level based on database data and config
	 */
	private async calculatePermissionLevel(discordId: string): Promise<PermissionLevel> {
		try {
			// Check if user is in config owners (ADMINISTRATOR)
			const isConfigOwner = this.config.owners.some((owner: any) => owner.id === discordId);
			if (isConfigOwner) {
				return PermissionLevel.ADMINISTRATOR;
			}

			// Get member data with relations
			const member = await this.database.getDB().query.Members.findFirst({
				where: eq(schema.Members.discordID, discordId),
				with: {
					committeeMembers: {
						with: {
							committee: true,
						},
					},
					projectMembers: true,
				},
			});

			// Not in database = GUEST
			if (!member) {
				return PermissionLevel.GUEST;
			}

			// Administrator has highest access
			if (member.administrator) {
				return PermissionLevel.ADMINISTRATOR;
			}

			// Executive roles (specific officer roles)
			if (member.officerStatus && member.officerRole) {
				const executiveRoles = ['executive_chair', 'executive_vice_chair', 'executive_secretary', 'executive_treasurer'];
				if (executiveRoles.includes(member.officerRole)) {
					return PermissionLevel.EXECUTIVE;
				}
			}

			// Any officer status
			if (member.officerStatus) {
				return PermissionLevel.OFFICER;
			}

			// Committee chair (chairs at least one committee)
			const isCommitteeChair = member.committeeMembers?.some((cm: any) => cm.isChair) ?? false;
			if (isCommitteeChair) {
				return PermissionLevel.COMMITTEE_CHAIR;
			}

			// Project lead (leads at least one project)
			const isProjectLead = member.projectMembers?.some((pm: any) => pm.isLead) ?? false;
			if (isProjectLead) {
				return PermissionLevel.PROJECT_LEAD;
			}

			// Committee member (member of at least one committee)
			const isCommitteeMember = (member.committeeMembers?.length ?? 0) > 0;
			if (isCommitteeMember) {
				return PermissionLevel.COMMITTEE_MEMBER;
			}

			// Default registered member
			return PermissionLevel.MEMBER;
		} catch (error) {
			console.error('Error calculating permission level:', error);
			return PermissionLevel.GUEST;
		}
	}

	/**
	 * Check if user has required permission level
	 */
	async hasPermission(discordId: string, requiredLevel: PermissionLevel): Promise<boolean> {
		const userLevel = await this.getPermissionLevel(discordId);
		return userLevel >= requiredLevel;
	}

	/**
	 * Refresh cache for a specific user
	 */
	refreshUserPermissions(discordId: string): Promise<PermissionLevel> {
		this.permissionCache.delete(discordId);
		return this.getPermissionLevel(discordId);
	}

	/**
	 * Clear entire permission cache
	 */
	clearPermissionCache(): void {
		this.permissionCache.clear();
	}

	/**
	 * Clean expired cache entries
	 */
	cleanExpiredCache(): void {
		const now = Date.now();
		this.permissionCache.sweep(cached => cached.expiresAt <= now);
	}

	/**
	 * Get the directory of the main module
	 */
	get directory(): string {
		return path.dirname(new URL(import.meta.url).pathname);
	}

	/**
	 * Get files matching a pattern
	 */
	getFiles(dir: string, ext: string): Promise<string[]> {
		const pattern = path.join(this.directory, '..', dir, '**', `*${ext}`);
		return glob(pattern);
	}

	/**
	 * Load slash commands
	 */
	async loadCommands(): Promise<void> {
		try {
			const commandFiles = await this.getFiles('commands', '.ts');
			const slashCommands: any[] = [];

			for (const filePath of commandFiles) {
				try {
					const fileUrl = pathToFileURL(filePath).href;
					const commandModule = await import(fileUrl);

					// Get the command class (should be the default export or a named export)
					const CommandClass = commandModule.default ?? Object.values(commandModule)[0];

					if (!CommandClass) {
						this.logger.fail(`No command class found in ${path.basename(filePath)}`);
						continue;
					}

					const command = new (CommandClass as any)(this);

					if (!(command instanceof Command)) {
						this.logger.fail(`${path.basename(filePath)} does not export a Command`);
						continue;
					}

					// Validate command
					if (!command.name || !command.description) {
						this.logger.fail(`Command ${path.basename(filePath)} is missing name or description`);
						continue;
					}

					this.commands.set(command.name, command);
					slashCommands.push(command.command().toJSON());

					if (this.config.debug) {
						this.logger.log(`Loaded command: ${command.name}`);
					}
				} catch (error) {
					this.logger.fail(`Failed to load command ${path.basename(filePath)}: ${error}`);
				}
			}

			// Register slash commands with Discord
			await this.registerSlashCommands(slashCommands);
			this.logger.success(`Loaded ${this.commands.size} slash commands`);
		} catch (error) {
			this.logger.fail(`Error loading commands: ${error}`);
		}
	}

	/**
	 * Register slash commands with Discord
	 */
	private async registerSlashCommands(commands: any[]): Promise<void> {
		try {
			const rest = new REST({ version: '10' }).setToken(this.config.token);

			if (this.config.debug) {
				this.logger.log('Started refreshing application (/) commands.');
			}

			// Register commands w/ Discord
			await rest.put(
				Routes.applicationCommands(this.getClientId()),
				{ body: commands },
			);
			console.log('Global commands registered');

			if (this.config.debug) {
				this.logger.success('Successfully reloaded application (/) commands.');
			}
		} catch (error) {
			this.logger.fail(`Failed to register slash commands: ${error}`);
		}
	}

	/**
	 * Load events
	 */
	async loadEvents(): Promise<void> {
		try {
			const eventFiles = await this.getFiles('events', '.ts');

			for (const filePath of eventFiles) {
				try {
					const fileUrl = pathToFileURL(filePath).href;
					const eventModule = await import(fileUrl);

					// Get the event class
					const EventClass = eventModule.default ?? Object.values(eventModule)[0];

					if (!EventClass) {
						this.logger.fail(`No event class found in ${path.basename(filePath)}`);
						continue;
					}

					const event = new (EventClass as any)(this);

					if (!(event instanceof Event)) {
						this.logger.fail(`${path.basename(filePath)} does not export an Event`);
						continue;
					}

					this.events.set(event.name, event);

					// Register event listener
					if (event.once) {
						this.once(event.name, (...args) => event.run(...args));
					} else {
						this.on(event.name, (...args) => event.run(...args));
					}

					if (this.config.debug) {
						this.logger.log(`Loaded event: ${event.name}`);
					}
				} catch (error) {
					this.logger.fail(`Failed to load event ${path.basename(filePath)}: ${error}`);
				}
			}

			this.logger.success(`Loaded ${this.events.size} events`);
		} catch (error) {
			this.logger.fail(`Error loading events: ${error}`);
		}
	}

	/**
	 * Initialize the bot
	 */
	async init(): Promise<void> {
		console.clear();
		if (this.config.debug) this.logger.success(`Process started - Runtime ${process.version}`);

		// Connect to database
		// await this.database.loadDatabase();

		// Load commands and events
		await this.loadCommands();
		await this.loadEvents();

		// Login to Discord
		await this.login(this.config.token)
			.then(() => {
				if (this.config.debug) this.logger.success('Client logged in: ' + this.user?.tag);
			})

			.catch((error: Error) => {
				this.logger.fail(`Client failed to login: ${error}`);
				process.exit(1);
			});
	}

	/**
	 * Reload commands
	 */
	async reloadCommands(): Promise<void> {
		// Clear existing commands
		this.commands.clear();

		// Reload commands
		await this.loadCommands();
	}

	/**
	 * Reload events
	 */
	async reloadEvents(): Promise<void> {
		// Remove existing listeners
		this.events.forEach(event => {
			this.removeAllListeners(event.name);
		});

		// Clear events collection
		this.events.clear();

		// Reload events
		await this.loadEvents();
	}

	override async destroy(): Promise<void> {

		this.eventsAutomation.stop();
		await this.eventsAutomation.cleanupOnShutdown();
		//await this.database.closeDatabase();
		await super.destroy();
		this.logger.shutdown('Client destroyed and database connection closed.');
	}
}

export default Larry;