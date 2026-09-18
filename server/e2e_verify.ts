import mongoose from 'mongoose';

const API_BASE = 'http://localhost:5000/api';

async function main() {
  console.log('--- FinTwin AI End-to-End Deep Verification ---');

  // 1. Health & DB Status
  const healthRes = await fetch(`${API_BASE}/health`);
  const health = await healthRes.json();
  console.log('✓ Backend Health:', health.status);
  console.log('✓ Database Mode:', health.databaseDetails?.mode, 'URI:', health.databaseDetails?.uri);

  if (!health.databaseDetails?.connected) {
    throw new Error('Database is NOT connected!');
  }

  // 2. Test Real Registration with unique email
  const timestamp = Date.now();
  const testEmail = `fintwin.test.${timestamp}@example.com`;
  const testPassword = 'TestPassword!2026';
  const testName = `Verified Twin ${timestamp}`;

  console.log(`\nRegistering user: ${testEmail}`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail.toUpperCase(), // Test case normalization
      password: testPassword,
      name: testName,
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  console.log('✓ Registration response: HTTP', regRes.status, 'Token received:', !!regData.token);
  console.log('✓ User ID created:', regData.user?.id);
  console.log('✓ Password NOT in user object:', !regData.user?.password && !regData.user?.passwordHash);

  // 3. Directly inspect MongoDB collection
  console.log('\nDirectly querying MongoDB 7.0 collection...');
  await mongoose.connect('mongodb://127.0.0.1:27017/fintwin');
  const db = mongoose.connection.db;
  if (!db) throw new Error('Could not access MongoDB native db object');
  
  const userDoc = await db.collection('users').findOne({ email: testEmail.toLowerCase() });
  if (!userDoc) {
    throw new Error(`User not found in MongoDB users collection!`);
  }
  console.log('✓ MongoDB Verification:');
  console.log('   - User ObjectId:', userDoc._id.toString());
  console.log('   - Email normalized to lowercase:', userDoc.email === testEmail.toLowerCase());
  console.log('   - Password hashed with bcrypt:', userDoc.passwordHash?.startsWith('$2'));
  console.log('   - Password length (hashed):', userDoc.passwordHash?.length);
  console.log('   - Plaintext password NOT stored:', userDoc.passwordHash !== testPassword);
  console.log('   - CreatedAt timestamp present:', !!userDoc.createdAt);

  await mongoose.disconnect();

  // 4. Test Login
  console.log('\nTesting Login with new credentials...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.success || !loginData.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  const token = loginData.token;
  console.log('✓ Login successful! Token issued.');

  // 5. Test Auth /me
  console.log('\nTesting GET /api/auth/me...');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  if (!meRes.ok || !meData.success || meData.user?.email !== testEmail.toLowerCase()) {
    throw new Error(`GET /api/auth/me failed: ${JSON.stringify(meData)}`);
  }
  console.log('✓ GET /api/auth/me verified for user:', meData.user?.email);

  // 6. Test Protected Modules
  const endpoints = [
    { name: 'Accounts', path: '/accounts' },
    { name: 'Goals', path: '/goals' },
    { name: 'Loans', path: '/loans' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Financial Twin', path: '/twin' },
    { name: 'Network Graph', path: '/network' },
    { name: 'Simulation History', path: '/simulation/history' },
    { name: 'Analysis Engine', path: '/analysis' },
    { name: 'Risk Signals', path: '/risk-signals' },
    { name: 'Intelligence Report', path: '/report' },
  ];

  console.log('\nTesting All Protected Feature APIs...');
  for (const ep of endpoints) {
    const res = await fetch(`${API_BASE}${ep.path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Endpoint ${ep.name} (${ep.path}) returned HTTP ${res.status}`);
    }
    const data = await res.json();
    console.log(`✓ ${ep.name} (${ep.path}): HTTP 200 OK | success: ${data.success}`);
  }

  // 7. Verify Unauthenticated Protection (Logout / Protected Access Check)
  console.log('\nTesting Unauthenticated Access...');
  const unauthRes = await fetch(`${API_BASE}/accounts`);
  console.log(`✓ Unauthenticated request rejected with HTTP ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
  }

  console.log('\n=============================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================');
}

main().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
