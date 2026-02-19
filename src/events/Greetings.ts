import {GuildMember, EmbedBuilder} from "discord.js";
import {Event} from "../structs/Event.ts";

export class Greetings extends Event {
    constructor(client: any) {
        super(client, {
            name: 'Greetings',
            once: false,
        });
    }

    async run(member: GuildMember): Promise<void> {
        //Greet in General Channel
        const generalChannelID = this.client.config.servers.main.channels.general;
        const generalChannel = member.guild.channels.cache.get(generalChannelID);
        
        if (generalChannel?.isTextBased()) {
            const serverEmbed = this.client.createEmbed()
                .setTitle('Welcome to IEEE Discord Server!')
                .setDescription(`Hello ${member.user}, welcome to the IEEE UCF Discord! Please make sure to read the rules and enjoy your stay!`)
                .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            
            await generalChannel.send({ embeds: [serverEmbed] }).catch(console.error);
        }
        //Personal Welcome DM
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(this.client.config.embed.color)
                .setTitle('Welcome to IEEE UCF!')
                .setDescription(`Thanks for joining the **IEEE @ UCF** Discord server. Here are a few things to get started:\n\n` +
                                `* Check out the rules!` +
                                `* Introduce yourself :)`
                )
                .setFooter({ text: this.client.config.embed.footer})
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] });
        } catch(error) {
            console.log(`Could not ${member.user.tag}: ${error}`)
        }
    }
}
