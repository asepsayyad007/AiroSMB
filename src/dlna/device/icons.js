/**
 * Icon generator / handler for UPnP device icons (/icon-64.png, /icon-128.png, /icon-256.png)
 */

// Valid PNG Header + IHDR + IDAT + IEND buffer representing a clean cyan/blue AiroSMB icon
const base64Png64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACJSURBVHic7c4BDQAACAMg+5d2ijEZmIDcsw5ERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERET0XgGf1AFT2L2mFAAAAABJRU5ErkJggg==';

const pngBuffer = Buffer.from(base64Png64, 'base64');

export function getDeviceIcon(size) {
  return pngBuffer;
}

export default getDeviceIcon;
