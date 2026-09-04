import axios from 'axios';
import ical from 'node-ical';

export class Calendar {
	client: any;
	calendars: string[];

	constructor(client: any, calendars: string[]) {
		this.client = client;
		this.calendars = calendars;
	}

	async fetchCalendarEvents() {
		const allEvents: any[] = [];

		for (const calendarURL of this.calendars) {
			const response = await axios.get(calendarURL, { responseType: 'text' });
			const ics = ical.parseICS(response.data);

			const now = new Date();
			const futureLimit = new Date();
			futureLimit.setMonth(futureLimit.getMonth() + 3);

			const events: any[] = [];

			for (const event of Object.values(ics)) {
				if (event.type !== 'VEVENT') continue;

				if (event.rrule) {
					const duration = event.end.getTime() - event.start.getTime();
					const baseStart = event.start;
					const rangeStart = new Date(now);
					rangeStart.setHours(0, 0, 0, 0);

					const dates = event.rrule.between(rangeStart, futureLimit, true);

					for (const date of dates) {
						const exKey = new Date(date);
						exKey.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), baseStart.getMilliseconds());
						if (event.exdate?.[exKey.toISOString()]) continue;

						const start = new Date(date);
						start.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), baseStart.getMilliseconds());
						const end = new Date(start.getTime() + duration);

						events.push({ ...event, start, end });
					}
				} else if (event.start >= now) {
					events.push(event);
				}
			}

			allEvents.push(...events);
		}

		return allEvents.sort((a: any, b: any) => {
			if (a.start && b.start) return (a.start as Date).getTime() - (b.start as Date).getTime();
			return 0;
		});
	}
}