import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { JWT_SECRET } from '../../src/middleware/auth.js';

const mockUserId = '11111111-1111-1111-1111-111111111111';
const mockOtherUserId = '22222222-2222-2222-2222-222222222222';
const validToken = jwt.sign({ userId: mockUserId, email: 'tester@kaizen.app' }, JWT_SECRET, { expiresIn: '1h' });

describe('Integration Tests: API Routes Validation & JWT Protection', () => {
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

  it('Unauthenticated requests to private endpoints should return 401 Unauthorized', async () => {
    const res1 = await request(app).post('/api/groups').send({});
    assert.strictEqual(res1.status, 401);

    const res2 = await request(app).get('/api/habits');
    assert.strictEqual(res2.status, 401);

    const res3 = await request(app).post('/api/logs/toggle').send({});
    assert.strictEqual(res3.status, 401);

    const res4 = await request(app).get('/api/challenges/test-id/habits');
    assert.strictEqual(res4.status, 401);

    const res5 = await request(app).post('/api/upload/profile').send({});
    assert.strictEqual(res5.status, 401);

    const res6 = await request(app).get('/api/feed');
    assert.strictEqual(res6.status, 401);
  });

  it('POST /api/groups should validate required fields when authenticated', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Name and userId are required');
  });

  it('POST /api/groups should reject cross-user creation with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Secret Squad', userId: mockOtherUserId });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Forbidden: You can only create squads for yourself');
  });

  it('GET /api/habits should validate required parameters when authenticated', async () => {
    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', `Bearer ${validToken}`);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'userId and groupId are required');
  });

  it('GET /api/habits should reject accessing another user\'s habits with 403', async () => {
    const res = await request(app)
      .get(`/api/habits?userId=${mockOtherUserId}&groupId=fake-group`)
      .set('Authorization', `Bearer ${validToken}`);
    assert.strictEqual(res.status, 403);
  });

  it('POST /api/logs/toggle should return 400 when missing habitId when authenticated', async () => {
    const res = await request(app)
      .post('/api/logs/toggle')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'userId and habitId are required');
  });

  it('POST /api/logs/toggle should reject logging for another user with 403', async () => {
    const res = await request(app)
      .post('/api/logs/toggle')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ userId: mockOtherUserId, habitId: 'fake-habit' });
    assert.strictEqual(res.status, 403);
  });

  it('POST /api/upload/profile should return 400 when no image is provided when authenticated', async () => {
    const res = await request(app)
      .post('/api/upload/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'No image file or base64 provided');
  });
});
