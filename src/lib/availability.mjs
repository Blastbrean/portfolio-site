const minutes = value => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};
const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Read the existing written schedule so its wording and links can stay untouched.
export function scheduleFromText(content) {
  const text = content.replace(/<\/p>/g, '\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
  const days = names.map(name => ({ name, hours: [] }));
  const day = names.join('|');
  const pattern = new RegExp(`(${day})(?: & (${day}))?:([^\\n]+)`, 'g');
  const clockMinutes = (hour, minute, period) => (Number(hour) % 12 + (period.toLowerCase() === 'pm' ? 12 : 0)) * 60 + Number(minute ?? 0);
  const stamp = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  for (const [, first, second, windows] of text.matchAll(pattern)) {
    const hours = [...windows.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi)].map(([, h1, m1, p1, h2, m2, p2]) => {
      const start = clockMinutes(h1, m1, p1);
      let end = clockMinutes(h2, m2, p2);
      if (end <= start) end += 1440;
      return [stamp(start), stamp(end)];
    });
    for (const name of [first, second].filter(Boolean)) days[names.indexOf(name)].hours = hours;
  }
  if (days.some(day => !day.hours.length)) throw new Error('Could not read all seven availability days from Contact. Use the existing Day: 7:30am - 9:00am format.');
  return { timeZone: 'America/Los_Angeles', days };
}

export function availabilityAt(schedule, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  const dayIndex = schedule.days.findIndex(day => day.name === parts.weekday);
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const contains = (hours, value) => hours.some(([start, end]) => value >= minutes(start) && value < minutes(end));
  return contains(schedule.days[dayIndex].hours, minute)
    || contains(schedule.days[(dayIndex + 6) % 7].hours, minute + 1440);
}
