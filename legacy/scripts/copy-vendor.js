// Copies browser libraries from node_modules into app/static/js/vendor.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "..", "app", "static", "js", "vendor");
fs.mkdirSync(out, { recursive: true });
const files = {
  "htmx.min.js": "node_modules/htmx.org/dist/htmx.min.js",
  "html5-qrcode.min.js": "node_modules/html5-qrcode/html5-qrcode.min.js",
};
for (const [name, src] of Object.entries(files)) {
  fs.copyFileSync(path.join(__dirname, "..", src), path.join(out, name));
  console.log("copied", name);
}
