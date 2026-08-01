import http from 'http';

const BASE_URL = 'http://localhost:3000';

function getUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

function postSoap(path, actionUrn, actionName, soapBody) {
  return new Promise((resolve, reject) => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${actionName} xmlns:u="${actionUrn}">
${soapBody}
    </u:${actionName}>
  </s:Body>
</s:Envelope>`;

    const req = http.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'SOAPACTION': `"${actionUrn}#${actionName}"`,
        'Content-Length': Buffer.byteLength(xml)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(xml);
    req.end();
  });
}

async function verifyCompleteDlna() {
  console.log('\n==================================================');
  console.log('📡 Verifying Complete DLNA / UPnP AV Spec Suite');
  console.log('==================================================\n');

  let passed = 0;

  // Test 1: Device Description XML
  try {
    const res = await getUrl('/dlna/description.xml');
    if (res.statusCode === 200 && res.data.includes('AiroSMB Media Server') && res.data.includes('urn:schemas-upnp-org:device:MediaServer:1')) {
      console.log('✅ TEST 1 PASSED: Device Description XML (/dlna/description.xml)');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err.message);
  }

  // Test 2: ContentDirectory SCPD XML
  try {
    const res = await getUrl('/dlna/scpd/contentDirectory.xml');
    if (res.statusCode === 200 && res.data.includes('GetSearchCapabilities') && res.data.includes('Browse')) {
      console.log('✅ TEST 2 PASSED: ContentDirectory SCPD XML (/dlna/scpd/contentDirectory.xml)');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err.message);
  }

  // Test 3: SOAP Browse Root Container (ObjectID = 0)
  try {
    const body = `<ObjectID>0</ObjectID><BrowseFlag>BrowseDirectChildren</BrowseFlag><Filter>*</Filter><StartingIndex>0</StartingIndex><RequestedCount>0</RequestedCount><SortCriteria></SortCriteria>`;
    const res = await postSoap('/dlna/control/contentDirectory', 'urn:schemas-upnp-org:service:ContentDirectory:1', 'Browse', body);
    if (res.statusCode === 200 && res.data.includes('BrowseResponse') && res.data.includes('DIDL-Lite')) {
      console.log('✅ TEST 3 PASSED: SOAP Browse Root Container (ObjectID = 0)');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err.message);
  }

  // Test 4: SOAP Browse Movies Container (ObjectID = 0/movies)
  try {
    const body = `<ObjectID>0/movies</ObjectID><BrowseFlag>BrowseDirectChildren</BrowseFlag><Filter>*</Filter><StartingIndex>0</StartingIndex><RequestedCount>0</RequestedCount><SortCriteria></SortCriteria>`;
    const res = await postSoap('/dlna/control/contentDirectory', 'urn:schemas-upnp-org:service:ContentDirectory:1', 'Browse', body);
    if (res.statusCode === 200 && res.data.includes('BrowseResponse')) {
      console.log('✅ TEST 4 PASSED: SOAP Browse Movies Container (ObjectID = 0/movies)');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 4 FAILED:', err.message);
  }

  // Test 5: Device Icon PNG
  try {
    const res = await getUrl('/icon-64.png');
    if (res.statusCode === 200 && res.headers['content-type'] === 'image/png') {
      console.log('✅ TEST 5 PASSED: UPnP Device Icon PNG (/icon-64.png)');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 5 FAILED:', err.message);
  }

  // Test 6: Presentation Page HTML
  try {
    const res = await getUrl('/dlna/presentation');
    if (res.statusCode === 200 && res.data.includes('AiroSMB DLNA')) {
      console.log('✅ TEST 6 PASSED: DLNA Presentation HTML Dashboard (/dlna/presentation)');
      passed++;
    }
  } catch (err) {
    console.error('❌ TEST 6 FAILED:', err.message);
  }

  console.log('\n==================================================');
  console.log(`🎉 COMPLETE DLNA SPEC VERIFICATION: ${passed}/6 PASSED`);
  console.log('==================================================\n');
}

verifyCompleteDlna();
