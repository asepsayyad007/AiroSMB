import fs from 'fs';
import path from 'path';

// Create a basic config.json for node-smb-server
const smbConfig = {
  "domain": "AIROSMB",
  "netbiosName": "AIROSMB",
  "tcpPort": 4450,
  "smbPort": 4450,
  "shares": {
    "AiroSMB": {
      "backend": "fs",
      "description": "AiroSMB Shared Downloads Directory",
      "path": "C:\\Users\\aseps\\Downloads"
    }
  },
  "users": {
    "guest": {
      "password": "",
      "guest": true
    }
  }
};

fs.writeFileSync('config.json', JSON.stringify(smbConfig, null, 2));
console.log('Created config.json for node-smb-server');
