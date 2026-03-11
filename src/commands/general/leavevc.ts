import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';
import { getVoiceConnection } from '@discordjs/voice';
import { guildDisconnectTimers } from '../../modules/helpers/voiceTimers.ts';

export class LeaveCommand extends Command {
	constructor(client: any) {
		super(client, {
			name: 'leave',
			description: 'Leaves your current voice channel.',
			usage: 'leave',
			category: 'general',
			permissionLevel: PermissionLevel.GUEST,
			guildOnly: true,
			cooldown: 3,
		});
	}

	async run(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ flags: 64 });

		const guild = interaction.guild;
		if (!guild) {
			await interaction.editReply({
				content: '❌ Command can only be used in a server.'
			});
			return;
		}

		const member = interaction.member as GuildMember;
		const channel = member.voice.channel;

		if (!channel) {
			await interaction.editReply({
				content: '❌ You must be in a voice channel.'
			});
			return;
		}

		const curConnection = getVoiceConnection(interaction.guildId!);

		if (!curConnection) {
			await interaction.editReply({
				content: '❌ I am not currently in a voice channel.'
			});
			return;
		}

		if (curConnection.joinConfig.channelId !== channel.id) {
			await interaction.editReply({
				content: '❌ Must be in the same voice channel.'
			});
			return;
		}

		// cancel idle timer
		const timer = guildDisconnectTimers.get(guild.id);
		if (timer) {
			clearTimeout(timer);
			guildDisconnectTimers.delete(guild.id);
		}

		curConnection.destroy();

		await interaction.editReply({
			content: `✅ Disconnected from ${channel.name}.`
		});

		console.log(`Disconnected from ${channel.name} in ${guild.name}.`);
	}

	command(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}
}