import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';
import {entersState, getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { disconnectTimers } from '../../events/voiceStateUpdate.ts'; // imported to allow clearing existing disconnect timers

export class LeaveCommand extends Command {
    constructor(client: any) {
        super(client, {
            name: 'leave',
            description: 'Leaves your current voice channel.',
            usage: 'leave',
            category: 'general',
            permissionLevel: PermissionLevel.GUEST,
            guildOnly: true,
            cooldown: 10,
        })
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        const guild = interaction.guild;
        // ensures interaction takes place in a guild (possibly redundant?)
        if (!guild) {
            await interaction.reply({
                content: '❌ Command can only be used in a server',
                ephemeral: true 
            });
            return;
        }

        const member = interaction.member as GuildMember;
        const channel = member.voice.channel;
        // ensures user is currently in a voice channel
        if (!channel) {  
            await interaction.reply({
                content: '❌ You must be in a voice channel',
                ephemeral: true 
            });
            return;
        }

        const curConnection = getVoiceConnection(interaction.guildId!);
        // checks if bot is currently in a voice channel
        if (!curConnection) {
            await interaction.reply({
                content: '❌ I am not currently in a voice channel',
                ephemeral: true 
            });
            return;
        }
        
        // checks if user and bot are in the same channe! cl
        if (curConnection.joinConfig.channelId !== channel.id) {
            await interaction.reply({
                content: '❌ Must be in the same voice channel',
                ephemeral: true 
            });
            return;
        }

        // disconnects the bot
         try {
            await entersState(curConnection, VoiceConnectionStatus.Ready, 5_000);
        }
        catch {
            // if fails or times out, still disconnects
        }
        finally {  
            const existing = disconnectTimers.get(guild.id);
            // clears any auto-disconnect timers 
            if (existing) {
                clearTimeout(existing);
                disconnectTimers.delete(guild.id);
            }

            curConnection.destroy();

            await interaction.reply({
                content: `✅ Disconnected from ${channel.name}`,
                ephemeral: true 
            });
            console.log(`Disconnected from ${channel.name} in ${guild.name}`);
        }
}

    command(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }
}
