import http from 'http';
import net from 'net';

const BASE_URL = 'http://localhost:3000';

function getUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function verifyFtpAndPlex() {
  console.log('\n==================================================');
  console.log('⚡ Verifying FTP & Plex / DLNA Engine Integration');
  console.log('==================================================\n');

  let passed = 0;

  // Test 1: FTP Status API
  try {
    const res = await getUrl('/api/ftp/status');
    const json = JSON.parse(res.data);
    if (res.statusCode === 200 && json.isRunning) {
      console.log('✅ TEST 1 PASSED: FTP Server API Active (Port:', json.port, '| URL:', json.vlcFtpUrl, ')');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err.message);
  }

  // Test 2: Native FTP Socket Connection on Port 2121
  await new Promise((resolve) => {
    const client = net.connect({ port: 2121, host: '127.0.0.1' }, () => {
      console.log('✅ TEST 2 PASSED: Native FTP Server TCP Socket connected on Port 2121 (Anonymous Auth)');
      passed++;
      client.end();
      resolve();
    });
    client.on('error', (err) => {
      console.error('❌ TEST 2 FAILED:', err.message);
      resolve();
    });
  });

  // Test 3: Plex Media Feed API
  try {
    const res = await getUrl('/api/plex/feed');
    const json = JSON.parse(res.data);
    if (res.statusCode === 200 && Array.isArray(json.items)) {
      console.log('✅ TEST 3 PASSED: Plex Media Feed API (Total Media Items:', json.totalMediaItems, ')');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err.message);
  }

  // Test 4: DLNA Device XML
  try {
    const res = await getUrl('/dlna/device.xml');
    if (res.statusCode === 200 && res.data.includes('MediaServer')) {
      console.log('✅ TEST 4 PASSED: UPnP / DLNA Device XML Description (/dlna/device.xml)');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 4 FAILED:', err.message);
  }

  console.log('\n==================================================');
  console.log(`🎉 VERIFICATION RESULT: ${passed}/4 PASSED`);
  console.log('==================================================\n');
}

verifyFtpAndPlex();
