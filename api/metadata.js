const { fetchPublicResource, parsePublicUrl } = require("../lib/public-fetch");

module.exports = async function metadataHandler(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });
  const requestUrl = new URL(request.url, "http://localhost");
  const target = parsePublicUrl(requestUrl.searchParams.get("url"));
  if (!target) return sendJson(response, 400, { error: "Invalid public URL" });

  try {
    const page = await fetchPublicResource(target.href, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        accept: "text/html,application/xhtml+xml"
      }
    }, 1_500_000);
    if (!page.ok) throw new Error(`HTTP ${page.status}`);
    const contentType = page.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) throw new Error("Not HTML");
    const html = page.buffer.toString("utf8");
    const title = firstMeta(html, ["og:title", "twitter:title"]) || matchTitle(html);
    const rawImage = firstMeta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
    let image = "";
    if (rawImage) {
      try {
        const resolved = new URL(decodeEntities(rawImage), page.finalUrl);
        if (parsePublicUrl(resolved.href)) image = resolved.href;
      } catch {}
    }
    return sendJson(response, 200, { title: decodeEntities(title || "").trim(), image, resolvedUrl: page.finalUrl });
  } catch {
    return sendJson(response, 200, { title: "", image: "", resolvedUrl: target.href });
  }
};

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

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}
