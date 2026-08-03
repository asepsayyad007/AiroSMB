/**
 * DIDL-Lite XML Generator for UPnP ContentDirectory
 * Enriched with DLNA-required metadata: duration, bitrate, resolution, audio info
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
      xml += `    <upnp:storageUsed>-1</upnp:storageUsed>\n`;
      xml += `  </container>\n`;
    } else {
      // Item
      const streamUrl = `${baseUrl}/api/files/stream?path=${encodeURIComponent(obj.fullPath)}`;
      const thumbnailUrl = `${baseUrl}/api/thumbnail?path=${encodeURIComponent(obj.fullPath)}`;

      // Build <res> attributes — only include fields that have values
      let resAttribs = `protocolInfo="${escapeXmlAttr(obj.protocolInfo)}" size="${obj.sizeBytes}"`;
      if (obj.duration) resAttribs += ` duration="${escapeXmlAttr(obj.duration)}"`;
      if (obj.resolution) resAttribs += ` resolution="${escapeXmlAttr(obj.resolution)}"`;
      if (obj.bitrate) resAttribs += ` bitrate="${Math.round(obj.bitrate / 8)}"`;       // DLNA bitrate is in bytes/sec
      if (obj.nrAudioChannels) resAttribs += ` nrAudioChannels="${obj.nrAudioChannels}"`;
      if (obj.sampleFrequency) resAttribs += ` sampleFrequency="${obj.sampleFrequency}"`;

      const displayTitle = obj.displayTitle || obj.title;

      xml += `  <item id="${escapeXmlAttr(obj.id)}" parentID="${escapeXmlAttr(obj.parentId)}" restricted="1">\n`;
      xml += `    <dc:title>${escapeXmlAttr(displayTitle)}</dc:title>\n`;
      xml += `    <upnp:class>${obj.upnpClass}</upnp:class>\n`;
      xml += `    <res ${resAttribs}>${escapeXmlAttr(streamUrl)}</res>\n`;
      xml += `  </item>\n`;
    }
  }

  xml += `</DIDL-Lite>`;
  return xml;
}

export default generateDidlXml;

