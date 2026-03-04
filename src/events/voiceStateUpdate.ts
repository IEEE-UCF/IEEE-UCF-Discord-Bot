import { VoiceState } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { Event } from '../structs/Event.js';

export const disconnectTimers = new Map<string, NodeJS.Timeout>();

export class voiceStateUpdateEvent extends Event {
	constructor(client: any) {
		super(client, {
			name: 'voiceStateUpdate',
		});
	}

	async run(oldState: VoiceState, newState: VoiceState) {
        // only care about channel join/leave/move
		if (oldState.channelId === newState.channelId) {
            return;
        }

        const guild = newState.guild;
        // checks if bot has a voice connection with *discordjs voice library*
		const connection = getVoiceConnection(guild.id);
		if (!connection) {
            return;
        }

        // ensures bot is actively in a voice channel with *discord's* guild state , the voice library can sometimes be out-of-sync temporarily 
		const bot = guild.members.me;
		if (!bot?.voice.channel) {
            return;
        }

        // count non-bot members
        const voiceChannel = bot.voice.channel;
		const members = voiceChannel.members.filter(
			member => !member.user.bot
		);

		// start disconnect timer if vc is empty 
        if (members.size === 0) {
			if (disconnectTimers.has(guild.id)) {
				return;
			}

			const timeout = setTimeout(() => {

				const connection = getVoiceConnection(guild.id);
				const botChannel = guild.members.me?.voice.channel;

				// clean up if already disconnected
				if (!connection || !botChannel) {
					disconnectTimers.delete(guild.id);
					return;
				}

				const remaining = botChannel.members.filter(
					member => !member.user.bot
				);

				// double-check if voice channel is still empty
				if (remaining.size === 0) {
					connection.destroy();
				}

				disconnectTimers.delete(guild.id);

			}, 150000); // 2.5 min timer

			disconnectTimers.set(guild.id, timeout);
        }
		// cancel current timer if a non-bot member joins the voice channel
		else {
			const existing = disconnectTimers.get(guild.id);
			if (existing) {
				clearTimeout(existing);
				disconnectTimers.delete(guild.id);
			}
		}
	}
}