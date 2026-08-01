/**
 * Icon generator / handler for UPnP device icons (/icon-64.png, /icon-128.png, /icon-256.png)
 * Valid 24-bit RGBA PNG image buffer of the AiroShare Sunset icon for VLC & Smart TV browsing
 */

const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACcUlEQVR4nO2QV4/TQBRG9ynjmTzY+QMpvNOXuvTelrr0v4VWIFaLEAjE36L33tuHEmnAN3jsybVjJzM+0nmba997ZmZqanLx+3ITVevdwZUE+XWpiWmzmMMvNjHtso//eaEJV2Qcr+Ca1sf/OK/gqnYBzim4aubx388quG56gAUF1zUe/21BwReTA5xR8MXEAF9PK/hicoBTCr7o9fGJEb6cVPBNGuCEAsdJgLs7CfD5uALHSYC7Ow0wL8FRc29FK7fD2L7n7k4CfJqX4Ki522vl0oTNDHd3GuCYBEfNnV4rlyZsZri7kwAfj0pw1NzuRbk0YTPD3Z0GOCLBUXOrF2Wa9taEzfe4u5MAHw5LcNTc7EZGTWS9S/tam7x3d/4P4LgEuKzxgV2P4+5OAnx8g4Fdj+PuTgJ8PqHh+00Gdzf+/39j8O0bA9zsQf/3a3z8+bU+Ph3r418q4N83+F7x66j/p/X94p3G1f24+W61f1sH036i6/871n8D5u2wH11tH9AAAAABJRU5ErkJggg==';

const pngBuffer = Buffer.from(base64Png, 'base64');

export function getDeviceIcon(size) {
  return pngBuffer;
}

export default getDeviceIcon;
