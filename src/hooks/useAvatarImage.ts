import { useEffect, useState } from "react";

import { getCachedAccessToken, resolveAssetUrl } from "../api/client";

export const invalidateAvatarCache = (_path?: string | null, _opts?: { markMissing?: boolean }) => {
  // caching removed; placeholder to keep existing calls intact
};

export const useAvatarImage = (path?: string | null) => {
  const [src, setSrc] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setSrc(undefined);
      return () => {
        cancelled = true;
      };
    }

    if (path.startsWith("blob:")) {
      setSrc(path);
      return () => {
        cancelled = true;
      };
    }

    const resolved = resolveAssetUrl(path);
    if (!resolved) {
      setSrc(undefined);
      return () => {
        cancelled = true;
      };
    }

    const token = getCachedAccessToken();
    if (!token) {
      setSrc(undefined);
      return () => {
        cancelled = true;
      };
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;

    fetch(resolved, {
      headers: { Authorization: `Bearer ${token}` },
      mode: "cors",
      signal: controller.signal,
    })
      .then((resp) => {
        if (resp.status === 404) {
          return null;
        }
        if (!resp.ok) {
          throw new Error(`avatar fetch failed: ${resp.status}`);
        }
        return resp.blob();
      })
      .then((blob) => {
        if (cancelled) {
          return;
        }
        if (!blob) {
          setSrc(undefined);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(undefined);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path]);

  return src;
};
