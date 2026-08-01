/**
 * DIDL-Lite XML Generator for UPnP ContentDirectory
 */

function escapeXmlAttr(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateDidlXml(itemsOrContainers, baseUrl) {
  let xml = `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:dlna="urn:schemas-dlna-org:metadata-1-0/">\n`;

  for (const obj of itemsOrContainers) {
    if (obj.childrenIds !== undefined) {
      // Container
      xml += `  <container id="${escapeXmlAttr(obj.id)}" parentID="${escapeXmlAttr(obj.parentId)}" restricted="1" childCount="${obj.childCount}">\n`;
      xml += `    <dc:title>${escapeXmlAttr(obj.title)}</dc:title>\n`;
      xml += `    <upnp:class>${obj.upnpClass}</upnp:class>\n`;
      xml += `  </container>\n`;
    } else {
      // Item
      const streamUrl = `${baseUrl}/api/files/stream?path=${encodeURIComponent(obj.fullPath)}`;

      xml += `  <item id="${escapeXmlAttr(obj.id)}" parentID="${escapeXmlAttr(obj.parentId)}" restricted="1">\n`;
      xml += `    <dc:title>${escapeXmlAttr(obj.title)}</dc:title>\n`;
      xml += `    <upnp:class>${obj.upnpClass}</upnp:class>\n`;
      xml += `    <res protocolInfo="${escapeXmlAttr(obj.protocolInfo)}" size="${obj.sizeBytes}">${escapeXmlAttr(streamUrl)}</res>\n`;
      xml += `  </item>\n`;
    }
  }

  xml += `</DIDL-Lite>`;
  return xml;
}

export default generateDidlXml;
