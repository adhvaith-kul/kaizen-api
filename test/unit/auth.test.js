import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kaizen-jwt-secret-key-change-in-production';

describe('Auth Unit Tests: JWT Token Creation & Verification', () => {
  it('should sign and verify valid JWT tokens', () => {
    const payload = { userId: 'u-kaizen-123', email: 'user@kaizen.app' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    assert.ok(token);
    const decoded = jwt.verify(token, JWT_SECRET);
    assert.strictEqual(decoded.userId, 'u-kaizen-123');
    assert.strictEqual(decoded.email, 'user@kaizen.app');
  });

  it('should reject tokens signed with invalid secret', () => {
    const payload = { userId: 'u-tampered' };
    const forgedToken = jwt.sign(payload, 'wrong-secret');

    assert.throws(() => {
      jwt.verify(forgedToken, JWT_SECRET);
    }, /invalid signature/);
  });

  it('should detect expired tokens properly', () => {
    const payload = { userId: 'u-expired' };
    const expiredToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' });

    assert.throws(() => {
      jwt.verify(expiredToken, JWT_SECRET);
    }, /jwt expired/);
  });
});
