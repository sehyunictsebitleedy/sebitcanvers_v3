import { isIP } from "node:net";
import { ApiError } from "./generate";

export function normalizeIp(value: string): string | null {
  if (isIP(value) === 4) return value;
  if (isIP(value) !== 6) return null;
  try {
    const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
    const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(normalized);
    if (!mapped) return normalized;
    const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  } catch { return null; }
}

// One trusted proxy must OVERWRITE X-Forwarded-For with a single client IP.
// Proxy chains and arbitrary forwarded headers are intentionally unsupported.
export function clientIpResolver(proxies: string[] = []) {
  const trusted = new Set(proxies.map(value => {
    const ip = normalizeIp(value);
    if (!ip) throw new Error("AI_TRUSTED_PROXIES must contain exact IP addresses");
    return ip;
  }));
  return (req: { socket: { remoteAddress?: string }; headers: Record<string, string | string[] | undefined> }) => {
    const peer = normalizeIp(req.socket.remoteAddress ?? "") ?? "unknown";
    if (!trusted.has(peer)) return peer;
    const forwarded = req.headers["x-forwarded-for"];
    const client = typeof forwarded === "string" ? normalizeIp(forwarded.trim()) : null;
    if (!client) throw new ApiError(400, "INVALID_FORWARDED_FOR", "프록시의 접속 주소 전달 설정을 확인해 주세요.");
    return client;
  };
}
