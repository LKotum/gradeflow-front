import { useEffect, useState } from "react";

import {
  getCachedAccessToken,
  resolveAssetUrl,
} from "../api/client";

const objectUrlCache = new Map<string, string>();
const missingCache = new Set<string>();

const normalizePath = (url: string) => {
  const question = url.indexOf("?");
  return question === -1 ? url : url.slice(0, question);
};

export const invalidateAvatarCache = (
  path?: string | null,
  opts?: { keepMissing?: boolean }
) => {
  const resolved = resolveAssetUrl(path);
  if (!resolved) return;
  const normalized = normalizePath(resolved);

  if (!opts?.keepMissing) {
    missingCache.delete(normalized);
  }

  for (const key of Array.from(objectUrlCache.keys())) {
    if (normalizePath(key) === normalized) {
      const blob = objectUrlCache.get(key);
      if (blob) URL.revokeObjectURL(blob);
      objectUrlCache.delete(key);
    }
  }
};

export const useAvatarImage = (path?: string | null) => {
  const [src, setSrc] = useState<string | undefined>();

  useEffect(() => {
    let didCancel = false;
    const resolved = resolveAssetUrl(path);
    if (!resolved) {
      setSrc(undefined);
      return () => {
        didCancel = true;
      };
    }

    if (resolved.startsWith("blob:")) {
      setSrc(resolved);
      return () => {
        didCancel = true;
      };
    }

    const normalized = normalizePath(resolved);

    if (missingCache.has(normalized)) {
      setSrc(undefined);
      return () => {
        didCancel = true;
      };
    }

    const cachedObjectUrl = objectUrlCache.get(resolved);
    if (cachedObjectUrl) {
      setSrc(cachedObjectUrl);
      return () => {
        didCancel = true;
      };
    }

    const token = getCachedAccessToken();
    if (!token) {
      missingCache.add(normalized);
      setSrc(undefined);
      return () => {
        didCancel = true;
      };
    }

    const controller = new AbortController();

    fetch(resolved, {
      headers: { Authorization: `Bearer ${token}` },
      mode: "cors",
      signal: controller.signal,
    })
      .then((resp) => {
        if (resp.status === 404) {
          missingCache.add(normalized);
          for (const key of Array.from(objectUrlCache.keys())) {
            if (normalizePath(key) === normalized) {
              const blob = objectUrlCache.get(key);
              if (blob) {
                URL.revokeObjectURL(blob);
              }
              objectUrlCache.delete(key);
            }
          }
          setSrc(undefined);
          return null;
        }
        if (!resp.ok) {
          throw new Error(`avatar fetch failed: ${resp.status}`);
        }
        return resp.blob();
      })
      .then((blob) => {
        if (!blob || didCancel) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        const existing = objectUrlCache.get(resolved);
        if (existing) {
          URL.revokeObjectURL(existing);
        }
        missingCache.delete(normalized);
        objectUrlCache.set(resolved, objectUrl);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!didCancel) {
          missingCache.add(normalized);
          for (const key of Array.from(objectUrlCache.keys())) {
            if (normalizePath(key) === normalized) {
              const blob = objectUrlCache.get(key);
              if (blob) {
                URL.revokeObjectURL(blob);
              }
              objectUrlCache.delete(key);
            }
          }
          setSrc(undefined);
        }
      });

    return () => {
      didCancel = true;
      controller.abort();
    };
  }, [path]);

  return src;
};
