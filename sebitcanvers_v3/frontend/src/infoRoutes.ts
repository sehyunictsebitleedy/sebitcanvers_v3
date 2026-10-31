export const infoPages = { service: "서비스 안내", terms: "이용약관", privacy: "개인정보처리방침" } as const;
export type InfoPageId = keyof typeof infoPages;
export function infoPageFromHash(hash: string): InfoPageId | null {
  const key = hash.replace(/^#info\//, "");
  return hash.startsWith("#info/") && Object.hasOwn(infoPages, key) ? key as InfoPageId : null;
}
