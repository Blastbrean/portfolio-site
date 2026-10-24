// Build-time calculation only. Never import a birth date into browser code.
export function calculateAge(birthDate: string, now = new Date()): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error('PRIVATE_BIRTH_DATE must be a valid date in YYYY-MM-DD format.');
  }
  const [year, month, day] = birthDate.split('-').map(Number);
  const parsed = new Date(`${birthDate}T00:00:00Z`);
  if (year < 1 || !Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
    throw new Error('PRIVATE_BIRTH_DATE must be a valid calendar date.');
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(now);
  const current = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const currentYear = current('year');
  const currentMonth = current('month');
  const currentDay = current('day');
  let age = currentYear - year;
  if (currentMonth < month || (currentMonth === month && currentDay < day)) age--;
  if (age < 0) throw new Error('PRIVATE_BIRTH_DATE cannot be in the future.');
  return age;
}
