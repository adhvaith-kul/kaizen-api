import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';

describe('Integration Tests: API Routes Validation', () => {
  it('POST /api/auth/signup should return 400 when missing username or email', async () => {
    const res = await request(app).post('/api/auth/signup').send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Username and email are required');
  });

  it('POST /api/auth/login should return 400 when missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Email is required');
  });

  it('POST /api/groups should return 400 when missing required fields', async () => {
    const res = await request(app).post('/api/groups').send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Name and userId are required');
  });

  it('GET /api/habits should return 400 when missing userId or groupId', async () => {
    const res = await request(app).get('/api/habits');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'userId and groupId are required');
  });

  it('POST /api/logs/toggle should return 400 when missing required parameters', async () => {
    const res = await request(app).post('/api/logs/toggle').send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'userId and habitId are required');
  });

  it('GET /api/challenges/:id/habits should return 400 when missing userId', async () => {
    const res = await request(app).get('/api/challenges/test-id/habits');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'userId is required');
  });

  it('POST /api/upload/profile should return 400 when no image is provided', async () => {
    const res = await request(app).post('/api/upload/profile').send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'No image file or base64 provided');
  });
});
