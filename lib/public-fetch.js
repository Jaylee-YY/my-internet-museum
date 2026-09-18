const dns = require("dns").promises;
const net = require("net");

function parsePublicUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.port && !["80", "443"].includes(parsed.port)) return null;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0") return null;
    if (net.isIP(host) && isPrivateIp(host)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function assertPublicDestination(parsed) {
  const host = parsed.hostname.toLowerCase();
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Private destination");
    return;
  }
  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("Private destination");
}

async function fetchPublicResource(value, options = {}, maxBytes = 1_500_000, maxRedirects = 4) {
  let target = parsePublicUrl(value);
  if (!target) throw new Error("Invalid public URL");

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    await assertPublicDestination(target);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9_000);
    try {
      const response = await fetch(target.href, { ...options, redirect: "manual", signal: controller.signal });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirect === maxRedirects) throw new Error("Too many redirects");
        target = parsePublicUrl(new URL(location, target).href);
        if (!target) throw new Error("Invalid redirect");
        continue;
      }

      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength && declaredLength > maxBytes) throw new Error("Response too large");
      const buffer = await readLimitedBody(response, maxBytes);
      return { status: response.status, ok: response.ok, headers: response.headers, buffer, finalUrl: target.href };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Request failed");
}

async function readLimitedBody(response, maxBytes) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Response too large");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function isPrivateIp(host) {
  const value = String(host).toLowerCase();
  if (value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")) return true;
  const ipv4 = value.startsWith("::ffff:") ? value.slice(7) : value;
  const parts = ipv4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] >= 224;
}

module.exports = { fetchPublicResource, parsePublicUrl };
