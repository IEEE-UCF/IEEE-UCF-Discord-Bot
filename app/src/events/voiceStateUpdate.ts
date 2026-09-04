import { VoiceState } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { Event } from '../structs/Event.js';
import { guildDisconnectTimers } from '../modules/helpers/voiceTimers.ts';

export default class VoiceStateUpdateEvent extends Event {
	constructor(client: any) {
		super(client, {
			name: 'voiceStateUpdate',
		});
	}

	async run(oldState: VoiceState, newState: VoiceState) {

		if (oldState.channelId === newState.channelId) return; // if nothing happens (nothing every happens) don't do anything

		const guild = newState.guild;
		const connection = getVoiceConnection(guild.id);

		if (!connection) return;

		const botChannel = guild.members.me?.voice.channel;
		if (!botChannel) return;

		const members = botChannel.members.filter(m => !m.user.bot);

		if (members.size === 0) {

			if (guildDisconnectTimers.has(guild.id)) return;

			const timeout = setTimeout(() => {

				const connection = getVoiceConnection(guild.id);
				const botChannel = guild.members.me?.voice.channel;

				if (!connection || !botChannel) {
					guildDisconnectTimers.delete(guild.id);
					return;
				}

				const remaining = botChannel.members.filter(m => !m.user.bot);

				if (remaining.size === 0) {
					connection.destroy();
					console.log(`Left ${botChannel.name} due to inactivity.`); // disconnect if nobody's in call for one minute
				}

				guildDisconnectTimers.delete(guild.id);

			}, 60000);

			guildDisconnectTimers.set(guild.id, timeout);
		} else {
			const timer = guildDisconnectTimers.get(guild.id);
			if (timer) {
				clearTimeout(timer);
				guildDisconnectTimers.delete(guild.id); // if somebody joins reset the timer
			}
		}
	}
}