import type { IncomingMessage } from "node:http";
import type { CmsStore } from "./cms";

export const masterCookieName = (origin: string, legacy = false) =>
  `${origin.startsWith("https:") ? "__Secure-" : ""}sebit_master${legacy ? "" : "_v2"}`;

export function masterToken(req: IncomingMessage, origin: string, allowLegacy = false) {
  const cookies = req.headers.cookie?.split(";").map(v => v.trim()) ?? [];
  for (const legacy of allowLegacy ? [false, true] : [false]) {
    const prefix = masterCookieName(origin, legacy) + "=";
    const found = cookies.find(v => v.startsWith(prefix));
    if (found) return found.slice(prefix.length);
  }
  return "";
}

export function isMaster(req: IncomingMessage, config: {origin: string; cms?: CmsStore}) {
  const token = masterToken(req, config.origin);
  return !!token && !!config.cms?.session(token);
}
