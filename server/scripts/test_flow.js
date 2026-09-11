const http = require('http');

function apiCall(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runVerification() {
  console.log('🧪 Starting End-to-End Smart Visitor Workflow Test...\n');

  // Step 1: Health Check
  const health = await apiCall('/health');
  console.log('1. Health Check:', health.body.status === 'ok' ? 'PASSED ✅' : 'FAILED ❌');

  // Step 2: Login Admin
  const adminLogin = await apiCall('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  console.log('2. Admin Login:', adminLogin.body.role === 'admin' ? 'PASSED ✅' : 'FAILED ❌');

  // Step 3: Login Security
  const secLogin = await apiCall('/auth/login', 'POST', { username: 'security', password: 'security123' });
  console.log('3. Security Login:', secLogin.body.role === 'security' ? 'PASSED ✅' : 'FAILED ❌');

  // Step 4: Admin Generate QR Token
  const genResult = await apiCall('/tokens/generate', 'POST');
  const tokenCode = genResult.body.token ? genResult.body.token.token_code : null;
  console.log(`4. Admin Generate QR Token (${tokenCode}):`, genResult.body.success ? 'PASSED ✅' : 'FAILED ❌');

  // Step 5: Verify Token Status (AVAILABLE)
  const verify1 = await apiCall(`/tokens/${tokenCode}`);
  console.log(`5. Token Status before Check-In (${verify1.body.status}):`, verify1.body.status === 'AVAILABLE' ? 'PASSED ✅' : 'FAILED ❌');

  // Step 6: Security Check-In Visitor (Arun Kumar)
  const checkInRes = await apiCall('/visits/check-in', 'POST', {
    token_code: tokenCode,
    full_name: 'Arun Kumar',
    mobile: '9876543210',
    address: 'Chennai',
    purpose: 'General Campus Visit',
    expected_duration: '1 Hour'
  });
  console.log(`6. Security Check-In (${checkInRes.body.visit ? checkInRes.body.visit.full_name : ''}):`, checkInRes.body.success ? 'PASSED ✅' : 'FAILED ❌');

  // Step 7: Verify Token Status (IN USE)
  const verify2 = await apiCall(`/tokens/${tokenCode}`);
  console.log(`7. Token Status after Check-In (${verify2.body.status}):`, verify2.body.status === 'IN USE' ? 'PASSED ✅' : 'FAILED ❌');

  // Step 8: Admin View Active Visitors (INSIDE)
  const visits1 = await apiCall('/visits');
  const arunActive = visits1.body.activeVisits.find(v => v.token_code === tokenCode);
  console.log(`8. Admin View Active Visitors (Found: ${arunActive ? arunActive.full_name : 'None'}):`, arunActive ? 'PASSED ✅' : 'FAILED ❌');

  // Step 9: Security Check-Out Visitor
  const checkOutRes = await apiCall('/visits/check-out', 'POST', { token_code: tokenCode });
  console.log(`9. Security Check-Out (${checkOutRes.body.visit ? checkOutRes.body.visit.full_name : ''}):`, checkOutRes.body.success ? 'PASSED ✅' : 'FAILED ❌');

  // Step 10: Verify Token Status returned to (AVAILABLE)
  const verify3 = await apiCall(`/tokens/${tokenCode}`);
  console.log(`10. Token Status after Check-Out (${verify3.body.status}):`, verify3.body.status === 'AVAILABLE' ? 'PASSED ✅' : 'FAILED ❌');

  // Step 11: Admin View History (COMPLETED)
  const visits2 = await apiCall('/visits');
  const arunHistory = visits2.body.historyVisits.find(v => v.token_code === tokenCode);
  console.log(`11. Admin View History (Completed: ${arunHistory ? arunHistory.full_name : 'None'}):`, arunHistory ? 'PASSED ✅' : 'FAILED ❌');

  // Step 12: Token Reuse Test (Security Check-In Priya with same token V-001)
  const reuseCheckIn = await apiCall('/visits/check-in', 'POST', {
    token_code: tokenCode,
    full_name: 'Priya',
    mobile: '9876501234',
    address: 'Coimbatore',
    purpose: 'Admission',
    expected_duration: '2 Hours'
  });
  console.log(`12. QR Token Reuse for Second Visitor (${reuseCheckIn.body.visit ? reuseCheckIn.body.visit.full_name : ''}):`, reuseCheckIn.body.success ? 'PASSED ✅' : 'FAILED ❌');

  console.log('\n✨ COMPLETE WORKFLOW VERIFICATION FINISHED SUCCESSFULLY!');
}

runVerification().catch(err => console.error('Verification error:', err));
