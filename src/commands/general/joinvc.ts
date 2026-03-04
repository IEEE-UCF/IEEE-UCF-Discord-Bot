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

        const curConnection = getVoiceConnection(interaction.guildId!);
        // checks if bot is currently connected to a voice channel
        if (curConnection) {
            await interaction.reply({
                content: '❌ I am already connected to a voice channel',
                ephemeral: true
            });
            return;
        }

        const member = interaction.member as GuildMember;
        const channel = member.voice.channel;
        // ensures user is currently in a voice channel
        if (!channel) {  
            await interaction.reply({
                content: '❌ You must be in a voice channel first',
                ephemeral: true 
            });
            return;
        }

        // connects bot to specified voice channel, barring any errors
        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 10_000); // waits 10s for bot to connect before throwing an error

            await interaction.reply({
                content: `✅ Connected to ${channel.name}`,
                ephemeral: true 
            });

            console.log(`Connected to ${channel.name} in ${interaction.guild.name}`);
        }
        catch(error) {
            const failedConnection = getVoiceConnection(guild.id);
            failedConnection?.destroy(); // ensures that bot not stuck in vc 'limbo' (e.g., stuck trying to connect or signal), and destroys the connection object

            await interaction.reply({
                content: '❌ Error connecting to voice channel',
                ephemeral: true 
            });
            console.log(error);
        }
    }

    command(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }
}
