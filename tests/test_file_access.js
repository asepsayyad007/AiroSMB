import http from 'http';

const BASE_URL = 'http://localhost:3000';

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function fetchStreamRange(filePath, rangeHeader) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/api/files/stream?path=${encodeURIComponent(filePath)}`;
    const options = {
      headers: { 'Range': rangeHeader }
    };
    http.get(url, options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bytesReceived: buffer.length,
          sampleHex: buffer.slice(0, 16).toString('hex')
        });
      });
    }).on('error', reject);
  });
}

async function runFileAccessTest() {
  console.log('\n==================================================');
  console.log('📂 AiroSMB Shared Folder File Access Test');
  console.log('==================================================\n');

  try {
    // Step 1: Browse shared folder
    const browseData = await fetchJson('/api/files/browse');
    console.log(`📍 Current Root Directory: ${browseData.currentPath}`);
    console.log(`📁 Folders found: ${browseData.directories.length}`);
    console.log(`📄 Files found: ${browseData.files.length}\n`);

    if (browseData.files.length === 0) {
      console.log('⚠️ No files found directly in root Downloads folder to stream.');
      return;
    }

    // Step 2: Pick the first available file
    const sampleFile = browseData.files[0];
    console.log('🎯 Testing File Stream Access on:');
    console.log(`   - Name: ${sampleFile.name}`);
    console.log(`   - Path: ${sampleFile.path}`);
    console.log(`   - Category: ${sampleFile.category}`);
    console.log(`   - Size: ${(sampleFile.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - MIME Type: ${sampleFile.mimeType}\n`);

    // Step 3: Test HTTP Range Request (Partial Content Streaming for VLC/HTML5 player)
    console.log('🌊 Sending HTTP Range Request (bytes=0-512)...');
    const rangeRes = await fetchStreamRange(sampleFile.path, 'bytes=0-512');

    console.log(`   - HTTP Status Code: ${rangeRes.statusCode} (${rangeRes.statusCode === 206 ? '206 Partial Content Success' : 'OK'})`);
    console.log(`   - Content-Range: ${rangeRes.headers['content-range']}`);
    console.log(`   - Content-Type: ${rangeRes.headers['content-type']}`);
    console.log(`   - Bytes Delivered: ${rangeRes.bytesReceived} bytes`);
    console.log(`   - Binary Header Sample: 0x${rangeRes.sampleHex}\n`);

    if (rangeRes.statusCode === 206 || rangeRes.statusCode === 200) {
      console.log('==================================================');
      console.log('✅ FILE ACCESS TEST PASSED: Shared file successfully read & streamed!');
      console.log('==================================================\n');
    } else {
      console.error('❌ FILE ACCESS TEST FAILED: Unexpected status code', rangeRes.statusCode);
    }

  } catch (err) {
    console.error('❌ FILE ACCESS TEST ERROR:', err.message);
  }
}

runFileAccessTest();
