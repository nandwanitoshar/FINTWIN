import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { UserRepository } from '../src/models/User.js';

describe('FinTwin AI — Authentication & Foundation API Tests', () => {
  beforeEach(async () => {
    await UserRepository.clearInMemory();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK and operational status', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.status === 'operational' || res.body.status === 'ok');
      assert.equal(typeof res.body.uptimeSeconds, 'number');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Nandwani Test',
          email: 'test@fintwin.ai',
          password: 'securepassword123',
          currency: 'INR',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.token, 'Token should be returned');
      assert.equal(res.body.user.name, 'Nandwani Test');
      assert.equal(res.body.user.email, 'test@fintwin.ai');
      assert.equal(res.body.user.currency, 'INR');
      assert.equal(res.body.user.passwordHash, undefined, 'Password hash must never be exposed');
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email: 'duplicate@fintwin.ai',
          password: 'password123',
        });

      // Attempt duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@fintwin.ai',
          password: 'anotherpassword',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /already exists/i);
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email',
          email: 'not-an-email',
          password: 'password123',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('should reject registration with short password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'short@fintwin.ai',
          password: '123',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /at least 6 characters/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Login User',
          email: 'login@fintwin.ai',
          password: 'correctpassword123',
        });
    });

    it('should successfully log in with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@fintwin.ai',
          password: 'correctpassword123',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.token, 'Token must be returned');
      assert.equal(res.body.user.email, 'login@fintwin.ai');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@fintwin.ai',
          password: 'wrongpassword',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /invalid email or password/i);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@fintwin.ai',
          password: 'anypassword',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });
  });

  describe('GET /api/auth/me (Protected Route & Tenant Isolation)', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('should return 401 when invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_fake_token_12345');

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('should return user profile when valid token is provided', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Protected User',
          email: 'protected@fintwin.ai',
          password: 'password123',
        });

      const token = regRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.email, 'protected@fintwin.ai');
      assert.equal(res.body.user.name, 'Protected User');
      assert.equal(res.body.user.passwordHash, undefined);
    });
  });
});
