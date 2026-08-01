import { buildSoapResponse } from '../soap/soapHandler.js';
import dlnaConfig from '../../../config/dlna.js';

const SERVICE_URN = 'urn:schemas-upnp-org:service:ConnectionManager:1';

export class ConnectionManagerService {
  async handleAction(actionName, parsedArgs, baseUrl) {
    switch (actionName) {
      case 'GetProtocolInfo':
        const sinks = '';
        const sources = Object.values(dlnaConfig.mimeProtocolInfoMap).map(p => `http-get:*:${p}`).join(',');
        const inner = `      <Source>${sources}</Source>\n      <Sink>${sinks}</Sink>`;
        return buildSoapResponse(SERVICE_URN, 'GetProtocolInfo', inner);

      case 'GetCurrentConnectionIDs':
        return buildSoapResponse(SERVICE_URN, 'GetCurrentConnectionIDs', '      <ConnectionIDs>0</ConnectionIDs>');

      case 'GetCurrentConnectionInfo':
        const connInfo = 
          `      <RcsID>0</RcsID>\n` +
          `      <AVTransportID>0</AVTransportID>\n` +
          `      <ProtocolInfo>http-get:*:*:*</ProtocolInfo>\n` +
          `      <PeerConnectionManager></PeerConnectionManager>\n` +
          `      <PeerConnectionID>-1</PeerConnectionID>\n` +
          `      <Direction>Output</Direction>\n` +
          `      <Status>OK</Status>`;
        return buildSoapResponse(SERVICE_URN, 'GetCurrentConnectionInfo', connInfo);

      default:
        return buildSoapResponse(SERVICE_URN, actionName, '      <Status>OK</Status>');
    }
  }
}

export const connectionManagerService = new ConnectionManagerService();
export default connectionManagerService;
