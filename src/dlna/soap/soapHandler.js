/**
 * SOAP Envelope Response Generator for UPnP Services
 */

export function buildSoapResponse(serviceUrn, actionName, innerXml) {
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
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
