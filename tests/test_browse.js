import http from 'http';

function testBrowse(objectId) {
  return new Promise((resolve) => {
    const postData = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
      <s:Body>
        <u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
          <ObjectID>${objectId}</ObjectID>
          <BrowseFlag>BrowseDirectChildren</BrowseFlag>
          <StartingIndex>0</StartingIndex>
          <RequestedCount>0</RequestedCount>
        </u:Browse>
      </s:Body>
    </s:Envelope>`;

    const req = http.request('http://127.0.0.1:3000/dlna/control/contentDirectory', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'SOAPACTION': '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const returnedMatch = data.match(/&lt;NumberReturned&gt;(\d+)&lt;\/NumberReturned&gt;/i) || data.match(/<NumberReturned>(\d+)<\/NumberReturned>/i);
        const count = returnedMatch ? returnedMatch[1] : 'Unknown';
        console.log(`ObjectID: "${objectId}" -> NumberReturned: ${count}`);
        resolve();
      });
    });

    req.write(postData);
    req.end();
  });
}

console.log('--- Testing UPnP Container Alias Browsing ---');
await testBrowse('0');
await testBrowse('1');
await testBrowse('0/all');
await testBrowse('0/movies');
await testBrowse('0/videos');
await testBrowse('video');
