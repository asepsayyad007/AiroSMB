import fs from 'fs';
import path from 'path';

// Read AiroShare.svg file
const svgPath = path.join(process.cwd(), 'AiroShare.svg');
let svgContent = '';
if (fs.existsSync(svgPath)) {
  svgContent = fs.readFileSync(svgPath, 'utf8');
}

/**
 * Returns UPnP Device Icon buffer
 */
export function getDeviceIcon(size) {
  if (fs.existsSync(svgPath)) {
    return fs.readFileSync(svgPath);
  }
  return Buffer.from(svgContent);
}

export default getDeviceIcon;
