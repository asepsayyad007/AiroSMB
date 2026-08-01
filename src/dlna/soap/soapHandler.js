/**
 * SOAP Envelope Response Generator for UPnP Services
 * Compliant with UPnP Device Architecture 1.0 (Document style, no s:encodingStyle)
 */

export function buildSoapResponse(serviceUrn, actionName, innerXml) {
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:${actionName}Response xmlns:u="${serviceUrn}">
${innerXml}
    </u:${actionName}Response>
  </s:Body>
</s:Envelope>`;
}

export function escapeXmlContent(xml) {
  return xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
