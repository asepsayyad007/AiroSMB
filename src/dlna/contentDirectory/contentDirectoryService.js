import mediaStore from './mediaStore.js';
import generateDidlXml from '../xml/didlGenerator.js';
import { buildSoapResponse, escapeXmlContent } from '../soap/soapHandler.js';

const SERVICE_URN = 'urn:schemas-upnp-org:service:ContentDirectory:1';

export class ContentDirectoryService {
  /**
   * Handle SOAP Control actions for ContentDirectory
   */
  async handleAction(actionName, parsedArgs, baseUrl) {
    switch (actionName) {
      case 'Browse':
        return this.handleBrowse(parsedArgs, baseUrl);

      case 'GetSearchCapabilities':
        return buildSoapResponse(SERVICE_URN, 'GetSearchCapabilities', '      <SearchCaps>dc:title,upnp:class</SearchCaps>');

      case 'GetSortCapabilities':
        return buildSoapResponse(SERVICE_URN, 'GetSortCapabilities', '      <SortCaps>dc:title</SortCaps>');

      case 'GetSystemUpdateID':
        return buildSoapResponse(SERVICE_URN, 'GetSystemUpdateID', '      <Id>1</Id>');

      default:
        return buildSoapResponse(SERVICE_URN, actionName, '      <Result></Result>');
    }
  }

  handleBrowse(args, baseUrl) {
    const { objectId, browseFlag, startingIndex, requestedCount } = args;
    const targetObj = mediaStore.getObject(objectId);

    if (!targetObj) {
      const emptyDidl = generateDidlXml([], baseUrl);
      const inner = `      <Result>${escapeXmlContent(emptyDidl)}</Result>\n      <NumberReturned>0</NumberReturned>\n      <TotalMatches>0</TotalMatches>\n      <UpdateID>1</UpdateID>`;
      return buildSoapResponse(SERVICE_URN, 'Browse', inner);
    }

    let resultItems = [];
    let totalMatches = 0;

    if (browseFlag === 'BrowseMetadata') {
      resultItems = [targetObj.data];
      totalMatches = 1;
    } else {
      // BrowseDirectChildren
      const children = mediaStore.getChildren(objectId, startingIndex, requestedCount);
      resultItems = children;
      totalMatches = targetObj.data.childCount || children.length;
    }

    const didlXml = generateDidlXml(resultItems, baseUrl);
    const escapedDidl = escapeXmlContent(didlXml);

    const innerXml = 
      `      <Result>${escapedDidl}</Result>\n` +
      `      <NumberReturned>${resultItems.length}</NumberReturned>\n` +
      `      <TotalMatches>${totalMatches}</TotalMatches>\n` +
      `      <UpdateID>1</UpdateID>`;

    return buildSoapResponse(SERVICE_URN, 'Browse', innerXml);
  }
}

export const contentDirectoryService = new ContentDirectoryService();
export default contentDirectoryService;
