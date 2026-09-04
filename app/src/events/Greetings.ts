import { GuildMember, EmbedBuilder } from 'discord.js';
import { Event } from '../structs/Event.ts';
import { createCommandButton } from 'src/modules/helpers/buttons.ts';
import { ButtonStyle } from 'discord.js';

export class Greetings extends Event {
	constructor(client: any) {
		super(client, {
			name: 'guildMemberAdd',
			once: false,
		});
	}

	async run(member: GuildMember): Promise<void> {
		const generalChannelID = this.client.config.servers.main.channels.general;
		const generalChannel = member.guild.channels.cache.get(generalChannelID);

		// Greet in General Channel
		if (generalChannel?.isTextBased()) {
			const serverEmbed = this.client.createEmbed()
				.setTitle('Welcome to the IEEE @ UCF Discord Server!')
				.setDescription(`Hello ${member.user}, Welcome to the IEEE @ UCF Discord Server! Please make sure to read the rules, check out the server guide, and enjoy your stay!`)
				.setThumbnail(member.user.displayAvatarURL({ size: 256 }));

			// Create help button
			const { row } = createCommandButton(
				`welcome_${member.id}`,
				'Help',
				'help',
				ButtonStyle.Primary,
			);

			await generalChannel.send({
				embeds: [serverEmbed],
				components: [row],
			}).catch(console.error);
		}

		try { // Personal Welcome DM
			const dmEmbed = new EmbedBuilder()
				.setColor(this.client.config.embed.color)
				.setTitle('Welcome to IEEE UCF!')
				.setDescription('Thanks for joining the **IEEE @ UCF** Discord server.\n' +
								'IEEE UCF is the University of Central Florida\'s student chapter of the Institute of Electrical and Electronics Engineers, focused on helping students grow in engineering, computer science, professionalism, and service. The organization hosts workshops, meetings, career events, and long-term projects that give members hands-on experience and unique opportunities. For more information, visit:  https://ieee.cecs.ucf.edu/\n\n',
				)
				.setFooter({ text: this.client.config.embed.footer })
				.setTimestamp();

			await member.send({ embeds: [dmEmbed] });
		} catch (error) {
			console.log(`Could not DM ${member.user.tag}: ${error}`);
		}
	}
}