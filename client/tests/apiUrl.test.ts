import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApiBase, buildApiUrl } from '../src/services/api.ts';

describe('API URL Construction and Environment Normalization', () => {
  it('handles production VITE_API_URL with trailing slash (the Vercel production bug)', () => {
    const base = getApiBase('https://fintwin-7bta.onrender.com/', true);
    assert.equal(base, 'https://fintwin-7bta.onrender.com/api');

    const registerUrl = buildApiUrl('/auth/register', base);
    assert.equal(registerUrl, 'https://fintwin-7bta.onrender.com/api/auth/register');
    assert.ok(!registerUrl.includes('//auth'), 'Should not contain double slash before auth');

    const loginUrl = buildApiUrl('/auth/login', base);
    assert.equal(loginUrl, 'https://fintwin-7bta.onrender.com/api/auth/login');
  });

  it('handles production VITE_API_URL without trailing slash', () => {
    const base = getApiBase('https://fintwin-7bta.onrender.com', true);
    assert.equal(base, 'https://fintwin-7bta.onrender.com/api');

    const registerUrl = buildApiUrl('/auth/register', base);
    assert.equal(registerUrl, 'https://fintwin-7bta.onrender.com/api/auth/register');

    const loginUrl = buildApiUrl('/auth/login', base);
    assert.equal(loginUrl, 'https://fintwin-7bta.onrender.com/api/auth/login');
  });

  it('handles VITE_API_URL that already includes /api', () => {
    const base = getApiBase('https://fintwin-7bta.onrender.com/api', true);
    assert.equal(base, 'https://fintwin-7bta.onrender.com/api');

    const registerUrl = buildApiUrl('/auth/register', base);
    assert.equal(registerUrl, 'https://fintwin-7bta.onrender.com/api/auth/register');
  });

  it('handles VITE_API_URL that already includes /api with trailing slash', () => {
    const base = getApiBase('https://fintwin-7bta.onrender.com/api/', true);
    assert.equal(base, 'https://fintwin-7bta.onrender.com/api');

    const registerUrl = buildApiUrl('/auth/register', base);
    assert.equal(registerUrl, 'https://fintwin-7bta.onrender.com/api/auth/register');
  });

  it('defaults to /api in local development (isProd = false) when VITE_API_URL is unset', () => {
    const base = getApiBase(undefined, false);
    assert.equal(base, '/api');

    const registerUrl = buildApiUrl('/auth/register', base);
    assert.equal(registerUrl, '/api/auth/register');

    const loginUrl = buildApiUrl('/auth/login', base);
    assert.equal(loginUrl, '/api/auth/login');
  });

  it('defaults to production Render backend in production when VITE_API_URL is unset', () => {
    const base = getApiBase(undefined, true);
    assert.equal(base, 'https://fintwin-7bta.onrender.com/api');

    const registerUrl = buildApiUrl('/auth/register', base);
    assert.equal(registerUrl, 'https://fintwin-7bta.onrender.com/api/auth/register');
  });

  it('handles endpoint without leading slash', () => {
    const base = getApiBase('https://fintwin-7bta.onrender.com', true);
    const registerUrl = buildApiUrl('auth/register', base);
    assert.equal(registerUrl, 'https://fintwin-7bta.onrender.com/api/auth/register');
  });

  it('prevents duplicate /api/api if endpoint is called with /api prefix', () => {
    const base = getApiBase('https://fintwin-7bta.onrender.com', true);
    const registerUrl = buildApiUrl('/api/auth/register', base);
    assert.equal(registerUrl, 'https://fintwin-7bta.onrender.com/api/auth/register');
    assert.ok(!registerUrl.includes('/api/api/'), 'Should not contain duplicate /api/api/');
  });

  it('constructs correct URLs for all other API endpoints', () => {
    const base = getApiBase('https://fintwin-7bta.onrender.com/', true);

    const endpoints = [
      ['/goals', 'https://fintwin-7bta.onrender.com/api/goals'],
      ['/loans', 'https://fintwin-7bta.onrender.com/api/loans'],
      ['/accounts', 'https://fintwin-7bta.onrender.com/api/accounts'],
      ['/entities', 'https://fintwin-7bta.onrender.com/api/entities'],
      ['/transactions', 'https://fintwin-7bta.onrender.com/api/transactions'],
      ['/twin', 'https://fintwin-7bta.onrender.com/api/twin'],
      ['/network', 'https://fintwin-7bta.onrender.com/api/network'],
      ['/risk-signals', 'https://fintwin-7bta.onrender.com/api/risk-signals'],
      ['/simulation/run', 'https://fintwin-7bta.onrender.com/api/simulation/run'],
      ['/analysis/health-score', 'https://fintwin-7bta.onrender.com/api/analysis/health-score'],
      ['/report', 'https://fintwin-7bta.onrender.com/api/report'],
      ['/health', 'https://fintwin-7bta.onrender.com/api/health'],
    ];

    for (const [endpoint, expected] of endpoints) {
      assert.equal(buildApiUrl(endpoint, base), expected);
    }
  });
});
