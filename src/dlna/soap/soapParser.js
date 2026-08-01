/**
 * Simple Lightweight SOAP Body & Action Parser for UPnP Control Requests
 */

export function parseSoapRequest(xmlBody = '') {
  try {
    const actionMatch = xmlBody.match(/<u:([A-Za-z0-9]+)\s+xmlns:u="([^"]+)"/i) || xmlBody.match(/<u:([A-Za-z0-9]+)/i);
    const actionName = actionMatch ? actionMatch[1] : null;

    const parseArg = (argName) => {
      const regex = new RegExp(`<${argName}[^>]*>([^<]*)</${argName}>`, 'i');
      const match = xmlBody.match(regex);
      return match ? match[1].trim() : null;
    };

    return {
      actionName,
      objectId: parseArg('ObjectID') || '0',
      browseFlag: parseArg('BrowseFlag') || 'BrowseDirectChildren',
      startingIndex: parseInt(parseArg('StartingIndex') || '0', 10),
      requestedCount: parseInt(parseArg('RequestedCount') || '0', 10),
      sortCriteria: parseArg('SortCriteria') || '',
      filter: parseArg('Filter') || '*'
    };
  } catch (err) {
    console.error('[SOAP Parser Error]', err);
    return { actionName: null, objectId: '0', browseFlag: 'BrowseDirectChildren', startingIndex: 0, requestedCount: 0 };
  }
}

export default parseSoapRequest;
