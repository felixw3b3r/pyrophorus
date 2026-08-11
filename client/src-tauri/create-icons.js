const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 solid purple PNG header + IDAT + IEND
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal 1x1 ICO container wrapping PNG
const icoHeader = Buffer.from([
  0, 0, // Reserved
  1, 0, // Type 1 (ICO)
  1, 0, // Image count 1
  1, // Width 1
  1, // Height 1
  0, // Color count 0
  0, // Reserved
  1, 0, // Color planes 1
  32, 0, // Bits per pixel 32
  png1x1.length & 0xff, (png1x1.length >> 8) & 0xff, 0, 0, // Size
  22, 0, 0, 0 // Offset 22
]);

const icoData = Buffer.concat([icoHeader, png1x1]);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), png1x1);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png1x1);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png1x1);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), png1x1);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoData);

console.log('Icons generated successfully in', iconsDir);
