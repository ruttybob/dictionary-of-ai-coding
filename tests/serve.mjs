// Tiny static file server for the graph site, used by the Playwright smoke.
// Serves site/ on localhost:PORT. No deps — node:http + node:fs only.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const PORT = Number(process.env.PORT) || 4317;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = join(ROOT, normalize(path === "/" ? "/index.html" : path));
    if (!file.startsWith(ROOT)) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    const body = await readFile(file);
    res.setHeader(
      "Content-Type",
      TYPES[extname(file)] ?? "application/octet-stream"
    );
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
}).listen(PORT, () => {
  console.log(`graph site on http://localhost:${PORT}`);
});
