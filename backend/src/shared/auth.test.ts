import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authenticate } from './auth.js';
import { env } from './env.js';
import { errorHandler } from './errors.js';

function testApp() {
  const app = express();
  app.get('/protected', authenticate, (request, response) => {
    response.json({ auth: request.auth });
  });
  app.use(errorHandler);
  return app;
}

describe('authenticate', () => {
  it('accepts a signed user token', async () => {
    const token = jwt.sign(
      { role: 'OWNER_ADMIN' },
      env.JWT_SECRET,
      { subject: '1', expiresIn: '5m' },
    );
    const response = await request(testApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.auth).toMatchObject({ sub: '1', role: 'OWNER_ADMIN' });
  });

  it('rejects a request without a token', async () => {
    const response = await request(testApp()).get('/protected');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });
});
