import fs from 'fs';

const smbConfig = {
  "listen": {
    "port": 4450,
    "host": "0.0.0.0"
  },
  "domainName": "AIROSMB",
  "allowAnonymous": true,
  "smb2Support": true,
  "extendedSecurity": false,
  "shares": {
    "AiroSMB": {
      "backend": "fs",
      "description": "AiroSMB Downloads Shared Directory",
      "path": "C:\\Users\\aseps\\Downloads"
    }
  }
};

fs.writeFileSync('config.json', JSON.stringify(smbConfig, null, 2));
console.log('Written config.json for SMB Server listening on port 4450');

import SMBServer from 'node-smb-server';
console.log('SMB Server module loaded');
