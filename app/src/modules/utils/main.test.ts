import * as Discord from 'discord.js';
import { Calendar } from '../calendar/main.ts';
import config from '../../config.ts';

if (!config.token) {
	console.error('No token provided in environment variables.');
	process.exit(1);
}

const client = new Discord.Client({
	intents: config.intents,
	partials: config.partials,
});

client.on(Discord.Events.ClientReady, () => {
	console.log(`Logged in as ${client.user?.tag}!`);
	const channel = client.channels.cache.get(config.servers.main.channels.calendar) as Discord.TextChannel | undefined;
	void channel?.send('https://tenor.com/view/larry-larry-cat-chat-larry-meme-chat-meme-cat-gif-10061556685042597078');
});

client.login(config.token).catch((error) => {
	console.error('Failed to login:', error);
	process.exit(1);
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;

	if (message.content === '!ping') {
		void message.channel.send('Pong!');
		return;
	}

	if (message.content.startsWith('!events')) {
		await message.channel.sendTyping();

		try {
			const calendar = new Calendar(client, config.calendarURLs ?? []);
			const events = await calendar.fetchCalendarEvents();

			if (events.length === 0) {
				await message.channel.send('No upcoming events found.');
				return;
			}

			const durationString = function(seconds: number): string {
				const days = Math.floor(seconds / 86400);
				const hrs = Math.floor((seconds % 86400) / 3600);
				const mins = Math.floor((seconds % 3600) / 60);
				const secs = seconds % 60;
				let result = '';
				if (days > 0) result += `${days}d `;
				if (hrs > 0) result += `${hrs}h `;
				if (mins > 0) result += `${mins}m `;
				if (secs > 0) result += `${secs}s`;
				return result.trim();
			};

			const embeds = [];
			for (const event of events) {
				const duration = event.end && event.start
					? Math.floor(((event.end as Date).getTime() - (event.start as Date).getTime()) / 1000)
					: null;

				const embed = new Discord.EmbedBuilder()
					.setTitle(event.summary ?? 'No Title')
					.addFields(
						{
							name: 'Location',
							value: event.location ? event.location.toString() : 'N/A',
						},
						{
							name: 'Scheduled for',
							value: Discord.time(event.start as Date, Discord.TimestampStyles.LongDateTime),
							inline: true,
						},
						{
							name: 'Duration',
							value: duration ? durationString(duration) : 'N/A',
							inline: true,
						},
					)
					.setColor(config.embed.color as Discord.ColorResolvable)
					.setTimestamp(new Date());
				embeds.push(embed);
			}

			// Split embeds into chunks of 10 (Discord limit)
			const chunkSize = 10;
			for (let i = 0; i < embeds.length; i += chunkSize) {
				const chunk = embeds.slice(i, i + chunkSize);
				await message.channel.send({ embeds: chunk });
			}

			await message.react('✅');
		} catch (error) {
			console.error('Error fetching events:', error);
			await message.channel.send('❌ Error fetching calendar events. Please try again later.');
			await message.react('❌');
		}
	}
});
