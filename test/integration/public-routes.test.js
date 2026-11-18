import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';

describe('Integration Tests: Public Endpoints', () => {
  it('GET / should return 200 with service status message', async () => {
    const res = await request(app).get('/');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Kaizen API is running!');
  });

  it('GET /init should return 200 with ready status', async () => {
    const res = await request(app).get('/init');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ready');
    assert.ok(res.body.timestamp);
  });

  it('GET /health should return 200 with ok status', async () => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'kaizen-api');
  });

  it('GET /api/categories should return categories array', async () => {
    const res = await request(app).get('/api/categories');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Categories should be an array');
    assert.ok(res.body.length > 0);
  });

  it('GET /non-existent-route should return 404', async () => {
    const res = await request(app).get('/api/non-existent-endpoint-xyz');
    assert.strictEqual(res.status, 404);
  });
});
