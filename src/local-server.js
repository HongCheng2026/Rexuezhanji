const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 8787);
const host = "127.0.0.1";
const types = {
  ".html": "text/html;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

process.on("uncaughtException", (error) => {
  fs.appendFileSync(path.join(__dirname, "local-static-server.error.log"), `${new Date().toISOString()} ${error.stack || error}\n`);
});

http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") {
    res.writeHead(302, { "Location": "/src/h5/Shell/index.html" });
    res.end();
    return;
  }
  const filePath = path.resolve(root, "." + urlPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("403");
    return;
  }
  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404);
      res.end("404");
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("404");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.end(data);
    });
  });
}).listen(port, host, () => {
  console.log(`H5 local server: http://${host}:${port}/src/h5/Shell/index.html`);
});
