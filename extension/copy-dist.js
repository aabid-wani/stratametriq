const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../dashboard/dist');
const dest = path.join(__dirname, 'dashboard-dist');

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.cpSync(src, dest, { recursive: true });
console.log('Copied dashboard/dist to extension/dashboard-dist');
