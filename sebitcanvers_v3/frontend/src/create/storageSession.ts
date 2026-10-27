import { cleanupImages } from "./cleanupImages";

const lockName = "sebit-storage-session-v1";
const requestKey = "sebit-image-cleanup-request-v1";
let cleanupNotice = "";
export const takeCleanupNotice = () => cleanupNotice;
export function requestImageCleanup() {
  sessionStorage.setItem(requestKey, "requested");
  window.location.reload();
}

// Every mounted app holds a shared lock. Cleanup runs before mounting, with an
// exclusive lock, so another tab cannot upload or change references mid-scan.
export async function startStorageSession(mount: () => void) {
  let requested = false;
  try {
    requested = sessionStorage.getItem(requestKey) === "requested";
    sessionStorage.removeItem(requestKey);
  } catch { /* Storage-blocked browsers may still use the app in memory. */ }
  if (!navigator.locks) {
    if (requested) cleanupNotice = "이 브라우저에서는 안전한 이미지 정리를 지원하지 않아 이미지를 보존했습니다.";
    mount();
    return;
  }
  if (requested) {
    try {
      await navigator.locks.request(lockName, { mode: "exclusive", ifAvailable: true }, async lock => {
        if (!lock) {
          cleanupNotice = "다른 탭이 열려 있어 이미지를 정리하지 않았습니다. 다른 서비스 탭을 닫고 다시 시도해 주세요.";
          return;
        }
        const count = await cleanupImages(localStorage);
        cleanupNotice = `사용하지 않는 이미지 ${count}개를 정리했습니다. 사용 중인 이미지와 저장된 생성 조건은 보존했습니다.`;
      });
    } catch (error) {
      cleanupNotice = error instanceof Error ? error.message : "이미지를 정리하지 못했습니다.";
    }
  }
  await navigator.locks.request(lockName, { mode: "shared" }, async () => {
    mount();
    // The browser releases this lock when the document is destroyed.
    await new Promise<void>(() => {});
  });
}
