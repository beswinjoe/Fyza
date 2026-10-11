import { validateItem } from './src/engine/schema';
import { strict as assert } from 'assert';

const invalidTrip = validateItem('trips', { start: '2026-11-20', end: '2026-11-10', budget: { travel: 100 } });
assert.equal(invalidTrip!.start, '2026-11-10', 'Start date should be swapped');
assert.equal(invalidTrip!.end, '2026-11-20', 'End date should be swapped');
console.log('Schema test passed!');
