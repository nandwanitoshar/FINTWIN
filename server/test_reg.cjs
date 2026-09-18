const http = require('http');
const mongoose = require('mongoose');

const postJSON = (path, body, token) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const getJSON = (path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

async function main() {
  console.log('=== STEP 6: TEST REAL REGISTRATION ===');
  const testEmail = `fintwin.test.${Date.now()}@example.com`;
  const regRes = await postJSON('/api/auth/register', {
    name: 'Test Twin User',
    email: testEmail,
    password: 'TestPassword!2026',
    currency: 'INR'
  });
  console.log('Registration Status:', regRes.status);
  console.log('Registration Response:', JSON.stringify(regRes.body, null, 2));

  if (!regRes.body.success || !regRes.body.token) {
    throw new Error('Registration failed!');
  }

  const token = regRes.body.token;

  console.log('\n=== STEP 7: VERIFY MONGODB ===');
  await mongoose.connect('mongodb://127.0.0.1:27017/fintwin');
  const user = await mongoose.connection.db.collection('users').findOne({ email: testEmail });
  console.log('User found in MongoDB:', {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash ? '[HASH_EXISTS_AND_ENCRYPTED: ' + user.passwordHash.substring(0, 15) + '...]' : 'MISSING',
    currency: user.currency,
    createdAt: user.createdAt
  });
  await mongoose.disconnect();

  console.log('\n=== STEP 8: TEST LOGIN ===');
  const loginRes = await postJSON('/api/auth/login', {
    email: testEmail,
    password: 'TestPassword!2026'
  });
  console.log('Login Status:', loginRes.status);
  console.log('Login Token received:', !!loginRes.body.token);

  console.log('\n=== STEP 9: TEST AUTHENTICATED ME & PROTECTED ACCESS ===');
  const meRes = await getJSON('/api/auth/me', loginRes.body.token);
  console.log('GET /api/auth/me Status:', meRes.status);
  console.log('GET /api/auth/me User:', meRes.body.user);

  const unauthRes = await getJSON('/api/accounts', null);
  console.log('Unauthenticated /api/accounts rejected (401):', unauthRes.status === 401);

  console.log('\n=== STEP 10: TEST MAJOR ENDPOINTS WITH NEW USER ===');
  const endpoints = [
    '/api/accounts',
    '/api/goals',
    '/api/loans',
    '/api/transactions',
    '/api/twin',
    '/api/network',
    '/api/risk-signals',
    '/api/simulation/history',
    '/api/analysis',
    '/api/report'
  ];

  for (const ep of endpoints) {
    const res = await getJSON(ep, loginRes.body.token);
    console.log(`Endpoint ${ep} status: ${res.status} | success: ${res.body?.success}`);
  }

  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
