import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { availabilityAt, scheduleFromText } from '../src/lib/availability.mjs';
const schedule = scheduleFromText(await readFile(new URL('../src/pages/contact.md', import.meta.url), 'utf8'));
const cases = [
  ['Monday before first window', '2026-10-26T07:29:00-07:00', false],
  ['Monday first window starts', '2026-10-26T07:30:00-07:00', true],
  ['Monday first window ends', '2026-10-26T09:00:00-07:00', false],
  ['Monday second window', '2026-10-26T10:16:00-07:00', true],
  ['Monday afternoon gap', '2026-10-26T13:59:00-07:00', false],
  ['Tuesday last window', '2026-10-27T13:30:00-07:00', true],
  ['Wednesday before start', '2026-10-28T14:29:00-07:00', false],
  ['Wednesday start', '2026-10-28T14:30:00-07:00', true],
  ['Weekday close', '2026-10-28T22:00:00-07:00', false],
  ['Saturday before start', '2026-10-24T05:59:00-07:00', false],
  ['Saturday start', '2026-10-24T06:00:00-07:00', true],
  ['Sunday midnight carries Saturday', '2026-10-25T00:30:00-07:00', true],
  ['Sunday overnight end', '2026-10-25T01:00:00-07:00', false],
  ['Monday midnight carries Sunday', '2026-10-26T00:59:00-07:00', true],
  ['Monday overnight end', '2026-10-26T01:00:00-07:00', false],
  ['Winter PST morning', '2026-12-07T15:30:00Z', true],
  ['Summer PDT morning', '2026-07-06T14:30:00Z', true],
  ['DST fall first 1 a.m.', '2026-11-01T01:00:00-07:00', false],
  ['DST fall second 1 a.m.', '2026-11-01T01:00:00-08:00', false],
  ['DST spring jump', '2026-03-08T03:00:00-07:00', false],
];
for (const [label, date, expected] of cases) assert.equal(availabilityAt(schedule, new Date(date)), expected, label);
console.log(`${cases.length} availability checks passed, including boundaries, overnight hours, PST/PDT, and DST changes.`);
