import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../structs/Command.ts';
import { PermissionLevel } from '../../modules/helpers/Utils.ts';
import { joinVoiceChannel, entersState, getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';

export class JoinCommand extends Command {
    constructor(client: any) {
        super(client, {
            name: 'join',
            description: 'Joins your current voice channel.',
            usage: 'join',
            category: 'general',
            permissionLevel: PermissionLevel.GUEST,
            guildOnly: true,
            cooldown: 3,
        })
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: 64 }); // delay reply bc discord voice ops can be weird

        const guild = interaction.guild;
        if (!guild) {
            await interaction.editReply({
                content: '❌ Command can only be used in a server.'
            });
            return;
        }

        const curConnection = getVoiceConnection(interaction.guildId!);
        if (curConnection) {
            await interaction.editReply({
                content: '❌ I am already connected to a voice channel.'
            });
            return;
        }

        const member = interaction.member as GuildMember;
        const channel = member.voice.channel;
        if (!channel) {  
            await interaction.editReply({
                content: '❌ You must be in a voice channel first.'
            });
            return;
        }

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
            });

            await interaction.editReply({
                content: `✅ Connected to ${channel.name}.`
            });

            console.log(`Connected to ${channel.name} in ${interaction.guild!.name}.`);
        }
        catch(error) {
            console.error('Voice connection error:', error);
            
            const failedConnection = getVoiceConnection(guild.id);
            failedConnection?.destroy();

            await interaction.editReply({
                content: '❌ Error connecting to voice channel. Please try again.'
            });
        }
    }

    command(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }
}