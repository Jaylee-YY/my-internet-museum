const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (requestUrl.pathname === "/api/metadata") return handleMetadata(requestUrl, response);
    if (requestUrl.pathname === "/api/image") return handleImage(requestUrl, response);
    return serveStatic(requestUrl.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: "Server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`My Internet Museum running at http://127.0.0.1:${PORT}`);
});

async function handleMetadata(requestUrl, response) {
  const target = parsePublicUrl(requestUrl.searchParams.get("url"));
  if (!target) return sendJson(response, 400, { error: "Invalid public URL" });

  try {
    const page = await fetchWithLimit(target.href, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        accept: "text/html,application/xhtml+xml"
      }
    }, 1_500_000);
    if (!page.ok) throw new Error(`HTTP ${page.status}`);
    const contentType = page.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) throw new Error("Not HTML");
    const html = (await page.text()).slice(0, 1_500_000);
    const finalUrl = page.url || target.href;
    const title = firstMeta(html, ["og:title", "twitter:title"]) || matchTitle(html);
    const rawImage = firstMeta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
    let image = "";
    if (rawImage) {
      try {
        const resolved = new URL(decodeEntities(rawImage), finalUrl);
        if (parsePublicUrl(resolved.href)) image = resolved.href;
      } catch {}
    }
    sendJson(response, 200, { title: decodeEntities(title || "").trim(), image, resolvedUrl: finalUrl });
  } catch {
    sendJson(response, 200, { title: "", image: "", resolvedUrl: target.href });
  }
}

async function handleImage(requestUrl, response) {
  const target = parsePublicUrl(requestUrl.searchParams.get("url"));
  if (!target) return sendJson(response, 400, { error: "Invalid image URL" });

  try {
    const imageResponse = await fetchWithLimit(target.href, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        referer: `${target.protocol}//${target.host}/`
      }
    }, 8_000_000);
    const contentType = imageResponse.headers.get("content-type") || "";
    if (!imageResponse.ok || !contentType.startsWith("image/")) throw new Error("Not an image");
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    response.writeHead(200, {
      "content-type": contentType,
      "cache-control": "public, max-age=86400",
      "content-length": buffer.length
    });
    response.end(buffer);
  } catch {
    sendJson(response, 404, { error: "Image unavailable" });
  }
}

async function fetchWithLimit(url, options, maxBytes) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const result = await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
    const length = Number(result.headers.get("content-length") || 0);
    if (length && length > maxBytes) throw new Error("Response too large");
    return result;
  } finally {
    clearTimeout(timer);
  }
}

function parsePublicUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0") return null;
    if (net.isIP(host) && isPrivateIp(host)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isPrivateIp(host) {
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  const parts = host.split(".").map(Number);
  if (parts.length !== 4) return false;
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

function firstMeta(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i")
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }
  }
  return "";
}

function matchTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function serveStatic(urlPath, response) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.resolve(ROOT, `.${decodeURIComponent(requested)}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) return sendText(response, 403, "Forbidden");
  fs.readFile(filePath, (error, data) => {
    if (error) return sendText(response, 404, "Not found");
    response.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-cache"
    });
    response.end(data);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function sendText(response, status, body) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
}
