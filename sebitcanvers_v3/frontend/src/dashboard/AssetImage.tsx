import { useEffect, useState } from "react";
import { getAsset } from "../create/assets";
export function AssetImage({ id, src }: { id?: string | null; src?: string }) {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(
    null,
  );
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!id || src) return;
    let cancelled = false;
    let url: string | undefined;
    getAsset(id)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setFailed(id);
          return;
        }
        url = URL.createObjectURL(blob);
        setLoaded({ id, url });
      })
      .catch(() => {
        if (!cancelled) setFailed(id);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, src]);
  const url = src ?? (loaded && loaded.id === id ? loaded.url : undefined);
  if (url && failed !== id)
    return <img src={url} alt="" onError={() => setFailed(id ?? "export")} />;
  return (
    <div className="db-image-placeholder">
      {id
        ? failed === id
          ? "이미지를 불러올 수 없습니다. Create에서 교체해 주세요."
          : "이미지를 불러오는 중…"
        : "이미지를 추가해 보세요"}
    </div>
  );
}
