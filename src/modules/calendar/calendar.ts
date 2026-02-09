import axios from 'axios';
import ical from 'node-ical';

const rawCalendarURL = 'https://calendar.google.com/calendar/ical/ieee.ucf%40gmail.com/public/basic.ics';

async function fetchCalendarEvents() {
	const response = await axios.get(rawCalendarURL);
	const ics = ical.parseICS(response.data);

	const now = new Date();
	const futureLimit = new Date();
	futureLimit.setMonth(futureLimit.getMonth() + 3); // Next 3 months

	const events: any[] = [];

	for (const event of Object.values(ics)) {
		if (event.type === 'VEVENT') {
			if (event.rrule) {
				// Expand recurring events
				const dates = event.rrule.between(now, futureLimit, true);

				for (const date of dates) {
					// Exclude EXDATEs
					if (event.exdate?.[date.toISOString()]) continue;
					events.push({
						...event,
						start: date,
						end: new Date(date.getTime() + (event.end.getTime() - event.start.getTime())),
					});
				}
				
			} else if (event.start > now) {
				events.push(event);
			}
		}
	}
	return events;
}

await fetchCalendarEvents().then(events => {
	console.log(events);
});
