import { buildSoapResponse } from '../soap/soapHandler.js';

const SERVICE_URN = 'urn:schemas-upnp-org:service:AVTransport:1';

export class AvTransportService {
  async handleAction(actionName, parsedArgs, baseUrl) {
    switch (actionName) {
      case 'GetTransportInfo':
        const transportInfo = 
          `      <CurrentTransportState>NO_MEDIA_PRESENT</CurrentTransportState>\n` +
          `      <CurrentTransportStatus>OK</CurrentTransportStatus>\n` +
          `      <CurrentSpeed>1</CurrentSpeed>`;
        return buildSoapResponse(SERVICE_URN, 'GetTransportInfo', transportInfo);

      case 'GetMediaInfo':
        const mediaInfo = 
          `      <NrTracks>0</NrTracks>\n` +
          `      <MediaDuration>00:00:00</MediaDuration>\n` +
          `      <CurrentURI></CurrentURI>\n` +
          `      <CurrentURIMetaData></CurrentURIMetaData>\n` +
          `      <NextURI></NextURI>\n` +
          `      <NextURIMetaData></NextURIMetaData>\n` +
          `      <PlayMedium>NONE</PlayMedium>\n` +
          `      <RecordMedium>NONE</RecordMedium>\n` +
          `      <WriteStatus>NOT_WRITABLE</WriteStatus>`;
        return buildSoapResponse(SERVICE_URN, 'GetMediaInfo', mediaInfo);

      case 'GetPositionInfo':
        const posInfo = 
          `      <Track>0</Track>\n` +
          `      <TrackDuration>00:00:00</TrackDuration>\n` +
          `      <TrackMetaData></TrackMetaData>\n` +
          `      <TrackURI></TrackURI>\n` +
          `      <RelTime>00:00:00</RelTime>\n` +
          `      <AbsTime>00:00:00</AbsTime>\n` +
          `      <RelCount>0</RelCount>\n` +
          `      <AbsCount>0</AbsCount>`;
        return buildSoapResponse(SERVICE_URN, 'GetPositionInfo', posInfo);

      default:
        return buildSoapResponse(SERVICE_URN, actionName, '      <Status>OK</Status>');
    }
  }
}

export const avTransportService = new AvTransportService();
export default avTransportService;
