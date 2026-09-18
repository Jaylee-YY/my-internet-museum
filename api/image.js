const { fetchPublicResource, parsePublicUrl } = require("../lib/public-fetch");

module.exports = async function imageHandler(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });
  const requestUrl = new URL(request.url, "http://localhost");
  const target = parsePublicUrl(requestUrl.searchParams.get("url"));
  if (!target) return sendJson(response, 400, { error: "Invalid image URL" });

  try {
    const image = await fetchPublicResource(target.href, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        referer: `${target.protocol}//${target.host}/`
      }
    }, 4_000_000);
    const contentType = (image.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
    if (!image.ok || !allowedTypes.has(contentType)) throw new Error("Not a supported image");
    response.statusCode = 200;
    response.setHeader("content-type", contentType);
    response.setHeader("cache-control", "public, max-age=86400");
    response.setHeader("content-length", image.buffer.length);
    return response.end(image.buffer);
  } catch {
    return sendJson(response, 404, { error: "Image unavailable" });
  }
};

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
}
