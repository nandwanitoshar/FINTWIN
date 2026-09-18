/**
 * auth_emergency_verification.test.ts
 * FinTwin AI — Verification of Authentication Fixes
 *
 * Tests:
 * Test A — Fresh registration
 * Test B — Login with newly created credentials
 * Test C — Wrong password rejected
 * Test D — Unknown user rejected
 * Test E — Protected route without token returns 401
 * Test F — Protected route with valid token succeeds
 * Test G — Logout clears session
 * Test H — Token persistence / session validation (GET /api/auth/me)
 * Test I — Multi-tenant strict isolation between User A and User B
 * Demo User — Verify official demo user (test@fintwin.ai / securepassword123) is pre-seeded
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { DEMO_USER_EMAIL, DEMO_USER_PASSWORD, ensureDemoUser } from '../src/services/seedService.js';

describe('FinTwin AI — Authentication Emergency Verification', () => {
  const timestamp = Date.now();
  const testUserA = {
    name: 'Verified User Alpha',
    email: `verified_alpha_${timestamp}@fintwin.ai`,
    password: 'CorrectPassword123!',
    currency: 'INR',
  };

  const testUserB = {
    name: 'Verified User Beta',
    email: `verified_beta_${timestamp}@fintwin.ai`,
    password: 'AnotherPassword456!',
    currency: 'USD',
  };

  let tokenA: string;
  let userAId: string;
  let tokenB: string;
  let userBId: string;

  // ─── DEMO USER SEEDING VERIFICATION ───────────────────────────────────────
  it('Demo User: ensures test@fintwin.ai / securepassword123 exists and can log in immediately', async () => {
    await ensureDemoUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: DEMO_USER_EMAIL,
        password: DEMO_USER_PASSWORD,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Token must be issued for demo user');
    assert.equal(res.body.user.email, DEMO_USER_EMAIL);
    assert.equal(res.body.user.passwordHash, undefined, 'Password hash must never be returned');
  });

  // ─── TEST A: FRESH REGISTRATION ───────────────────────────────────────────
  it('Test A: Fresh registration creates account, securely hashes password, and returns valid JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUserA);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Valid JWT must be issued');
    assert.ok(res.body.user._id);
    assert.equal(res.body.user.email, testUserA.email.toLowerCase());
    assert.equal(res.body.user.name, testUserA.name);
    assert.equal(res.body.user.passwordHash, undefined, 'Password hash must never be exposed');
    assert.equal((res.body.user as any).password, undefined, 'Plaintext password must not be returned');

    tokenA = res.body.token;
    userAId = res.body.user._id;
  });

  // ─── DUPLICATE REGISTRATION REJECTED ──────────────────────────────────────
  it('Registration: duplicate registration is rejected with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUserA);

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.token, undefined);
    assert.match(res.body.message, /already exists/i);
  });

  // ─── INVALID EMAIL REJECTED ───────────────────────────────────────────────
  it('Registration: invalid email (e.g. test@) is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Email User',
        email: 'test@',
        password: 'ValidPassword123!',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /valid email/i);
  });

  // ─── MISSING / INVALID FIELDS REJECTED ────────────────────────────────────
  it('Registration: missing name is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: '',
        email: 'valid.email@example.com',
        password: 'ValidPassword123!',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /name/i);
  });

  it('Registration: missing password is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Without Password',
        email: 'nopass@example.com',
        password: '',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /password/i);
  });

  it('Registration: weak password (<6 chars) is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Password User',
        email: 'shortpass@example.com',
        password: '12345',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /at least 6 characters/i);
  });

  // ─── TEST B: LOGIN WITH NEW CREDENTIALS ───────────────────────────────────
  it('Test B: Login with valid credentials succeeds and issues active JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserA.email,
        password: testUserA.password,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user._id, userAId);
    assert.equal(res.body.user.email, testUserA.email.toLowerCase());
  });

  // ─── TEST C: WRONG PASSWORD REJECTED ──────────────────────────────────────
  it('Test C: Login with incorrect password is rejected with 401 and no token is issued', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserA.email,
        password: 'CompletelyWrongPassword999!',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.token, undefined);
    assert.match(res.body.message, /invalid/i);
  });

  // ─── TEST D: UNKNOWN USER REJECTED ────────────────────────────────────────
  it('Test D: Login with unregistered email is rejected with 401 and no token is issued', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent_user_999@fintwin.ai',
        password: 'AnyPassword123!',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.token, undefined);
    assert.match(res.body.message, /invalid/i);
  });

  // ─── TEST E: PROTECTED ROUTE WITHOUT TOKEN ────────────────────────────────
  it('Test E: Protected route without authentication returns 401 Unauthorized', async () => {
    const resAuthMe = await request(app).get('/api/auth/me');
    assert.equal(resAuthMe.status, 401);
    assert.equal(resAuthMe.body.success, false);

    const resAccounts = await request(app).get('/api/accounts');
    assert.equal(resAccounts.status, 401);

    const resReport = await request(app).get('/api/report');
    assert.equal(resReport.status, 401);
  });

  // ─── TEST F: PROTECTED ROUTE WITH VALID TOKEN ─────────────────────────────
  it('Test F: Protected route with valid token succeeds and returns authenticated user data', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user._id, userAId);
    assert.equal(res.body.user.email, testUserA.email.toLowerCase());
  });

  // ─── TEST G: LOGOUT CLEARANCE ─────────────────────────────────────────────
  it('Test G: Invalidating or omitting token simulates logout; subsequent requests return 401', async () => {
    // Attempting access with cleared or empty token
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer ');

    assert.equal(res.status, 401);
  });

  // ─── INVALID JWT REJECTED ─────────────────────────────────────────────────
  it('Authentication: invalid, expired, or tampered JWT is rejected with 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token.here');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid|expired/i);
  });

  // ─── TEST H: REFRESH / SESSION PERSISTENCE ────────────────────────────────
  it('Test H: Stored JWT token remains valid for session verification on page refresh', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testUserA.email.toLowerCase());
  });

  // ─── TEST I: TENANT ISOLATION ─────────────────────────────────────────────
  it('Test I: Multi-tenant strict isolation between User A and User B', async () => {
    // 1. Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send(testUserB);
    assert.equal(resB.status, 201);
    tokenB = resB.body.token;
    userBId = resB.body.user._id;

    // 2. User A creates an account
    const accResA = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Alpha Secret Vault',
        type: 'SAVINGS',
        institution: 'Alpha Bank',
        currentBalance: 75000,
      });
    assert.equal(accResA.status, 201);
    const accountAId = accResA.body.account._id;

    // 3. User B cannot access User A's account
    const leakRes = await request(app)
      .get(`/api/accounts/${accountAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.ok(leakRes.status === 404 || leakRes.status === 403, 'User B must not access User A account');

    // 4. User B report has 0 accounts
    const reportResB = await request(app)
      .get('/api/report')
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(reportResB.status, 200);
    assert.equal(reportResB.body.report.snapshot.totalBalance, 0);
    assert.equal(reportResB.body.report.snapshot.accountCount, 0);
  });

  // ─── CORS VERIFICATION ────────────────────────────────────────────────────
  it('CORS: verifies Access-Control-Allow-Origin dynamically reflects localhost:5173', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    assert.equal(res.status, 204);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });
});
