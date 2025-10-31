const STORAGE_KEY = "gradeflow.avatarColors";

const COLOR_PALETTE = [
  "#1D4ED8",
  "#0F766E",
  "#9333EA",
  "#DC2626",
  "#EA580C",
  "#0EA5E9",
  "#16A34A",
  "#F97316",
];

const loadStoredColors = (): Record<string, string> => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const persistColors = (map: Record<string, string>) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getAvatarAccentColor = (
  userId?: string,
  fallbackKey?: string
): string => {
  const key = userId ?? fallbackKey;
  if (!key) {
    return COLOR_PALETTE[0];
  }
  const stored = loadStoredColors();
  if (stored[key]) {
    return stored[key];
  }
  const index = hashString(key) % COLOR_PALETTE.length;
  const color = COLOR_PALETTE[index];
  stored[key] = color;
  persistColors(stored);
  return color;
};
