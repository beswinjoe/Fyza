const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour12: false,
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
});

function testDate(d: Date, expectedH: number) {
  const parts = formatter.formatToParts(d);
  let h = 0, m = 0, s = 0;
  for (const part of parts) {
    if (part.type === 'hour') h = parseInt(part.value, 10);
    if (part.type === 'minute') m = parseInt(part.value, 10);
    if (part.type === 'second') s = parseInt(part.value, 10);
  }
  if (h === 24) h = 0;
  
  if (h !== expectedH) throw new Error(`Expected hour ${expectedH} but got ${h} for date ${d.toISOString()}`);
  console.log(`Passed: ${d.toISOString()} is ${h}:${m}:${s} in America/New_York`);
}

// 1. EDT test (Daylight Saving Time - UTC-4)
// e.g., July 15, 2026 at 16:00:00 UTC should be 12:00:00 EDT
testDate(new Date('2026-07-15T16:00:00Z'), 12);

// 2. EST test (Standard Time - UTC-5)
// e.g., December 15, 2026 at 16:00:00 UTC should be 11:00:00 EST
testDate(new Date('2026-12-15T16:00:00Z'), 11);

console.log('All Atmosphere timezone tests passed!');
