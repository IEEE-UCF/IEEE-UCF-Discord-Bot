import colors from 'colors';
import type { Client, Guild, User } from 'discord.js';

interface RateLimitInfo {
	method: string;
	path: string;
}

class Logger {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	log(message: string): boolean {
		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)} ${message}`);
		return true;
	}

	success(message: string): boolean {
		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgGreen.white(' ✓ ')} ${message}`);
		return true;
	}

	shardLogin(message: string): void {
		console.log(`${colors.bgBlack(`\n ${new Date().toLocaleTimeString()} `)}${colors.bgGreen.white(' ✓ ')} ${message}`);
	}

	debug(info: string): void {
		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgYellow.white(' ! ')} ${info}`);
	}

	warn(info: string): void {
		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgYellow.white(' ⚠ ')} ${info}`);
	}

	fail(message: string): boolean {
		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgRed.white(' ✘ ')} ${message}`);
		return true;
	}

	startup(message: string): boolean {
		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgGreen.white(' ✅ ')} ${message}`);
		return true;
	}

	shutdown(message: string): boolean {
		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgRed.white(' 🔴 ')} ${message}`);
		return true;
	}

	rateLimit(rateLimitInfo: RateLimitInfo): void {
		const username = this.client.user?.username ?? 'Unknown';
		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgRed.white(' ! ')} [SpamWarning] ${username} is being ratelimited on method ${colors.underline(rateLimitInfo.method)} ➜ ${colors.blue(rateLimitInfo.path)}`);
	}

	command(user: string | User, command: string, guild: string | Guild): void {
		const userName = typeof user === 'string' ? user : user.username;
		const guildName = typeof guild === 'string' ? guild : guild.name;

		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgBlue.white(' - ')} Command ran by ${colors.underline(userName)} in ${colors.underline(guildName)} ➜  ${colors.blue(command)}`);
	}

	guildJoin(guild: string | Guild, members: number, channels: number): void {
		const guildName = typeof guild === 'string' ? guild : guild.name;

		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgBlue.white(' - ')} Added to ${colors.underline(guildName)} ${colors.blue(`(${colors.underline(members.toString())} members and ${colors.underline(channels.toString())} channels)`)}`);
	}

	guildLeave(guild: string | Guild, members: number, channels: number): void {
		const guildName = typeof guild === 'string' ? guild : guild.name;

		console.log(`${colors.bgBlack(` ${new Date().toLocaleTimeString()} `)}${colors.bgBlue.white(' - ')} Removed from ${colors.underline(guildName)} ${colors.blue(`(${colors.underline(members.toString())} members and ${colors.underline(channels.toString())} channels)`)}`);
	}
}

export default Logger;