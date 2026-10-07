const databaseName = "sebit-assets-v1";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("이미지 저장소를 열 수 없습니다."));
  });
}
export async function getAsset(id: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("images", "readonly");
    const request = tx.objectStore("images").get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () =>
      reject(new Error("저장된 이미지를 읽을 수 없습니다."));
    tx.oncomplete = () => db.close();
    tx.onabort = () => {
      db.close();
      reject(new Error("이미지를 읽지 못했습니다."));
    };
  });
}
export async function saveImage(file: File): Promise<string> {
  if (
    file.size > 2 * 1024 * 1024 ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new Error("PNG, JPG, WebP 이미지(최대 2MB)를 선택해 주세요.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid =
    file.type === "image/png"
      ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
      : file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
          String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!valid)
    throw new Error(
      "이미지 형식이 올바르지 않습니다. 다른 파일을 선택해 주세요.",
    );
  const id = `image-${crypto.randomUUID()}`;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("images", "readwrite");
    tx.objectStore("images").put(file, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(
        new Error("이미지를 저장할 공간이 부족하거나 저장이 차단되었습니다."),
      );
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("이미지 저장이 중단되었습니다."));
    };
  });
  return id;
}
