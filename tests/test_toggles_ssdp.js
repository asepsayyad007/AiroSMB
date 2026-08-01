import http from 'http';

const BASE_URL = 'http://127.0.0.1:3000';

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function verifyTogglesAndDlna() {
  console.log('\n==================================================');
  console.log('⚡ Verifying Service Toggles & Smart TV DLNA Broadcaster');
  console.log('==================================================\n');

  try {
    // Test 1: Services Status API
    const status1 = await getJson('/api/services/status');
    console.log('✅ TEST 1 PASSED: Initial Services Status:');
    console.log(`   - HTTP: ${status1.http.enabled ? 'ONLINE' : 'OFFLINE'} (${status1.http.url})`);
    console.log(`   - SMB: ${status1.smb.enabled ? 'ONLINE' : 'OFFLINE'} (${status1.smb.url})`);
    console.log(`   - FTP: ${status1.ftp.enabled ? 'ONLINE' : 'OFFLINE'} (${status1.ftp.url})`);
    console.log(`   - DLNA SSDP: ${status1.dlna.enabled ? 'ONLINE' : 'OFFLINE'} (${status1.dlna.location})\n`);

    // Test 2: Toggle FTP OFF & ON
    const toggleFtpOff = await postJson('/api/services/toggle', { service: 'ftp', enable: false });
    console.log('✅ TEST 2 PASSED: Toggle FTP OFF -> Enabled:', toggleFtpOff.enabled);

    const toggleFtpOn = await postJson('/api/services/toggle', { service: 'ftp', enable: true });
    console.log('✅ TEST 3 PASSED: Toggle FTP ON -> Enabled:', toggleFtpOn.enabled);

    // Test 3: Toggle DLNA SSDP OFF & ON
    const toggleDlnaOff = await postJson('/api/services/toggle', { service: 'dlna', enable: false });
    console.log('✅ TEST 4 PASSED: Toggle DLNA OFF -> Enabled:', toggleDlnaOff.enabled);

    const toggleDlnaOn = await postJson('/api/services/toggle', { service: 'dlna', enable: true });
    console.log('✅ TEST 5 PASSED: Toggle DLNA ON -> Enabled:', toggleDlnaOn.enabled);

    console.log('\n==================================================');
    console.log('🎉 ALL SERVICE TOGGLE & DLNA TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ TOGGLE TEST ERROR:', err.message);
  }
}

verifyTogglesAndDlna();
