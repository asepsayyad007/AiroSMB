import net from 'net';
import http from 'http';

const BASE_URL = 'http://127.0.0.1:3000';
const SMB_PORT = 4450;

function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 Starting AiroSMB Automated Verification Suite');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Network Info API
  try {
    const res = await makeRequest('/api/network/info');
    const json = JSON.parse(res.body);
    if (res.statusCode === 200 && json.primaryIp && json.qrDataUrl) {
      console.log('✅ TEST 1 PASSED: Network Info API (IP:', json.primaryIp, '| Server URL:', json.serverUrl, ')');
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED: Invalid network info response');
      failed++;
    }
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err.message);
    failed++;
  }

  // Test 2: Browse Files API
  try {
    const res = await makeRequest('/api/files/browse');
    const json = JSON.parse(res.body);
    if (res.statusCode === 200 && Array.isArray(json.files) && Array.isArray(json.directories)) {
      console.log('✅ TEST 2 PASSED: File Explorer API (Path:', json.currentPath, '| Directories:', json.directories.length, '| Files:', json.files.length, ')');
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Invalid browse response');
      failed++;
    }
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err.message);
    failed++;
  }

  // Test 3: M3U Playlist API for VLC
  try {
    const res = await makeRequest('/playlist.m3u');
    if (res.statusCode === 302 || res.statusCode === 200) {
      console.log('✅ TEST 3 PASSED: VLC M3U Playlist Shortcut (/playlist.m3u)');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: M3U Playlist error');
      failed++;
    }
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err.message);
    failed++;
  }

  // Test 4: SMB Status API
  try {
    const res = await makeRequest('/api/smb/status');
    const json = JSON.parse(res.body);
    if (res.statusCode === 200 && json.isRunning && json.anonymousAuth) {
      console.log('✅ TEST 4 PASSED: Native SMB Status API (Port:', json.port, '| Anonymous Auth:', json.anonymousAuth, ')');
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED: SMB Status invalid');
      failed++;
    }
  } catch (err) {
    console.error('❌ TEST 4 FAILED:', err.message);
    failed++;
  }

  // Test 5: Native TCP SMB Socket Connection
  await new Promise((resolve) => {
    const client = net.connect({ port: SMB_PORT, host: '127.0.0.1' }, () => {
      console.log(`✅ TEST 5 PASSED: Native TCP SMB Socket connected successfully on Port ${SMB_PORT}`);
      passed++;
      client.end();
      resolve();
    });
    client.on('error', (err) => {
      console.error('❌ TEST 5 FAILED: SMB Socket error:', err.message);
      failed++;
      resolve();
    });
  });

  console.log('\n==================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
