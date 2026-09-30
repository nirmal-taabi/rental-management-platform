import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database.js';
import { getCitiesForState, getStates } from '../src/services/location.service.js';

const enabled = process.env.RUN_DB_INTEGRATION === '1';

test('location lookups return seeded cities only for their selected state', { skip: !enabled }, async () => {
  try {
    const states = await getStates();
    assert.ok(states.length >= 36);

    const maharashtra = states.find((state) => state.name === 'Maharashtra');
    assert.ok(maharashtra, 'Maharashtra is seeded');

    const cities = await getCitiesForState(maharashtra.id);
    assert.ok(cities.some((city) => city.name === 'Pune'));
    assert.ok(!cities.some((city) => city.name === 'Chennai'));

    await assert.rejects(getCitiesForState('not-a-state'), (error) => error.code === 'VALIDATION_ERROR');
  } finally {
    await pool.end();
  }
});