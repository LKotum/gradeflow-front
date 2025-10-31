This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
src/
  api/
    client.ts
  components/
    AvatarEditor.tsx
    Header.tsx
    ProfileSettings.tsx
  hooks/
    useAvatarImage.ts
  pages/
    AdminDashboard.tsx
    DeanGroups.tsx
    DeanStudents.tsx
    DeanSubjects.tsx
    DeanTeachers.tsx
    Login.tsx
    ProfilePage.tsx
    StudentDashboard.tsx
    StudentSubjects.tsx
    TeacherDashboard.tsx
    TeacherGradeEditor.tsx
  utils/
    avatarColor.ts
    name.ts
  App.tsx
  main.tsx
  theme.ts
.gitignore
index.html
package.json
tsconfig.json
vite.config.ts
```

# Files

## File: src/components/AvatarEditor.tsx
```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spinner,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { getAvatarAccentColor } from "../utils/avatarColor";
import {
  invalidateAvatarCache,
  useAvatarImage,
} from "../hooks/useAvatarImage";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const CROPPER_PREVIEW_SIZE = 320;

interface AvatarEditorProps {
  name: string;
  avatarUrl?: string | null;
  identifier?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  uploadLabel?: string;
  deleteLabel?: string;
  allowDelete?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  isBusy?: boolean;
  accentColor?: string;
}

type AvatarDraft = {
  file: File;
  url: string;
  image: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const AvatarEditor = ({
  name,
  avatarUrl,
  identifier,
  size = "xl",
  uploadLabel = "Обновить фото",
  deleteLabel = "Удалить фото",
  allowDelete = true,
  onUpload,
  onDelete,
  isBusy,
  accentColor,
}: AvatarEditorProps) => {
  const toast = useToast();
  const accent = useMemo(
    () =>
      accentColor ??
      getAvatarAccentColor(identifier ?? name ?? "anonymous"),
    [accentColor, identifier, name]
  );
  const resolvedSrc = useAvatarImage(avatarUrl);
  const showAccent = !resolvedSrc;
  const [draft, setDraft] = useState<AvatarDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    baseOffsetX: number;
    baseOffsetY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    baseOffsetX: 0,
    baseOffsetY: 0,
  });
  const { isOpen, onOpen, onClose } = useDisclosure();

  const backgroundColor = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.300");
  const sliderLabelColor = useColorModeValue("gray.600", "gray.400");
  const modalBg = useColorModeValue("white", "gray.800");

  const isProcessing = uploading || removing || !!isBusy;

  const cleanupDraft = useCallback(() => {
    setDraft((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
    setDraftLoading(false);
    dragState.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      baseOffsetX: 0,
      baseOffsetY: 0,
    };
    onClose();
  }, [onClose]);

  const prepareDraft = useCallback(
    (file: File) => {
      setDraftLoading(true);
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = objectUrl;
      image.onload = () => {
        setDraft({
          file,
          url: objectUrl,
          image,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        });
        setDraftLoading(false);
        onOpen();
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setDraftLoading(false);
        toast({
          title: "Не удалось открыть изображение",
          status: "error",
        });
      };
    },
    [onOpen, toast]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) {
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Поддерживаются только изображения",
          status: "warning",
        });
        return;
      }
      prepareDraft(file);
    },
    [prepareDraft, toast]
  );

  const handleUploadConfirm = useCallback(async () => {
    if (!draft) {
      return;
    }
    const previousPath = avatarUrl;
    try {
      setUploading(true);
      const cropped = await createCroppedFile(draft);
      await onUpload(cropped);
      invalidateAvatarCache(previousPath);
      cleanupDraft();
      toast({ title: "Аватар обновлён", status: "success" });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : undefined;
      toast({
        title: "Не удалось сохранить изображение",
        description,
        status: "error",
      });
    } finally {
      setUploading(false);
    }
  }, [avatarUrl, cleanupDraft, draft, onUpload, toast]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) {
      return;
    }
    try {
      setRemoving(true);
      await onDelete();
      invalidateAvatarCache(avatarUrl, { keepMissing: true });
      toast({ title: "Аватар удалён", status: "info" });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : undefined;
      toast({
        title: "Не удалось удалить аватар",
        description,
        status: "error",
      });
    } finally {
      setRemoving(false);
    }
  }, [avatarUrl, onDelete, toast]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draft) {
        return;
      }
      const element = previewRef.current;
      if (element) {
        element.setPointerCapture(event.pointerId);
      }
      dragState.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        baseOffsetX: draft.offsetX,
        baseOffsetY: draft.offsetY,
      };
    },
    [draft]
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!draft || !dragState.current.active) {
      return;
    }
    event.preventDefault();
    const deltaX = event.clientX - dragState.current.startX;
    const deltaY = event.clientY - dragState.current.startY;
    const maxOffset = 1;
    const factor = 2 / CROPPER_PREVIEW_SIZE;
    const nextX = clamp(
      dragState.current.baseOffsetX + deltaX * factor,
      -maxOffset,
      maxOffset
    );
    const nextY = clamp(
      dragState.current.baseOffsetY + deltaY * factor,
      -maxOffset,
      maxOffset
    );
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            offsetX: nextX,
            offsetY: nextY,
          }
        : prev
    );
  }, [draft]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current.pointerId !== null) {
      const element = previewRef.current;
      if (element) {
        element.releasePointerCapture(dragState.current.pointerId);
      }
    }
    dragState.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      baseOffsetX: 0,
      baseOffsetY: 0,
    };
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!draft) {
      return;
    }
    event.preventDefault();
    const delta = -event.deltaY / 600;
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            zoom: clamp(prev.zoom + delta, 1, 3),
          }
        : prev
    );
  }, [draft]);

  useEffect(() => () => cleanupDraft(), [cleanupDraft]);

  const renderPreview = () => {
    if (!draft) {
      return null;
    }
    const backgroundPositionX = 50 + draft.offsetX * 50;
    const backgroundPositionY = 50 + draft.offsetY * 50;
    return (
      <Box
        ref={previewRef}
        mx="auto"
        w={CROPPER_PREVIEW_SIZE}
        h={CROPPER_PREVIEW_SIZE}
        borderRadius="xl"
        backgroundImage={`url(${draft.url})`}
        backgroundPosition={`${backgroundPositionX}% ${backgroundPositionY}%`}
        backgroundRepeat="no-repeat"
        backgroundSize={`${draft.zoom * 100}%`}
        borderWidth="1px"
        borderColor={borderColor}
        boxShadow="lg"
        cursor={dragState.current.active ? "grabbing" : "grab"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        tabIndex={0}
        role="presentation"
      />
    );
  };

  return (
    <Stack spacing={3} align="flex-start">
      <HStack spacing={4} align="center">
        <Tooltip label={avatarUrl ? "Обновить аватар" : "Загрузить аватар"}>
          <Avatar
            size={size}
            name={name}
            src={resolvedSrc}
            bg={showAccent ? accent : undefined}
            color={showAccent ? "white" : undefined}
            boxShadow="sm"
            borderWidth={showAccent ? "2px" : undefined}
            borderColor={showAccent ? "whiteAlpha.700" : undefined}
          />
        </Tooltip>
        <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
          <Button
            colorScheme="brand"
            onClick={() => fileInputRef.current?.click()}
            isLoading={draftLoading || uploading}
            isDisabled={isProcessing}
          >
            {uploadLabel}
          </Button>
          {allowDelete && onDelete ? (
            <Button
              variant="ghost"
              colorScheme="red"
              onClick={handleDelete}
              isLoading={removing}
              isDisabled={isProcessing || !avatarUrl}
            >
              {deleteLabel}
            </Button>
          ) : null}
        </Stack>
      </HStack>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <Modal isOpen={isOpen || draftLoading} onClose={cleanupDraft} isCentered size="lg">
        <ModalOverlay />
        <ModalContent bg={modalBg}>
          <ModalHeader>Настройка изображения</ModalHeader>
          {!uploading && <ModalCloseButton />}
          <ModalBody>
            {draftLoading ? (
              <HStack spacing={3} justify="center" py={6}>
                <Spinner size="sm" />
                <Text>Подготовка изображения...</Text>
              </HStack>
            ) : draft ? (
              <Stack spacing={6} align="center">
                <Box
                  w={CROPPER_PREVIEW_SIZE}
                  h={CROPPER_PREVIEW_SIZE}
                  bg={backgroundColor}
                  borderRadius="xl"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {renderPreview()}
                </Box>
                <Box w="full">
                  <Text fontSize="sm" color={sliderLabelColor} mb={2}>
                    Масштаб (колёсико мыши также меняет масштаб)
                  </Text>
                  <Slider
                    min={1}
                    max={3}
                    step={0.01}
                    value={draft.zoom}
                    onChange={(value) =>
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              zoom: value,
                            }
                          : prev
                      )
                    }
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Box>
              </Stack>
            ) : (
              <Text color={sliderLabelColor}>Выберите изображение для загрузки.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={cleanupDraft} isDisabled={uploading}>
                Отмена
              </Button>
              <Button
                colorScheme="brand"
                onClick={handleUploadConfirm}
                isLoading={uploading}
                isDisabled={!draft}
              >
                Сохранить
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
};

const createCroppedFile = async (draft: AvatarDraft): Promise<File> => {
  const minSide = Math.min(draft.naturalWidth, draft.naturalHeight);
  const cropSize = minSide / draft.zoom;
  const maxOffsetX = (draft.naturalWidth - cropSize) / 2;
  const maxOffsetY = (draft.naturalHeight - cropSize) / 2;
  const originX =
    (draft.naturalWidth - cropSize) / 2 + draft.offsetX * maxOffsetX;
  const originY =
    (draft.naturalHeight - cropSize) / 2 + draft.offsetY * maxOffsetY;
  const canvas = document.createElement("canvas");
  const canvasSize = 512;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.drawImage(
    draft.image,
    originX,
    originY,
    cropSize,
    cropSize,
    0,
    0,
    canvasSize,
    canvasSize
  );
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) {
        resolve(value);
      } else {
        reject(new Error("Failed to prepare avatar"));
      }
    }, "image/png");
  });
  return new File([blob], "avatar.png", { type: "image/png" });
};

export default AvatarEditor;
```

## File: src/hooks/useAvatarImage.ts
```typescript
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

export const invalidateAvatarCache = (path?: string | null, opts?: { keepMissing?: boolean }) => {
  const resolved = resolveAssetUrl(path);
  if (!resolved) {
    return;
  }
  const normalized = normalizePath(resolved);
  missingCache.delete(normalized);
  if (!opts?.keepMissing) {
    missingCache.delete(normalized);
  }
  for (const key of Array.from(objectUrlCache.keys())) {
    if (normalizePath(key) === normalized) {
      const blob = objectUrlCache.get(key);
      if (blob) {
        URL.revokeObjectURL(blob);
      }
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
```

## File: src/utils/avatarColor.ts
```typescript
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
```

## File: src/components/ProfileSettings.tsx
```typescript
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";

import {
  changePassword,
  deleteProfileAvatar,
  fetchProfile,
  uploadProfileAvatar,
  type UserSummary,
} from "../api/client";
import { formatFullName } from "../utils/name";
import AvatarEditor from "./AvatarEditor";
import { invalidateAvatarCache } from "../hooks/useAvatarImage";

interface ProfileSettingsProps {
  profile?: UserSummary | null;
  heading?: string;
  showName?: boolean;
  onProfileUpdate?: (profile: UserSummary) => void;
}

const extractErrorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<{
    message?: string;
    error?: string;
    detail?: string;
  }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.response?.data?.error ??
    axiosError?.response?.data?.detail ??
    fallback
  );
};

const ProfileSettings = ({
  profile,
  heading = "Настройки профиля",
  showName = true,
  onProfileUpdate,
}: ProfileSettingsProps) => {
  const [localProfile, setLocalProfile] = useState<UserSummary | null>(
    profile ?? null
  );
  const [profileLoading, setProfileLoading] = useState(!profile);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const subtleText = useColorModeValue("gray.600", "gray.400");

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile);
      setProfileLoading(false);
      setProfileError(null);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      return;
    }
    let isMounted = true;
    setProfileLoading(true);
    fetchProfile()
      .then((data) => {
        if (!isMounted) return;
        setLocalProfile(data);
        setProfileError(null);
        onProfileUpdate?.(data);
      })
      .catch((error) => {
        if (!isMounted) return;
        setProfileError(
          extractErrorMessage(error, "Не удалось загрузить профиль пользователя")
        );
        setLocalProfile(null);
      })
      .finally(() => {
        if (isMounted) {
          setProfileLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [profile, onProfileUpdate]);

  const fullName = useMemo(() => {
    if (!localProfile) {
      return "";
    }
    return formatFullName(
      localProfile.lastName,
      localProfile.firstName,
      localProfile.middleName
    );
  }, [localProfile]);

  const handleAvatarUpload = async (file: File) => {
    const previousPath = localProfile?.avatarUrl;
    const updated = await uploadProfileAvatar(file);
    invalidateAvatarCache(previousPath);
    invalidateAvatarCache(updated.avatarUrl);
    setLocalProfile(updated);
    setProfileError(null);
    onProfileUpdate?.(updated);
  };

  const handleAvatarDelete = async () => {
    const previousPath = localProfile?.avatarUrl;
    const updated = await deleteProfileAvatar();
    invalidateAvatarCache(previousPath);
    invalidateAvatarCache(updated.avatarUrl);
    setLocalProfile(updated);
    onProfileUpdate?.(updated);
  };

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      toast({
        title: "Заполните все поля",
        status: "warning",
      });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast({
        title: "Пароли не совпадают",
        status: "warning",
      });
      return;
    }
    if (passwordForm.next.length < 8) {
      toast({
        title: "Пароль слишком короткий",
        description: "Минимальная длина пароля — 8 символов",
        status: "warning",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });
      setPasswordForm({ current: "", next: "", confirm: "" });
      toast({
        title: "Пароль обновлён",
        status: "success",
      });
    } catch (error) {
      toast({
        title: "Не удалось обновить пароль",
        description: extractErrorMessage(
          error,
          "Проверьте текущий пароль и повторите попытку"
        ),
        status: "error",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="xl"
      bg={cardBg}
      borderColor={borderColor}
      boxShadow="md"
      p={{ base: 5, md: 6 }}
      mb={6}
    >
      <Stack spacing={5}>
        <Text fontSize="lg" fontWeight="semibold">
          {heading}
        </Text>
        {profileLoading ? (
          <HStack spacing={3}>
            <Spinner size="sm" />
            <Text color={subtleText}>Загрузка профиля...</Text>
          </HStack>
        ) : profileError ? (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {profileError}
          </Alert>
        ) : localProfile ? (
          <>
            <HStack
              spacing={{ base: 4, md: 6 }}
              align={{ base: "flex-start", md: "center" }}
              flexWrap="wrap"
            >
              <AvatarEditor
                name={fullName}
                avatarUrl={localProfile.avatarUrl}
                identifier={localProfile.id}
                onUpload={async (file) => {
                  try {
                    await handleAvatarUpload(file);
                  } catch (error) {
                    throw new Error(
                      extractErrorMessage(
                        error,
                        "Не удалось сохранить изображение"
                      )
                    );
                  }
                }}
                onDelete={localProfile.avatarUrl ? async () => {
                  try {
                    await handleAvatarDelete();
                  } catch (error) {
                    throw new Error(
                      extractErrorMessage(
                        error,
                        "Не удалось удалить аватар"
                      )
                    );
                  }
                } : undefined}
              />
              {showName && (
                <Stack spacing={2} minW={{ base: "full", md: "auto" }}>
                  <Text fontWeight="semibold" fontSize="lg">
                    {fullName}
                  </Text>
                  <Text color={subtleText}>
                    ИНС: {localProfile.ins ?? "—"}
                  </Text>
                  <Text color={subtleText}>
                    E-mail: {localProfile.email ?? "—"}
                  </Text>
                </Stack>
              )}
            </HStack>

            <Divider />

            <Box as="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={4}>
                <Text fontWeight="semibold">Смена пароля</Text>
                <FormControl isRequired>
                  <FormLabel htmlFor="profile-current-password">
                    Текущий пароль
                  </FormLabel>
                  <Input
                    id="profile-current-password"
                    type="password"
                    value={passwordForm.current}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        current: event.target.value,
                      }))
                    }
                    placeholder="Введите текущий пароль"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel htmlFor="profile-new-password">
                    Новый пароль
                  </FormLabel>
                  <Input
                    id="profile-new-password"
                    type="password"
                    value={passwordForm.next}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        next: event.target.value,
                      }))
                    }
                    placeholder="Не менее 8 символов"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel htmlFor="profile-confirm-password">
                    Повторите новый пароль
                  </FormLabel>
                  <Input
                    id="profile-confirm-password"
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirm: event.target.value,
                      }))
                    }
                    placeholder="Повторите новый пароль"
                  />
                </FormControl>
                <HStack spacing={3}>
                  <Button
                    type="submit"
                    colorScheme="brand"
                    isLoading={passwordLoading}
                  >
                    Сохранить пароль
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setPasswordForm({ current: "", next: "", confirm: "" })
                    }
                    isDisabled={passwordLoading}
                  >
                    Сбросить
                  </Button>
                </HStack>
              </Stack>
            </Box>
          </>
        ) : (
          <Text color={subtleText}>
            Данные профиля не найдены. Попробуйте обновить страницу.
          </Text>
        )}
      </Stack>
    </Box>
  );
};

export default ProfileSettings;
```

## File: src/pages/ProfilePage.tsx
```typescript
import { Box, Heading } from "@chakra-ui/react";
import ProfileSettings from "../components/ProfileSettings";
import type { UserSummary } from "../api/client";

interface ProfilePageProps {
  profile: UserSummary | null;
  onProfileUpdate: (profile: UserSummary) => void;
}

const ProfilePage = ({ profile, onProfileUpdate }: ProfilePageProps) => {
  return (
    <Box px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }}>
      <Heading size="lg" mb={6}>
        Профиль пользователя
      </Heading>
      <ProfileSettings profile={profile} onProfileUpdate={onProfileUpdate} />
    </Box>
  );
};

export default ProfilePage;
```

## File: src/utils/name.ts
```typescript
export const formatFullName = (
  lastName?: string | null,
  firstName?: string | null,
  middleName?: string | null
): string => {
  const parts = [lastName, firstName, middleName].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  return parts.join(" ");
};

export const formatNameWithInitials = (
  lastName?: string | null,
  firstName?: string | null,
  middleName?: string | null
): string => {
  const base = lastName ? lastName.trim() : "";
  const initials = [firstName, middleName]
    .filter((part) => part && part.trim())
    .map((part) => `${part!.trim()[0]}.`)
    .join(" ");
  return [base, initials].filter(Boolean).join(" ");
};
```

## File: src/theme.ts
```typescript
import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a"
    }
  },
  styles: {
    global: (props: { colorMode: "light" | "dark" }) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.900" : "gray.50",
        color: props.colorMode === "dark" ? "gray.100" : "gray.800",
        transition: "background-color 0.3s ease, color 0.3s ease"
      }
    })
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: "brand"
      }
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: "xl"
        }
      }
    },
    Card: {
      baseStyle: {
        container: {
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          _hover: {
            transform: "translateY(-4px)",
            boxShadow: "lg"
          }
        }
      }
    }
  }
});

export default theme;
```

## File: index.html
```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1e40af" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <title>GradeFlow</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "jsx": "react-jsx",
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

## File: src/pages/DeanStudents.tsx
```typescript
import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import type { AxiosError } from "axios";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Badge,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import {
  assignStudentToGroup,
  createDeanStudent,
  detachStudentFromGroup,
  fetchDeanGroups,
  fetchDeanStudents,
  updateDeanStudent,
  fetchDeanStudentSubjects,
  updateDeanGrade,
  uploadDeanStudentAvatar,
  deleteDeanStudentAvatar,
} from "../api/client";
import { formatFullName } from "../utils/name";
import AvatarEditor from "../components/AvatarEditor";
import { invalidateAvatarCache } from "../hooks/useAvatarImage";

const PAGE_LIMIT = 20;

const extractApiError = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<{
    message?: string;
    error?: string;
    detail?: string;
  }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.response?.data?.error ??
    axiosError?.response?.data?.detail ??
    fallback
  );
};

const DeanStudents = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsMeta, setStudentsMeta] = useState({
    limit: PAGE_LIMIT,
    offset: 0,
    total: 0,
  });
  const [studentForm, setStudentForm] = useState({
    password: "",
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    groupId: "",
  });
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [detachLoading, setDetachLoading] = useState(false);
  const [detachContext, setDetachContext] = useState<{
    studentId: string;
    groupId: string;
    name: string;
  } | null>(null);
  const [editingStudent, setEditingStudent] = useState<Record<string, any> | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [gradebookStudent, setGradebookStudent] = useState<any | null>(null);
  const [gradebook, setGradebook] = useState<any[]>([]);
  const [gradebookMeta, setGradebookMeta] = useState({
    limit: PAGE_LIMIT,
    offset: 0,
    total: 0,
  });
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradeUpdating, setGradeUpdating] = useState<string | null>(null);
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});
  const gradeOptions = ["2", "3", "4", "5"];

  const detachDialog = useDisclosure();
  const editDialog = useDisclosure();
  const gradebookDialog = useDisclosure();
  const cancelDetachRef = useRef<HTMLButtonElement | null>(null);

  const cardBg = useColorModeValue("white", "gray.800");
  const tableBg = useColorModeValue("gray.100", "gray.700");
  const studentSelectionFieldId = useId();
  const assignmentGroupSelectId = useId();
  const toast = useToast();

  const assignableStudents = useMemo(
    () =>
      students.filter(
        (student: any) =>
          !(student.group?.id ?? student.student?.group?.id ?? null)
      ),
    [students]
  );

  const loadStudents = useCallback(
    async (offset = 0, query = search) => {
      setStudentsLoading(true);
      try {
        const data = await fetchDeanStudents({
          limit: PAGE_LIMIT,
          offset,
          search: query.trim() ? query.trim() : undefined,
        });
        const list = data.data ?? [];
        setStudents(list);
        const assignableSet = new Set(
          list
            .filter(
              (student: any) =>
                !(student.group?.id ?? student.student?.group?.id ?? null)
            )
            .map((student: any) => student.id)
        );
        if (data.meta) {
          setStudentsMeta(data.meta);
        } else {
          setStudentsMeta({ limit: PAGE_LIMIT, offset, total: list.length });
        }
        setSelectedStudents((prev) =>
          prev.filter((id) => assignableSet.has(id))
        );
      } finally {
        setStudentsLoading(false);
      }
    },
    [search]
  );

  const loadInitialCatalogs = useCallback(async () => {
    try {
      const [groupsData] = await Promise.all([
        fetchDeanGroups({ limit: PAGE_LIMIT }),
      ]);
      setGroups(groupsData.data ?? []);
      await loadStudents(0, "");
    } catch (catalogError) {
      console.error(catalogError);
      setError("Не удалось загрузить справочники");
    } finally {
      setInitialLoading(false);
    }
  }, [loadStudents]);

  useEffect(() => {
    loadInitialCatalogs();
  }, [loadInitialCatalogs]);

  const handleStudentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      await createDeanStudent({
        password: studentForm.password,
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        middleName: studentForm.middleName?.trim()
          ? studentForm.middleName.trim()
          : undefined,
        email: studentForm.email?.trim() ? studentForm.email.trim() : undefined,
        groupId: studentForm.groupId || undefined,
      });
      setStudentForm({
        password: "",
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
        groupId: "",
      });
      await loadStudents(studentsMeta.offset, search);
    } catch (err) {
      setError("Не удалось создать студента");
    } finally {
      setFormLoading(false);
    }
  };

  const handleGroupAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedGroup || selectedStudents.length === 0) {
      return;
    }
    setFormLoading(true);
    setError(null);
    try {
      const selectedDetails = students.filter((student: any) =>
        selectedStudents.includes(student.id)
      );
      const alreadyAssigned = selectedDetails.filter(
        (student: any) =>
          !!(student.group?.id ?? student.student?.group?.id ?? null)
      );
      const toAttach = selectedDetails.filter(
        (student: any) =>
          !(student.group?.id ?? student.student?.group?.id ?? null)
      );
      if (alreadyAssigned.length > 0) {
        toast({
          title: "Студенты уже в группе",
          description:
            "Сначала открепите выбранных студентов от текущей группы.",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
      }
      if (toAttach.length === 0) {
        setSelectedStudents([]);
        setFormLoading(false);
        return;
      }
      await assignStudentToGroup(selectedGroup, {
        studentIds: toAttach.map((student: any) => student.id),
      });
      await loadStudents(studentsMeta.offset, search);
      setSelectedStudents([]);
    } catch (err) {
      setError("Не удалось прикрепить студентов к группе");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadStudents(0, search);
  };

  const handlePageChange = async (direction: number) => {
    const nextOffset = Math.max(
      0,
      studentsMeta.offset + direction * studentsMeta.limit
    );
    if (nextOffset === studentsMeta.offset) {
      return;
    }
    if (nextOffset >= studentsMeta.total && direction > 0) {
      return;
    }
    await loadStudents(nextOffset, search);
  };

  const groupsOptions = useMemo(
    () =>
      groups.map((group: any) => ({
        id: group.id,
        label: group.name,
      })),
    [groups]
  );

  const openDetachDialog = (student: any) => {
    const groupId = student.student?.group?.id ?? student.group?.id;
    if (!groupId) {
      return;
    }
    setDetachContext({
      studentId: student.id,
      groupId,
      name: formatFullName(
        student.lastName,
        student.firstName,
        student.middleName
      ),
    });
    detachDialog.onOpen();
  };

  const openEditStudentDialog = (student: any) => {
    setEditingStudent(student);
    setEditStudentForm({
      firstName: student.firstName ?? "",
      lastName: student.lastName ?? "",
      middleName: student.middleName ?? "",
      email: student.email ?? "",
    });
    editDialog.onOpen();
  };

  const handleEditStudentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingStudent) {
      return;
    }
    setEditLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      const trim = (value: string) => value.trim();
      const originalFirst = editingStudent.firstName ?? "";
      const originalLast = editingStudent.lastName ?? "";
      const originalMiddle = editingStudent.middleName ?? "";
      const originalEmail = editingStudent.email ?? "";

      if (trim(editStudentForm.firstName) !== originalFirst) {
        payload.firstName = trim(editStudentForm.firstName);
      }
      if (trim(editStudentForm.lastName) !== originalLast) {
        payload.lastName = trim(editStudentForm.lastName);
      }
      if (trim(editStudentForm.middleName) !== originalMiddle) {
        const next = trim(editStudentForm.middleName);
        payload.middleName = next ? next : null;
      }
      if (trim(editStudentForm.email) !== originalEmail) {
        const next = trim(editStudentForm.email);
        payload.email = next ? next : null;
      }
      if (Object.keys(payload).length === 0) {
        toast({
          title: "Изменения не внесены",
          status: "info",
          duration: 2500,
          isClosable: true,
        });
        return;
      }
      await updateDeanStudent(editingStudent.id, payload);
      await loadStudents(studentsMeta.offset, search);
      editDialog.onClose();
    } catch (err) {
      toast({
        title: "Не удалось обновить данные студента",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleStudentAvatarUpload = useCallback(
    async (file: File) => {
      if (!editingStudent) {
        throw new Error("Студент не выбран");
      }
      try {
        const previousPath = editingStudent.avatarUrl;
        const updated = await uploadDeanStudentAvatar(editingStudent.id, file);
        invalidateAvatarCache(previousPath);
        invalidateAvatarCache(updated.avatarUrl);
        setEditingStudent((prev) =>
          prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev
        );
        await loadStudents(studentsMeta.offset, search);
      } catch (error) {
        throw new Error(
          extractApiError(error, "Не удалось обновить аватар студента")
        );
      }
    },
    [editingStudent, loadStudents, studentsMeta.offset, search]
  );

  const handleStudentAvatarDelete = useCallback(async () => {
    if (!editingStudent) {
      throw new Error("Студент не выбран");
    }
    try {
      const previousPath = editingStudent.avatarUrl;
      const updated = await deleteDeanStudentAvatar(editingStudent.id);
      invalidateAvatarCache(previousPath);
      invalidateAvatarCache(updated.avatarUrl);
      setEditingStudent((prev) =>
        prev ? { ...prev, avatarUrl: updated.avatarUrl ?? null } : prev
      );
      await loadStudents(studentsMeta.offset, search);
    } catch (error) {
      throw new Error(
        extractApiError(error, "Не удалось удалить аватар студента")
      );
    }
  }, [editingStudent, loadStudents, studentsMeta.offset, search]);

  const loadGradebook = async (studentId: string) => {
    setGradebookLoading(true);
    try {
      const data = await fetchDeanStudentSubjects(studentId, {
        limit: PAGE_LIMIT,
        offset: 0,
      });
      const list = data.data ?? [];
      setGradebook(list);
      if (data.meta) {
        setGradebookMeta(data.meta);
      } else {
        setGradebookMeta({ limit: PAGE_LIMIT, offset: 0, total: list.length });
      }
      const drafts: Record<string, string> = {};
      list.forEach((subject: any) => {
        (subject.sessions ?? []).forEach((session: any) => {
          if (session.gradeId && session.grade != null) {
            drafts[session.gradeId] = Number(session.grade).toFixed(0);
          }
        });
      });
      setGradeDrafts(drafts);
    } finally {
      setGradebookLoading(false);
    }
  };

  const openGradebookDialog = async (student: any) => {
    setGradebookStudent(student);
    gradebookDialog.onOpen();
    await loadGradebook(student.id);
  };

  const handleGradeDraftChange = (gradeId: string, value: string) => {
    setGradeDrafts((prev) => ({ ...prev, [gradeId]: value }));
  };

  const handleGradeSave = async (gradeId: string, notes?: string | null) => {
    const draft = gradeDrafts[gradeId];
    if (!draft) {
      toast({
        title: "Выберите значение",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    const numeric = Number(draft);
    if (!gradeOptions.includes(draft) || Number.isNaN(numeric)) {
      toast({
        title: "Некорректное значение",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    if (!gradebookStudent) {
      return;
    }
    setGradeUpdating(gradeId);
    try {
      await updateDeanGrade(gradeId, {
        value: numeric,
        notes: notes ?? undefined,
      });
      await loadGradebook(gradebookStudent.id);
      toast({
        title: "Оценка обновлена",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch {
      toast({
        title: "Не удалось обновить оценку",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setGradeUpdating(null);
    }
  };

  const handleConfirmDetach = async () => {
    if (!detachContext) {
      detachDialog.onClose();
      return;
    }
    setDetachLoading(true);
    setError(null);
    try {
      await detachStudentFromGroup(
        detachContext.groupId,
        detachContext.studentId
      );
      await loadStudents(studentsMeta.offset, search);
      setSelectedStudents((prev) =>
        prev.filter((id) => id !== detachContext.studentId)
      );
    } catch (err) {
      setError("Не удалось открепить студента от группы");
    } finally {
      setDetachLoading(false);
      detachDialog.onClose();
      setDetachContext(null);
    }
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        Управление студентами
      </Heading>
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <SimpleGrid
        columns={{ base: 1, lg: 2 }}
        spacing={6}
        alignItems="stretch"
        mb={6}
      >
        <Box
          as="form"
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow="md"
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
          onSubmit={handleStudentSubmit}
          minH={{ base: "auto", lg: "100%" }}
        >
          <Heading size="md" mb={3}>
            Добавить студента
          </Heading>
          <Stack spacing={3} flex="1">
            <FormControl isRequired>
            <FormLabel>Имя</FormLabel>
            <Input
              value={studentForm.firstName}
              onChange={(e) =>
                setStudentForm({ ...studentForm, firstName: e.target.value })
              }
            />
            </FormControl>
            <FormControl isRequired>
            <FormLabel>Фамилия</FormLabel>
            <Input
              value={studentForm.lastName}
              onChange={(e) =>
                setStudentForm({ ...studentForm, lastName: e.target.value })
              }
            />
            </FormControl>
            <FormControl>
            <FormLabel>Отчество</FormLabel>
            <Input
              value={studentForm.middleName}
              onChange={(e) =>
                setStudentForm({ ...studentForm, middleName: e.target.value })
              }
            />
            </FormControl>
            <FormControl>
            <FormLabel>Электронная почта</FormLabel>
            <Input
              value={studentForm.email}
              onChange={(e) =>
                setStudentForm({ ...studentForm, email: e.target.value })
              }
              placeholder="student@example.com"
            />
            </FormControl>
            <FormControl>
            <FormLabel>Группа</FormLabel>
            <Select
              placeholder="Выберите группу"
              value={studentForm.groupId}
              onChange={(e) =>
                setStudentForm({ ...studentForm, groupId: e.target.value })
              }
            >
              {groupsOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </Select>
            </FormControl>
            <FormControl isRequired>
            <FormLabel>Пароль</FormLabel>
            <Input
              type="password"
              value={studentForm.password}
              onChange={(e) =>
                setStudentForm({ ...studentForm, password: e.target.value })
              }
            />
            </FormControl>
          </Stack>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={formLoading}
            alignSelf="flex-start"
            mt={4}
          >
            Сохранить студента
          </Button>
        </Box>

        <Box
          as="form"
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow="md"
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
          onSubmit={handleGroupAssignment}
          minH={{ base: "auto", lg: "100%" }}
        >
          <Heading size="md" mb={3}>
            Прикрепить студентов к группе
          </Heading>
          <Stack spacing={3} flex="1">
          <FormControl isRequired>
            <FormLabel htmlFor={assignmentGroupSelectId}>Группа</FormLabel>
            <Select
              id={assignmentGroupSelectId}
              placeholder="Выберите группу"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              {groupsOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl as="fieldset" isRequired flex="1">
            <FormLabel as="legend">
              Студенты <Text as="span" color="red.500">*</Text>
            </FormLabel>
            <CheckboxGroup
              value={selectedStudents}
              onChange={(values) => setSelectedStudents(values as string[])}
            >
              <SimpleGrid
                columns={{ base: 1, md: 2 }}
                spacing={1}
                maxH="240px"
                overflowY="auto"
                pr={1}
              >
                {assignableStudents.map((student: any) => (
                  <Checkbox
                    key={student.id}
                    value={student.id}
                    id={`${studentSelectionFieldId}-${student.id}`}
                  >
                    {formatFullName(
                      student.lastName,
                      student.firstName,
                      student.middleName
                    )}
                  </Checkbox>
                ))}
              </SimpleGrid>
            </CheckboxGroup>
            {assignableStudents.length === 0 && (
              <Text fontSize="sm" color="gray.500" mt={2}>
                Все студенты уже состоят в группах. Сначала открепите нужных студентов.
              </Text>
            )}
          </FormControl>
          </Stack>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={formLoading || studentsLoading}
            alignSelf="flex-start"
            mt={4}
          >
            Прикрепить выбранных
          </Button>
        </Box>
      </SimpleGrid>

      <Box
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        bg={cardBg}
        boxShadow="md"
        mb={6}
        as="form"
        onSubmit={handleSearchSubmit}
      >
        <Heading size="md" mb={3}>
          Поиск студентов
        </Heading>
        <HStack align="flex-end" spacing={4} flexWrap="wrap">
          <FormControl maxW={{ base: "100%", md: "320px" }}>
            <FormLabel>Фамилия, имя или ИНС</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Например, Иванов или 00000042"
              />
            </InputGroup>
          </FormControl>
          <HStack spacing={3}>
            <Button
              type="submit"
              colorScheme="brand"
              isLoading={studentsLoading}
            >
              Найти
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                void loadStudents(0, "");
              }}
              isDisabled={studentsLoading && search.trim() === ""}
            >
              Сбросить
            </Button>
          </HStack>
        </HStack>
      </Box>

      <Box
        borderWidth="1px"
        borderRadius="xl"
        overflow="hidden"
        bg={cardBg}
        boxShadow="md"
      >
        <Box px={6} py={4} bg={tableBg}>
          <Heading size="md">Студенты</Heading>
          <Text fontSize="sm" color="gray.500">
            Найдено: {studentsMeta.total}
          </Text>
        </Box>
        {initialLoading ? (
          <Box px={6} py={8}>
            <HStack spacing={3}>
              <Spinner size="sm" />
              <Text color="gray.500">Загрузка данных...</Text>
            </HStack>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>ФИО</Th>
                  <Th>ИНС</Th>
                  <Th>Почта</Th>
                  <Th>Группа</Th>
                  <Th textAlign="right">Действия</Th>
                </Tr>
              </Thead>
              <Tbody>
                {studentsLoading ? (
                  <Tr>
                    <Td colSpan={5}>
                      <HStack spacing={3}>
                        <Spinner size="sm" />
                        <Text color="gray.500">Обновление списка...</Text>
                      </HStack>
                    </Td>
                  </Tr>
                ) : students.length === 0 ? (
                  <Tr>
                    <Td colSpan={5}>
                      <Text color="gray.500">Студенты не найдены</Text>
                    </Td>
                  </Tr>
                ) : (
                  students.map((student: any) => {
                    const groupData =
                      student.group ?? student.student?.group ?? null;
                    const groupName = groupData?.name ?? "Не назначена";
                    const groupId = groupData?.id ?? null;
                    return (
                      <Tr key={student.id}>
                        <Td>
                          {formatFullName(
                            student.lastName,
                            student.firstName,
                            student.middleName
                          )}
                        </Td>
                        <Td>{student.ins ?? "—"}</Td>
                        <Td>{student.email ?? "—"}</Td>
                        <Td>{groupName}</Td>
                        <Td>
                          <HStack justify="flex-end">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => openGradebookDialog(student)}
                            >
                              Оценки
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => openEditStudentDialog(student)}
                            >
                              Редактировать
                            </Button>
                          </HStack>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <HStack justify="space-between" mt={6} flexWrap="wrap">
        <Text fontSize="sm" color="gray.500">
          Показано {students.length} из {studentsMeta.total}
        </Text>
        <HStack spacing={3} mt={{ base: 3, md: 0 }}>
          <Button
            size="sm"
            onClick={() => void handlePageChange(-1)}
            isDisabled={studentsMeta.offset === 0 || studentsLoading}
          >
            Предыдущая
          </Button>
          <Button
            size="sm"
            onClick={() => void handlePageChange(1)}
            isDisabled={
              studentsMeta.offset + studentsMeta.limit >= studentsMeta.total ||
              studentsLoading
            }
          >
            Следующая
          </Button>
        </HStack>
      </HStack>

      <AlertDialog
        isOpen={detachDialog.isOpen}
        leastDestructiveRef={cancelDetachRef}
        onClose={() => {
          setDetachContext(null);
          detachDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Открепить студента от группы
            </AlertDialogHeader>
            <AlertDialogBody>
              {detachContext
                ? `Вы уверены, что хотите открепить ${detachContext.name} от выбранной группы?`
                : "Подтвердите действие."}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelDetachRef}
                onClick={() => {
                  setDetachContext(null);
                  detachDialog.onClose();
                }}
              >
                Отмена
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                onClick={() => void handleConfirmDetach()}
                isLoading={detachLoading}
              >
                Открепить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <Modal isOpen={editDialog.isOpen} onClose={editDialog.onClose} isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleEditStudentSubmit}>
          <ModalHeader>Редактирование студента</ModalHeader>
          <ModalCloseButton isDisabled={editLoading} />
          <ModalBody>
            <Stack spacing={4}>
              {editingStudent && (
                <AvatarEditor
                  name={formatFullName(
                    editingStudent.lastName,
                    editingStudent.firstName,
                    editingStudent.middleName
                  )}
                  avatarUrl={editingStudent.avatarUrl}
                  identifier={editingStudent.id}
                  onUpload={handleStudentAvatarUpload}
                  onDelete={editingStudent.avatarUrl ? handleStudentAvatarDelete : undefined}
                />
              )}
              <FormControl isRequired>
                <FormLabel>Имя</FormLabel>
                <Input
                  value={editStudentForm.firstName}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Фамилия</FormLabel>
                <Input
                  value={editStudentForm.lastName}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Отчество</FormLabel>
                <Input
                  value={editStudentForm.middleName}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      middleName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Электронная почта</FormLabel>
                <Input
                  type="email"
                  value={editStudentForm.email}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="student@example.com"
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={editDialog.onClose} isDisabled={editLoading}>
              Отмена
            </Button>
            <Button colorScheme="brand" type="submit" isLoading={editLoading}>
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={gradebookDialog.isOpen}
        onClose={gradebookDialog.onClose}
        size="6xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {gradebookStudent
              ? `Оценки студента ${formatFullName(
                  gradebookStudent.lastName,
                  gradebookStudent.firstName,
                  gradebookStudent.middleName
                )}`
              : "Оценки студента"}
          </ModalHeader>
          <ModalCloseButton isDisabled={gradebookLoading || gradeUpdating !== null} />
          <ModalBody>
            {gradebookLoading ? (
              <HStack spacing={3}>
                <Spinner size="sm" />
                <Text color="gray.500">Загрузка оценок...</Text>
              </HStack>
            ) : gradebook.length === 0 ? (
              <Text color="gray.500">Оценки не найдены</Text>
            ) : (
              <Accordion allowMultiple>
                {gradebook.map((subject: any) => (
                  <AccordionItem key={subject.subject.id}>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left">
                          <Text fontWeight="semibold">
                            {subject.subject.name}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Код: {subject.subject.code}
                          </Text>
                        </Box>
                        <Badge colorScheme="brand" mr={4}>
                          Средний: {subject.average != null ? Number(subject.average).toFixed(2) : "."}
                        </Badge>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Занятие</Th>
                            <Th textAlign="center">Оценка</Th>
                            <Th>Комментарий</Th>
                            <Th textAlign="right">Действия</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {(subject.sessions ?? []).map((session: any) => {
                            const gradeId: string | undefined = session.gradeId ?? undefined;
                            const gradeValue =
                              gradeId && gradeDrafts[gradeId] !== undefined
                                ? gradeDrafts[gradeId]
                                : session.grade != null
                                ? Number(session.grade).toFixed(0)
                                : "";
                            return (
                              <Tr key={session.session.id}>
                                <Td>
                                  {new Date(session.session.startsAt).toLocaleString("ru-RU")}
                                </Td>
                                <Td textAlign="center">
                                  {gradeId ? (
                                    <Select
                                      size="sm"
                                      value={gradeValue}
                                      onChange={(e) =>
                                        handleGradeDraftChange(gradeId, e.target.value)
                                      }
                                    >
                                      <option value="">Выберите</option>
                                      {gradeOptions.map((value) => (
                                        <option key={value} value={value}>
                                          {value}
                                        </option>
                                      ))}
                                    </Select>
                                  ) : (
                                    <Badge colorScheme="gray">нет оценки</Badge>
                                  )}
                                </Td>
                                <Td>{session.notes ?? ""}</Td>
                                <Td textAlign="right">
                                  <Button
                                    size="xs"
                                    colorScheme="brand"
                                    isDisabled={!gradeId}
                                    isLoading={gradeUpdating === gradeId}
                                    onClick={() =>
                                      gradeId
                                        ? handleGradeSave(gradeId, session.notes)
                                        : undefined
                                    }
                                  >
                                    Сохранить
                                  </Button>
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ModalBody>
          <ModalFooter>
            <Text fontSize="sm" color="gray.500">
              Показано {gradebook.length} из {gradebookMeta.total}
            </Text>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DeanStudents;
```

## File: src/pages/DeanTeachers.tsx
```typescript
import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import {
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
  UnorderedList,
  ListItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import type { AxiosError } from "axios";
import {
  assignTeacherToSubject,
  createDeanTeacher,
  detachTeacherFromSubject,
  fetchDeanGroups,
  fetchDeanSubjects,
  fetchSubjectTeachers,
  fetchDeanTeachers,
  scheduleSession,
  updateDeanTeacher,
  uploadDeanTeacherAvatar,
  deleteDeanTeacherAvatar,
} from "../api/client";
import { formatFullName } from "../utils/name";
import AvatarEditor from "../components/AvatarEditor";
import { invalidateAvatarCache } from "../hooks/useAvatarImage";

const extractApiError = (error: unknown, fallback: string) => {
  const axiosError = error as {
    response?: { data?: { message?: string; error?: string; detail?: string } };
  };
  return (
    axiosError?.response?.data?.message ??
    axiosError?.response?.data?.error ??
    axiosError?.response?.data?.detail ??
    fallback
  );
};

const PAGE_LIMIT = 20;

const DeanTeachers = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teachersMeta, setTeachersMeta] = useState({
    limit: PAGE_LIMIT,
    offset: 0,
    total: 0,
  });
  const [teacherForm, setTeacherForm] = useState({
    password: "",
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
  });
  const [assignmentForm, setAssignmentForm] = useState({
    subjectId: "",
    teacherId: "",
  });
  const [sessionForm, setSessionForm] = useState({
    subjectId: "",
    teacherId: "",
    groupIds: [] as string[],
    date: "",
    slot: 1,
    topic: "",
  });
  const [assignedTeachersBySubject, setAssignedTeachersBySubject] = useState<
    Record<string, any[]>
  >({});
  const [loadingSubjectId, setLoadingSubjectId] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Record<string, any> | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    title: "",
    bio: "",
  });
  const [editTeacherLoading, setEditTeacherLoading] = useState(false);
  const [teacherSubjectsMap, setTeacherSubjectsMap] = useState<
    Record<string, Array<{ id: string; name: string }>>
  >({});
  const [pendingDetachAssignment, setPendingDetachAssignment] = useState<
    { subjectId: string; subjectName: string; teacherId: string; teacherName: string } | null
  >(null);
  const detachConfirmDialog = useDisclosure();
  const detachCancelRef = useRef<HTMLButtonElement | null>(null);
  const [detachProcessing, setDetachProcessing] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const tableBg = useColorModeValue("gray.100", "gray.700");
  const addTeacherPrefix = useId();
  const assignTeacherPrefix = useId();
  const sessionPrefix = useId();
  const sessionGroupsFieldId = useId();
  const teacherSearchFieldId = useId();
  const teacherFormFieldIds = {
    firstName: `${addTeacherPrefix}-first-name`,
    lastName: `${addTeacherPrefix}-last-name`,
    middleName: `${addTeacherPrefix}-middle-name`,
    email: `${addTeacherPrefix}-email`,
    password: `${addTeacherPrefix}-password`,
  };
  const assignmentFieldIds = {
    subject: `${assignTeacherPrefix}-subject`,
    teacher: `${assignTeacherPrefix}-teacher`,
  };
  const sessionFieldIds = {
    subject: `${sessionPrefix}-subject`,
    teacher: `${sessionPrefix}-teacher`,
    date: `${sessionPrefix}-date`,
    slot: `${sessionPrefix}-slot`,
    topic: `${sessionPrefix}-topic`,
  };
  const toast = useToast();
  const editTeacherDialog = useDisclosure();
  const sessionAssignedTeachers =
    assignedTeachersBySubject[sessionForm.subjectId] ?? [];
  const sessionTeachersLoading =
    !!sessionForm.subjectId && loadingSubjectId === sessionForm.subjectId;

  const loadTeachers = useCallback(
    async (offset = 0, query = teacherSearch) => {
      setTeachersLoading(true);
      try {
        const data = await fetchDeanTeachers({
          limit: PAGE_LIMIT,
          offset,
          search: query.trim() ? query.trim() : undefined,
        });
        const list = data.data ?? [];
        setTeachers(list);
        if (data.meta) {
          setTeachersMeta(data.meta);
        } else {
          setTeachersMeta({ limit: PAGE_LIMIT, offset, total: list.length });
        }
        if (
          assignmentForm.teacherId &&
          !list.some((teacher: any) => teacher.id === assignmentForm.teacherId)
        ) {
          setAssignmentForm((prev) => ({ ...prev, teacherId: "" }));
        }
      } finally {
        setTeachersLoading(false);
      }
    },
    [assignmentForm.teacherId, teacherSearch]
  );

  const buildTeacherAssignments = useCallback(
    async (subjectsList: any[]) => {
      const map: Record<string, Array<{ id: string; name: string }>> = {};
      await Promise.all(
        subjectsList.map(async (item: any) => {
          const subjectId = item.id ?? item.subject?.id;
          if (!subjectId) {
            return;
          }
          try {
            const assigned = await fetchSubjectTeachers(subjectId);
            const subjectName = item.name ?? item.subject?.name ?? "";
            (assigned ?? []).forEach((teacher: any) => {
              if (!teacher?.id) {
                return;
              }
              const current = map[teacher.id] ?? [];
              if (!current.some((entry) => entry.id === subjectId)) {
                map[teacher.id] = [
                  ...current,
                  { id: subjectId, name: subjectName },
                ];
              } else {
                map[teacher.id] = current;
              }
            });
          } catch (err) {
            console.error("failed to load teacher assignments", err);
          }
        })
      );
      setTeacherSubjectsMap(map);
    },
    []
  );

  const loadAssignedTeachers = useCallback(async (subjectId: string) => {
    if (!subjectId) {
      return [];
    }
    setLoadingSubjectId(subjectId);
    try {
      const data = await fetchSubjectTeachers(subjectId);
      const list = Array.isArray(data) ? data : [];
      setAssignedTeachersBySubject((prev) => ({
        ...prev,
        [subjectId]: list,
      }));
      return list;
    } catch (subjectError) {
      console.error(subjectError);
      setAssignedTeachersBySubject((prev) => ({
        ...prev,
        [subjectId]: [],
      }));
      return [];
    } finally {
      setLoadingSubjectId((current) =>
        current === subjectId ? null : current
      );
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    try {
      const [subjectsData, groupsData] = await Promise.all([
        fetchDeanSubjects({ limit: PAGE_LIMIT }),
        fetchDeanGroups({ limit: PAGE_LIMIT }),
      ]);
      setSubjects(subjectsData.data ?? []);
      setGroups(groupsData.data ?? []);
      await buildTeacherAssignments(subjectsData.data ?? []);
      await loadTeachers(0, "");
    } catch (catalogError) {
      console.error(catalogError);
      setError("Не удалось загрузить справочники");
    } finally {
      setInitialLoading(false);
    }
  }, [loadTeachers, buildTeacherAssignments]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const handleTeacherSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      await createDeanTeacher({
        password: teacherForm.password,
        firstName: teacherForm.firstName.trim(),
        lastName: teacherForm.lastName.trim(),
        middleName: teacherForm.middleName?.trim()
          ? teacherForm.middleName.trim()
          : undefined,
        email: teacherForm.email?.trim() ? teacherForm.email.trim() : undefined,
      });
      setTeacherForm({
        password: "",
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
      });
      await loadTeachers(teachersMeta.offset, teacherSearch);
    } catch (err) {
      setError("Не удалось создать преподавателя");
    } finally {
      setFormLoading(false);
    }
  };

  const openEditTeacherDialog = (teacher: any) => {
    setEditingTeacher(teacher);
    setEditTeacherForm({
      firstName: teacher.firstName ?? "",
      lastName: teacher.lastName ?? "",
      middleName: teacher.middleName ?? "",
      email: teacher.email ?? "",
      title: teacher.teacherTitle ?? "",
      bio: teacher.teacherBio ?? "",
    });
    editTeacherDialog.onOpen();
  };

  const handleEditTeacherSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTeacher) {
      return;
    }
    setEditTeacherLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      const trim = (value: string) => value.trim();
      const originalFirst = editingTeacher.firstName ?? "";
      const originalLast = editingTeacher.lastName ?? "";
      const originalMiddle = editingTeacher.middleName ?? "";
      const originalEmail = editingTeacher.email ?? "";
      const originalTitle = editingTeacher.teacher?.title ?? "";
      const originalBio = editingTeacher.teacher?.bio ?? "";

      if (trim(editTeacherForm.firstName) !== originalFirst) {
        payload.firstName = trim(editTeacherForm.firstName);
      }
      if (trim(editTeacherForm.lastName) !== originalLast) {
        payload.lastName = trim(editTeacherForm.lastName);
      }
      if (trim(editTeacherForm.middleName) !== originalMiddle) {
        const next = trim(editTeacherForm.middleName);
        payload.middleName = next ? next : null;
      }
      if (trim(editTeacherForm.email) !== originalEmail) {
        const next = trim(editTeacherForm.email);
        payload.email = next ? next : null;
      }
      if (trim(editTeacherForm.title) !== originalTitle) {
        const next = trim(editTeacherForm.title);
        payload.title = next ? next : null;
      }
      if (trim(editTeacherForm.bio) !== originalBio) {
        const next = trim(editTeacherForm.bio);
        payload.bio = next ? next : null;
      }
      if (Object.keys(payload).length === 0) {
        toast({
          title: "Изменения не внесены",
          status: "info",
          duration: 2500,
          isClosable: true,
        });
        return;
      }
      await updateDeanTeacher(editingTeacher.id, payload);
      await loadTeachers(teachersMeta.offset, teacherSearch);
      editTeacherDialog.onClose();
    } catch (err) {
      toast({
        title: "Не удалось обновить данные преподавателя",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setEditTeacherLoading(false);
    }
  };

  const handleAssignmentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { subjectId, teacherId } = assignmentForm;
    if (!subjectId || !teacherId) {
      toast({
        title: "Выберите предмет и преподавателя",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setFormLoading(true);
    setError(null);
    try {
      await assignTeacherToSubject(subjectId, {
        teacherId,
      });
      if (subjectId) {
        await loadAssignedTeachers(subjectId);
      }
      await buildTeacherAssignments(subjects);
      setAssignmentForm((prev) => ({ ...prev, teacherId: "" }));
      toast({
        title: "Преподаватель назначен",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string; error?: string }>;
      const message =
        axiosError?.response?.data?.message ??
        axiosError?.response?.data?.error ??
        "Не удалось назначить преподавателя на предмет";
      setError(message);
      toast({
        title: "Ошибка назначения",
        description: message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSessionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !sessionForm.subjectId ||
      !sessionForm.teacherId ||
      sessionForm.groupIds.length === 0 ||
      !sessionForm.date
    ) {
      return;
    }
    setFormLoading(true);
    setError(null);
    try {
      await scheduleSession({
        subjectId: sessionForm.subjectId,
        teacherId: sessionForm.teacherId,
        groupIds: sessionForm.groupIds,
        date: sessionForm.date,
        slot: sessionForm.slot,
        topic: sessionForm.topic || undefined,
      });
      setSessionForm({
        subjectId: "",
        teacherId: "",
        groupIds: [],
        date: "",
        slot: 1,
        topic: "",
      });
    } catch (err) {
      setError("Не удалось запланировать занятие");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDetachTeacher = async (subjectId: string, teacherId: string) => {
    if (!subjectId || !teacherId) {
      return;
    }
    setDetachProcessing(true);
    setError(null);
    try {
      await detachTeacherFromSubject(subjectId, teacherId);
      await loadAssignedTeachers(subjectId);
      await buildTeacherAssignments(subjects);
      toast({
        title: "Преподаватель откреплён",
        status: "info",
      });
    } catch (err) {
      console.error(err);
      setError("Не удалось открепить преподавателя от предмета");
    } finally {
      setDetachProcessing(false);
    }
  };

  const handleTeacherAvatarUpload = useCallback(
    async (file: File) => {
      if (!editingTeacher) {
        throw new Error("Преподаватель не выбран");
      }
      try {
        const previousPath = editingTeacher.avatarUrl;
        const updated = await uploadDeanTeacherAvatar(editingTeacher.id, file);
        invalidateAvatarCache(previousPath);
        invalidateAvatarCache(updated.avatarUrl);
        setEditingTeacher((prev) =>
          prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev
        );
        await Promise.all([
          loadTeachers(teachersMeta.offset, teacherSearch),
          buildTeacherAssignments(subjects),
        ]);
      } catch (error) {
        throw new Error(
          extractApiError(error, "Не удалось обновить аватар преподавателя")
        );
      }
    },
    [
      editingTeacher,
      loadTeachers,
      teachersMeta.offset,
      teacherSearch,
      buildTeacherAssignments,
      subjects,
    ]
  );

  const handleTeacherAvatarDelete = useCallback(async () => {
    if (!editingTeacher) {
      throw new Error("Преподаватель не выбран");
    }
    try {
      const previousPath = editingTeacher.avatarUrl;
      const updated = await deleteDeanTeacherAvatar(editingTeacher.id);
      invalidateAvatarCache(previousPath);
      invalidateAvatarCache(updated.avatarUrl);
      setEditingTeacher((prev) =>
        prev ? { ...prev, avatarUrl: updated.avatarUrl ?? null } : prev
      );
      await Promise.all([
        loadTeachers(teachersMeta.offset, teacherSearch),
        buildTeacherAssignments(subjects),
      ]);
    } catch (error) {
      throw new Error(
        extractApiError(error, "Не удалось удалить аватар преподавателя")
      );
    }
  }, [
    editingTeacher,
    loadTeachers,
    teachersMeta.offset,
    teacherSearch,
    buildTeacherAssignments,
    subjects,
  ]);

  const handleTeacherSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadTeachers(0, teacherSearch);
  };

  const handleTeachersPageChange = async (direction: number) => {
    const nextOffset = Math.max(
      0,
      teachersMeta.offset + direction * teachersMeta.limit
    );
    if (nextOffset === teachersMeta.offset) {
      return;
    }
    if (nextOffset >= teachersMeta.total && direction > 0) {
      return;
    }
    await loadTeachers(nextOffset, teacherSearch);
  };

  const subjectOptions = useMemo(
    () =>
      subjects.map((subject: any) => ({
        id: subject.id ?? subject.subject?.id,
        label: subject.name ?? subject.subject?.name,
      })),
    [subjects]
  );

  const groupOptions = useMemo(
    () =>
      groups.map((group: any) => ({
        id: group.id,
        label: group.name,
      })),
    [groups]
  );

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        Управление преподавателями
      </Heading>
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} alignItems="flex-start" mb={6}>
        <Stack
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          spacing={3}
          bg={cardBg}
          boxShadow="md"
          as="form"
          onSubmit={handleTeacherSubmit}
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
        >
          <Heading size="md">Добавить преподавателя</Heading>
          <FormControl id={teacherFormFieldIds.firstName} isRequired>
            <FormLabel htmlFor={teacherFormFieldIds.firstName}>Имя</FormLabel>
            <Input
              id={teacherFormFieldIds.firstName}
              value={teacherForm.firstName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, firstName: e.target.value })
              }
            />
          </FormControl>
          <FormControl id={teacherFormFieldIds.lastName} isRequired>
            <FormLabel htmlFor={teacherFormFieldIds.lastName}>Фамилия</FormLabel>
            <Input
              id={teacherFormFieldIds.lastName}
              value={teacherForm.lastName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, lastName: e.target.value })
              }
            />
          </FormControl>
          <FormControl id={teacherFormFieldIds.middleName}>
            <FormLabel htmlFor={teacherFormFieldIds.middleName}>Отчество</FormLabel>
            <Input
              id={teacherFormFieldIds.middleName}
              value={teacherForm.middleName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, middleName: e.target.value })
              }
            />
          </FormControl>
          <FormControl id={teacherFormFieldIds.email}>
            <FormLabel htmlFor={teacherFormFieldIds.email}>Электронная почта</FormLabel>
            <Input
              id={teacherFormFieldIds.email}
              value={teacherForm.email}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, email: e.target.value })
              }
              placeholder="teacher@example.com"
            />
          </FormControl>
          <FormControl id={teacherFormFieldIds.password} isRequired>
            <FormLabel htmlFor={teacherFormFieldIds.password}>Пароль</FormLabel>
            <Input
              id={teacherFormFieldIds.password}
              type="password"
              value={teacherForm.password}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, password: e.target.value })
              }
            />
          </FormControl>
          <Button type="submit" colorScheme="brand" isLoading={formLoading}>
            Сохранить преподавателя
          </Button>
        </Stack>

        <Stack
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          spacing={3}
          bg={cardBg}
          boxShadow="md"
          as="form"
          onSubmit={handleAssignmentSubmit}
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
        >
          <Heading size="md">Назначить преподавателя на предмет</Heading>
          <FormControl id={assignmentFieldIds.subject} isRequired>
            <FormLabel htmlFor={assignmentFieldIds.subject}>Предмет</FormLabel>
            <Select
              id={assignmentFieldIds.subject}
              placeholder="Выберите предмет"
              value={assignmentForm.subjectId}
              onChange={(e) =>
                setAssignmentForm({
                  ...assignmentForm,
                  subjectId: e.target.value,
                })
              }
            >
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.label}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl id={assignmentFieldIds.teacher} isRequired>
            <FormLabel htmlFor={assignmentFieldIds.teacher}>Преподаватель</FormLabel>
            <Select
              id={assignmentFieldIds.teacher}
              placeholder="Выберите преподавателя"
              value={assignmentForm.teacherId}
              onChange={(e) =>
                setAssignmentForm({
                  ...assignmentForm,
                  teacherId: e.target.value,
                })
              }
            >
              {teachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {formatFullName(
                    teacher.lastName,
                    teacher.firstName,
                    teacher.middleName
                  )}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={formLoading}
            isDisabled={!assignmentForm.subjectId || !assignmentForm.teacherId}
          >
            Назначить
          </Button>
        </Stack>

      </SimpleGrid>

      <Stack
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        spacing={3}
        bg={cardBg}
        boxShadow="md"
        as="form"
        onSubmit={handleSessionSubmit}
        transition="transform 0.2s ease, box-shadow 0.2s ease"
        _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
        mb={6}
      >
        <Heading size="md">Планирование занятия</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl id={sessionFieldIds.subject} isRequired>
            <FormLabel htmlFor={sessionFieldIds.subject}>Предмет</FormLabel>
            <Select
              id={sessionFieldIds.subject}
              placeholder="Выберите предмет"
              value={sessionForm.subjectId}
              onChange={(e) => {
                const value = e.target.value;
                setSessionForm((prev) => ({
                  ...prev,
                  subjectId: value,
                  teacherId: "",
                  groupIds: [],
                }));
                if (value && !assignedTeachersBySubject[value]) {
                  void loadAssignedTeachers(value);
                }
              }}
            >
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.label}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl id={sessionFieldIds.teacher} isRequired>
            <FormLabel htmlFor={sessionFieldIds.teacher}>Преподаватель</FormLabel>
            <Select
              id={sessionFieldIds.teacher}
              placeholder={
                !sessionForm.subjectId
                  ? "Сначала выберите предмет"
                  : sessionTeachersLoading
                  ? "Загрузка..."
                  : sessionAssignedTeachers.length === 0
                  ? "Нет назначенных преподавателей"
                  : "Выберите преподавателя"
              }
              value={sessionForm.teacherId}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, teacherId: e.target.value })
              }
              isDisabled={
                !sessionForm.subjectId ||
                sessionTeachersLoading ||
                sessionAssignedTeachers.length === 0
              }
            >
              {sessionAssignedTeachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {formatFullName(
                    teacher.lastName,
                    teacher.firstName,
                    teacher.middleName
                  )}
                </option>
              ))}
            </Select>
            {sessionForm.subjectId && sessionTeachersLoading && (
              <HStack spacing={2} mt={2}>
                <Spinner size="sm" />
                <Text fontSize="sm" color="gray.500">
                  Загрузка преподавателей по предмету...
                </Text>
              </HStack>
            )}
            {sessionForm.subjectId &&
              !sessionTeachersLoading &&
              sessionAssignedTeachers.length === 0 && (
                <Text fontSize="sm" color="gray.500" mt={2}>
                  Для выбранного предмета пока нет назначенных преподавателей.
                </Text>
              )}
          </FormControl>
          <FormControl id={sessionFieldIds.date} isRequired>
            <FormLabel htmlFor={sessionFieldIds.date}>Дата</FormLabel>
            <Input
              id={sessionFieldIds.date}
              type="date"
              value={sessionForm.date}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, date: e.target.value })
              }
            />
          </FormControl>
          <FormControl id={sessionFieldIds.slot} isRequired>
            <FormLabel htmlFor={sessionFieldIds.slot}>Пара</FormLabel>
            <Select
              id={sessionFieldIds.slot}
              value={sessionForm.slot}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, slot: Number(e.target.value) })
              }
            >
              {Array.from({ length: 6 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}-я пара
                </option>
              ))}
            </Select>
          </FormControl>
        </SimpleGrid>
        <FormControl id={sessionFieldIds.topic}>
          <FormLabel htmlFor={sessionFieldIds.topic}>Тема занятия</FormLabel>
          <Input
            id={sessionFieldIds.topic}
            value={sessionForm.topic}
            onChange={(e) =>
              setSessionForm({ ...sessionForm, topic: e.target.value })
            }
            placeholder="Например, Лабораторная работа №1"
          />
        </FormControl>
        <FormControl as="fieldset" isRequired>
          <FormLabel as="legend">
            Группы <Text as="span" color="red.500">*</Text>
          </FormLabel>
          <CheckboxGroup
            value={sessionForm.groupIds}
            onChange={(values) =>
              setSessionForm({ ...sessionForm, groupIds: values as string[] })
            }
          >
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2}>
              {groupOptions.map((group) => (
                <Checkbox
                  key={group.id}
                  value={group.id}
                  id={`${sessionGroupsFieldId}-${group.id}`}
                >
                  {group.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </CheckboxGroup>
        </FormControl>
        <Button type="submit" colorScheme="brand" isLoading={formLoading}>
          Запланировать занятие
        </Button>
      </Stack>

      <Box
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        bg={cardBg}
        boxShadow="md"
        mb={6}
        as="form"
        onSubmit={handleTeacherSearch}
      >
        <Heading size="md" mb={3}>
          Поиск преподавателей
        </Heading>
        <HStack align="flex-end" spacing={4} flexWrap="wrap">
          <FormControl id={teacherSearchFieldId} maxW={{ base: "100%", md: "320px" }}>
            <FormLabel htmlFor={teacherSearchFieldId}>
              Фамилия, имя или ИНС
            </FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                id={teacherSearchFieldId}
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Например, Петров или 00000077"
              />
            </InputGroup>
          </FormControl>
          <HStack spacing={3}>
            <Button
              type="submit"
              colorScheme="brand"
              isLoading={teachersLoading}
            >
              Найти
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setTeacherSearch("");
                void loadTeachers(0, "");
              }}
              isDisabled={teachersLoading && teacherSearch.trim() === ""}
            >
              Сбросить
            </Button>
          </HStack>
        </HStack>
      </Box>

      <Box
        borderWidth="1px"
        borderRadius="xl"
        overflow="hidden"
        bg={cardBg}
        boxShadow="md"
      >
        <Box px={6} py={4} bg={tableBg}>
          <Heading size="md">Преподаватели</Heading>
          <Text fontSize="sm" color="gray.500">
            Найдено: {teachersMeta.total}
          </Text>
        </Box>
        {initialLoading ? (
          <Box px={6} py={8}>
            <HStack spacing={3}>
              <Spinner size="sm" />
              <Text color="gray.500">Загрузка данных...</Text>
            </HStack>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>ФИО</Th>
                  <Th>ИНС</Th>
                  <Th>Email</Th>
                  <Th>Предметы</Th>
                  <Th textAlign="right">Действия</Th>
                </Tr>
              </Thead>
              <Tbody>
                {teachersLoading ? (
                  <Tr>
                    <Td colSpan={5}>
                      <HStack spacing={3}>
                        <Spinner size="sm" />
                        <Text color="gray.500">Обновление списка...</Text>
                      </HStack>
                    </Td>
                  </Tr>
                ) : teachers.length === 0 ? (
                  <Tr>
                    <Td colSpan={5}>
                      <Text color="gray.500">Преподаватели не найдены</Text>
                    </Td>
                  </Tr>
                ) : (
                  teachers.map((teacher: any) => (
                    <Tr key={teacher.id}>
                      <Td>
                        {formatFullName(
                          teacher.lastName,
                          teacher.firstName,
                          teacher.middleName
                        )}
                      </Td>
                      <Td>{teacher.ins ?? "—"}</Td>
                      <Td>{teacher.email ?? "—"}</Td>
                      <Td>
                        {(teacherSubjectsMap[teacher.id] ?? []).length === 0 ? (
                          <Text color="gray.500">Предметы не назначены</Text>
                        ) : (
                          <UnorderedList pl={4} spacing={1}>
                            {(teacherSubjectsMap[teacher.id] ?? []).map(
                              (subject) => {
                                const detachKey = `${subject.id}:${teacher.id}`;
                                return (
                                  <ListItem
                                    key={`${teacher.id}-subject-${subject.id}`}
                                  >
                                    <HStack
                                      justify="space-between"
                                      align="center"
                                      spacing={3}
                                    >
                                      <Text>{subject.name || "Без названия"}</Text>
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        colorScheme="red"
                                        onClick={() => {
                                          setPendingDetachAssignment({
                                            subjectId: subject.id,
                                            subjectName: subject.name || "Без названия",
                                            teacherId: teacher.id,
                                            teacherName: formatFullName(
                                              teacher.lastName,
                                              teacher.firstName,
                                              teacher.middleName
                                            ),
                                          });
                                          detachConfirmDialog.onOpen();
                                        }}
                                      >
                                        Открепить
                                      </Button>
                                    </HStack>
                                  </ListItem>
                                );
                              }
                            )}
                          </UnorderedList>
                        )}
                      </Td>
                      <Td textAlign="right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => openEditTeacherDialog(teacher)}
                        >
                          Редактировать
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <HStack justify="space-between" mt={6} flexWrap="wrap">
        <Text fontSize="sm" color="gray.500">
          Показано {teachers.length} из {teachersMeta.total}
        </Text>
        <HStack spacing={3} mt={{ base: 3, md: 0 }}>
          <Button
            size="sm"
            onClick={() => void handleTeachersPageChange(-1)}
            isDisabled={teachersMeta.offset === 0 || teachersLoading}
          >
            Предыдущая
          </Button>
          <Button
            size="sm"
            onClick={() => void handleTeachersPageChange(1)}
            isDisabled={
              teachersMeta.offset + teachersMeta.limit >= teachersMeta.total ||
              teachersLoading
            }
          >
            Следующая
          </Button>
        </HStack>
      </HStack>

      <AlertDialog
        isOpen={detachConfirmDialog.isOpen && !!pendingDetachAssignment}
        leastDestructiveRef={detachCancelRef}
        onClose={() => {
          if (detachProcessing) return;
          setPendingDetachAssignment(null);
          detachConfirmDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Открепить преподавателя
            </AlertDialogHeader>
            <AlertDialogBody>
              {pendingDetachAssignment
                ? `Открепить ${pendingDetachAssignment.teacherName} от предмета "${pendingDetachAssignment.subjectName}"?`
                : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={detachCancelRef}
                onClick={detachConfirmDialog.onClose}
                isDisabled={detachProcessing}
              >
                Отмена
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                isLoading={detachProcessing}
                onClick={async () => {
                  if (!pendingDetachAssignment) return;
                  setDetachProcessing(true);
                  try {
                    await handleDetachTeacher(
                      pendingDetachAssignment.subjectId,
                      pendingDetachAssignment.teacherId
                    );
                    setPendingDetachAssignment(null);
                    detachConfirmDialog.onClose();
                  } finally {
                    setDetachProcessing(false);
                  }
                }}
              >
                Открепить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal
        isOpen={editTeacherDialog.isOpen}
        onClose={editTeacherDialog.onClose}
        isCentered
      >
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleEditTeacherSubmit}>
          <ModalHeader>Редактирование преподавателя</ModalHeader>
          <ModalCloseButton isDisabled={editTeacherLoading} />
          <ModalBody>
            <Stack spacing={4}>
              {editingTeacher && (
                <AvatarEditor
                  name={formatFullName(
                    editingTeacher.lastName,
                    editingTeacher.firstName,
                    editingTeacher.middleName
                  )}
                  avatarUrl={editingTeacher.avatarUrl}
                  identifier={editingTeacher.id}
                  onUpload={handleTeacherAvatarUpload}
                  onDelete={editingTeacher.avatarUrl ? handleTeacherAvatarDelete : undefined}
                  size="lg"
                />
              )}
              <Stack spacing={3}>
                <FormControl isRequired>
                  <FormLabel>Имя</FormLabel>
                  <Input
                    value={editTeacherForm.firstName}
                    onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Фамилия</FormLabel>
                <Input
                  value={editTeacherForm.lastName}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Отчество</FormLabel>
                <Input
                  value={editTeacherForm.middleName}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      middleName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={editTeacherForm.email}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="teacher@example.com"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Должность</FormLabel>
                <Input
                  value={editTeacherForm.title}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                />
              </FormControl>
                <FormControl>
                  <FormLabel>Биография</FormLabel>
                  <Input
                    value={editTeacherForm.bio}
                    onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      bio: e.target.value,
                    }))
                  }
                  placeholder="Краткая информация"
                />
              </FormControl>
              </Stack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={editTeacherDialog.onClose}
              isDisabled={editTeacherLoading}
            >
              Отмена
            </Button>
            <Button
              colorScheme="brand"
              type="submit"
              isLoading={editTeacherLoading}
            >
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DeanTeachers;
```

## File: src/pages/StudentSubjects.tsx
```typescript
import { useEffect, useState, useId } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  Skeleton,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue
} from "@chakra-ui/react";
import { fetchStudentSubjects, fetchStudentSubjectAverage } from "../api/client";

const PAGE_LIMIT = 5;

const StudentSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [meta, setMeta] = useState({ limit: PAGE_LIMIT, offset: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [averages, setAverages] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const searchInputId = useId();

  const loadSubjects = async (offset = 0, currentSearch = "") => {
    setFetching(true);
    try {
      const data = await fetchStudentSubjects({ limit: PAGE_LIMIT, offset, search: currentSearch || undefined });
      setSubjects(data.data ?? []);
      setMeta(data.meta ?? { limit: PAGE_LIMIT, offset, total: 0 });
    } finally {
      setFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const cardBg = useColorModeValue("white", "gray.800");
  const tableHeaderBg = useColorModeValue("gray.100", "gray.700");
  const panelBg = useColorModeValue("white", "gray.800");

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadSubjects(0, search);
  };

  const handlePageChange = async (direction: number) => {
    const nextOffset = Math.max(0, meta.offset + direction * PAGE_LIMIT);
    if (nextOffset > meta.total) return;
    await loadSubjects(nextOffset, search);
  };

  const handleRefreshAverage = async (subjectId: string) => {
    const data = await fetchStudentSubjectAverage(subjectId);
    setAverages((prev) => ({ ...prev, [subjectId]: data }));
  };

  const badgeForAverage = (value?: number) => {
    if (value == null) return { color: "gray", text: "." };
    if (value >= 4.5) return { color: "green", text: value.toFixed(2) };
    if (value >= 3) return { color: "yellow", text: value.toFixed(2) };
    return { color: "red", text: value.toFixed(2) };
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Мои предметы
      </Heading>
      <Box as="form" onSubmit={handleSearch} mb={6} maxW="lg">
        <FormControl>
          <FormLabel htmlFor={searchInputId}>Поиск по названию или коду</FormLabel>
          <HStack spacing={3}>
            <Input
              id={searchInputId}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Например, математика"
            />
            <Button type="submit" colorScheme="brand" isDisabled={fetching}>
              Найти
            </Button>
          </HStack>
        </FormControl>
      </Box>

      {loading ? (
        <Stack spacing={4}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height="120px" borderRadius="xl" />
          ))}
        </Stack>
      ) : subjects.length === 0 ? (
        <Center py={12}>
          <Text color="gray.500">Предметы не найдены</Text>
        </Center>
      ) : (
        <Accordion allowMultiple borderRadius="xl" borderWidth="1px" overflow="hidden" bg={cardBg}>
          {subjects.map((subject) => {
            const aggregate = averages[subject.subject.id];
            const summaryGrade = aggregate?.subjectAverage ?? subject.average ?? null;
            const badge = badgeForAverage(summaryGrade ?? undefined);
            return (
              <AccordionItem key={subject.subject.id} border="none">
                <h2>
                  <AccordionButton _expanded={{ bg: tableHeaderBg }}>
                    <Box flex="1" textAlign="left">
                      <Heading size="sm">{subject.subject.name}</Heading>
                      <Text fontSize="xs" color="gray.500">
                        Код: {subject.subject.code}
                      </Text>
                    </Box>
                    <Badge colorScheme={badge.color} mr={4} px={3} py={1} borderRadius="md">
                      Средний: {badge.text}
                    </Badge>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel
                  pb={6}
                  bg={panelBg}
                  transition="transform 0.2s ease, box-shadow 0.2s ease"
                >
                  <HStack spacing={3} mb={4} justify="space-between">
                    <Button
                      size="sm"
                      colorScheme="brand"
                      onClick={() => handleRefreshAverage(subject.subject.id)}
                      isLoading={fetching}
                    >
                      Обновить средний балл
                    </Button>
                    {aggregate && (
                      <Text fontSize="sm" color="gray.500">
                        По предмету: {aggregate.subjectAverage != null ? aggregate.subjectAverage.toFixed(2) : "."} · По группе: {aggregate.groupAverage != null ? aggregate.groupAverage.toFixed(2) : "."} · Общий: {aggregate.overallAverage != null ? aggregate.overallAverage.toFixed(2) : "."}
                      </Text>
                    )}
                  </HStack>
                  <Box borderWidth="1px" borderRadius="xl" overflow="hidden">
                    <Table size="sm">
                      <Thead bg={tableHeaderBg}>
                        <Tr>
                          <Th>Дата</Th>
                          <Th textAlign="center">Оценка</Th>
                          <Th>Комментарий</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {subject.sessions.map((session: any) => {
                          const grade = session.grade ?? null;
                          const tag = badgeForAverage(grade ?? undefined);
                          return (
                            <Tr key={session.session.id}>
                              <Td>{new Date(session.session.startsAt).toLocaleString()}</Td>
                              <Td textAlign="center">
                                <Badge colorScheme={grade == null ? "gray" : tag.color} px={2} py={1} borderRadius="md">
                                  {grade == null ? "." : grade.toFixed(0)}
                                </Badge>
                              </Td>
                              <Td>{session.notes ?? ""}</Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <HStack justify="space-between" mt={8}>
        <Text fontSize="sm" color="gray.500">
          Показано {subjects.length} из {meta.total}
        </Text>
        <HStack>
          <Button size="sm" onClick={() => handlePageChange(-1)} isDisabled={meta.offset === 0 || fetching}>
            Назад
          </Button>
          <Button size="sm" onClick={() => handlePageChange(1)} isDisabled={meta.offset + meta.limit >= meta.total || fetching}>
            Вперёд
          </Button>
        </HStack>
      </HStack>

      {fetching && !loading && (
        <Center mt={4}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.500" ml={2}>
            Обновление списка...
          </Text>
        </Center>
      )}
    </Box>
  );
};

export default StudentSubjects;
```

## File: vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0"
  }
});
```

## File: src/components/Header.tsx
```typescript
import { useMemo } from "react";
import {
  Flex,
  Heading,
  Spacer,
  Button,
  HStack,
  IconButton,
  useColorMode,
  useColorModeValue,
  Fade,
  Avatar,
  Tooltip,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { formatFullName } from "../utils/name";
import type { UserSummary } from "../api/client";
import { getAvatarAccentColor } from "../utils/avatarColor";
import { useAvatarImage } from "../hooks/useAvatarImage";

interface HeaderProps {
  onNavigate: (path: string) => void;
  onLogout: () => void;
  role?: string;
  isAuthenticated: boolean;
  profile?: UserSummary | null;
}

const roleLinks: Record<string, Array<{ label: string; page: string }>> = {
  admin: [{ label: "Администрирование", page: "/admin" }],
  dean: [
    { label: "Преподаватели", page: "/dean/teachers" },
    { label: "Студенты", page: "/dean/students" },
    { label: "Группы", page: "/dean/groups" },
    { label: "Предметы", page: "/dean/subjects" }
  ],
  teacher: [
    { label: "Кабинет", page: "/teacher" },
    { label: "Журнал", page: "/teacher/gradebook" }
  ],
  student: [
    { label: "Кабинет", page: "/student" },
    { label: "Мои предметы", page: "/student/subjects" }
  ]
};

const Header = ({ onNavigate, onLogout, role, isAuthenticated, profile }: HeaderProps) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue("rgba(24, 69, 158, 0.9)", "rgba(26, 32, 44, 0.9)");
  const hoverBg = useColorModeValue("rgba(30, 90, 200, 0.85)", "rgba(45, 55, 72, 0.9)");
  const roleSpecificLinks = isAuthenticated ? roleLinks[role ?? ""] ?? [] : [];
  const defaultPage = isAuthenticated ? roleSpecificLinks[0]?.page ?? "/profile" : "/login";
  const avatarName = profile
    ? formatFullName(profile.lastName, profile.firstName, profile.middleName)
    : "Профиль";
  const avatarSrc = useAvatarImage(profile?.avatarUrl);
  const avatarBg = useMemo(
    () =>
      getAvatarAccentColor(
        profile?.id,
        profile?.ins ?? profile?.email ?? undefined
      ),
    [profile?.email, profile?.id, profile?.ins]
  );
  const hasAvatar = Boolean(avatarSrc);
  return (
    <Fade in>
      <Flex
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        w="100%"
        zIndex="popover"
        bg={bg}
        color="white"
        px={{ base: 4, md: 6 }}
        py={{ base: 3, md: 4 }}
        align="center"
        boxShadow="sm"
        transition="box-shadow 0.3s ease"
        backdropFilter="saturate(180%) blur(14px)"
        borderBottomWidth="1px"
        borderColor="whiteAlpha.200"
      >
        <Heading size="md" cursor="pointer" onClick={() => onNavigate(isAuthenticated ? defaultPage : "/login")}>
          GradeFlow
        </Heading>
        <Spacer />
        {isAuthenticated ? (
          <HStack spacing={3}>
            {roleSpecificLinks.map((link) => (
              <Button
                key={link.page}
                variant="ghost"
                color="white"
                _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
                onClick={() => onNavigate(link.page)}
                transition="all 0.2s ease"
              >
                {link.label}
              </Button>
            ))}
            <Tooltip label="Профиль" hasArrow>
              <Avatar
                size="sm"
                name={avatarName}
                src={avatarSrc}
                bg={hasAvatar ? undefined : avatarBg}
                color={hasAvatar ? undefined : "white"}
                cursor="pointer"
                border={hasAvatar ? undefined : "2px solid rgba(255,255,255,0.7)"}
                onClick={() => onNavigate("/profile")}
              />
            </Tooltip>
            <IconButton
              aria-label="Переключить тему"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              variant="ghost"
              color="white"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={toggleColorMode}
            />
            <Button
              variant="outline"
              color="white"
              borderColor="whiteAlpha.800"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={onLogout}
            >
              Выйти
            </Button>
          </HStack>
        ) : (
          <HStack spacing={3}>
            <IconButton
              aria-label="Переключить тему"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              variant="ghost"
              color="white"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={toggleColorMode}
            />
            <Button
              variant="outline"
              color="white"
              borderColor="whiteAlpha.800"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={() => onNavigate("/login")}
            >
              Войти
            </Button>
          </HStack>
        )}
      </Flex>
    </Fade>
  );
};

export default Header;
```

## File: src/pages/AdminDashboard.tsx
```typescript
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  useColorModeValue,
  useDisclosure,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, RepeatIcon, SearchIcon, UnlockIcon } from "@chakra-ui/icons";
import {
  createDeanStaff,
  deleteDeanStaff,
  fetchAdminDeans,
  fetchAdminDeletedGroups,
  fetchAdminDeletedSubjects,
  fetchAdminDeletedUsers,
  fetchAdminUsers,
  restoreAdminGroup,
  restoreAdminSubject,
  restoreAdminUser,
  restoreDeanStaff,
  deleteAdminUser,
  resetAdminUserPassword,
  updateAdminUser,
  uploadAdminUserAvatar,
  deleteAdminUserAvatar,
} from "../api/client";
import AvatarEditor from "../components/AvatarEditor";
import { invalidateAvatarCache } from "../hooks/useAvatarImage";
import { formatFullName } from "../utils/name";

const extractApiError = (error: unknown, fallback: string) => {
  const axiosError = error as {
    response?: { data?: { message?: string; error?: string; detail?: string } };
  };
  return (
    axiosError?.response?.data?.message ??
    axiosError?.response?.data?.error ??
    axiosError?.response?.data?.detail ??
    fallback
  );
};

interface DeanForm {
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  [key: string]: unknown;
}

type ConfirmType =
  | "deleteDean"
  | "deleteUser"
  | "restoreDean"
  | "restoreUser"
  | "restoreGroup"
  | "restoreSubject";
const PAGE_LIMIT = 20;

const AdminDashboard = () => {
  const [deans, setDeans] = useState<any[]>([]);
  const [form, setForm] = useState<DeanForm>({
    password: "",
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [deansLoading, setDeansLoading] = useState(false);
  const [deansMeta, setDeansMeta] = useState({
    limit: PAGE_LIMIT,
    offset: 0,
    total: 0,
  });
  const [deansSearch, setDeansSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const toast = useToast();

  const [activeRole, setActiveRole] = useState<"teacher" | "student" | "dean">(
    "teacher"
  );
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [activeUsersMeta, setActiveUsersMeta] = useState({
    limit: PAGE_LIMIT,
    offset: 0,
    total: 0,
  });
  const [activeUsersSearch, setActiveUsersSearch] = useState("");

  const [deletedRole, setDeletedRole] = useState<
    "teacher" | "student" | "dean"
  >("teacher");
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [deletedUsersLoading, setDeletedUsersLoading] = useState(false);
  const [deletedUsersMeta, setDeletedUsersMeta] = useState({
    limit: PAGE_LIMIT,
    offset: 0,
    total: 0,
  });
  const [deletedUsersSearch, setDeletedUsersSearch] = useState("");

  const [deletedGroups, setDeletedGroups] = useState<any[]>([]);
  const [deletedGroupsLoading, setDeletedGroupsLoading] = useState(false);

  const [deletedSubjects, setDeletedSubjects] = useState<any[]>([]);
  const [deletedSubjectsLoading, setDeletedSubjectsLoading] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    type: ConfirmType;
    id: string;
    label: string;
  } | null>(null);
  const {
    isOpen: isConfirmOpen,
    onOpen: openConfirm,
    onClose: closeConfirm,
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  const {
    isOpen: isPasswordOpen,
    onOpen: openPasswordDialog,
    onClose: closePasswordDialog,
  } = useDisclosure();
  const passwordCancelRef = useRef<HTMLButtonElement | null>(null);
  const [passwordUser, setPasswordUser] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const {
    isOpen: isEditUserOpen,
    onOpen: openEditUserModal,
    onClose: closeEditUserModal,
  } = useDisclosure();
  const [editingUser, setEditingUser] = useState<Record<string, any> | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    title: "",
    bio: "",
    position: "",
  });
  const [editUserLoading, setEditUserLoading] = useState(false);
  const handleUserAvatarUpload = async (file: File) => {
    if (!editingUser) {
      throw new Error("Пользователь не выбран");
    }
    try {
      const previousPath = editingUser.avatarUrl;
      const updated = await uploadAdminUserAvatar(editingUser.id, file);
      invalidateAvatarCache(previousPath);
      invalidateAvatarCache(updated.avatarUrl);
      setEditingUser((prev) =>
        prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev
      );
      await Promise.all([
        loadActiveUsers(activeRole, activeUsersMeta.offset, activeUsersSearch),
        loadDeletedUsers(
          deletedRole,
          deletedUsersMeta.offset,
          deletedUsersSearch
        ),
      ]);
    } catch (error) {
      throw new Error(
        extractApiError(error, "Не удалось обновить аватар пользователя")
      );
    }
  };

  const handleUserAvatarDelete = async () => {
    if (!editingUser) {
      throw new Error("Пользователь не выбран");
    }
    try {
      const previousPath = editingUser.avatarUrl;
      const updated = await deleteAdminUserAvatar(editingUser.id);
      invalidateAvatarCache(previousPath);
      invalidateAvatarCache(updated.avatarUrl);
      setEditingUser((prev) =>
        prev ? { ...prev, avatarUrl: updated.avatarUrl ?? null } : prev
      );
      await Promise.all([
        loadActiveUsers(activeRole, activeUsersMeta.offset, activeUsersSearch),
        loadDeletedUsers(
          deletedRole,
          deletedUsersMeta.offset,
          deletedUsersSearch
        ),
      ]);
    } catch (error) {
      throw new Error(
        extractApiError(error, "Не удалось удалить аватар пользователя")
      );
    }
  };

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");
  const tableHoverBg = useColorModeValue("gray.50", "gray.700");

  const loadDeans = async (offset = 0, query = deansSearch) => {
    setDeansLoading(true);
    try {
      const data = await fetchAdminDeans({
        limit: PAGE_LIMIT,
        offset,
        search: query.trim() ? query.trim() : undefined,
      });
      const list = data.data ?? [];
      if (offset > 0 && list.length === 0 && (data.meta?.total ?? 0) > 0) {
        await loadDeans(
          Math.max(0, (data.meta?.total ?? 0) - PAGE_LIMIT),
          query
        );
        return;
      }
      setDeans(list);
      if (data.meta) {
        setDeansMeta(data.meta);
      } else {
        setDeansMeta({ limit: PAGE_LIMIT, offset, total: list.length });
      }
    } finally {
      setDeansLoading(false);
    }
  };

  const loadActiveUsers = async (
    role: "teacher" | "student" | "dean",
    offset = 0,
    query = activeUsersSearch
  ) => {
    setActiveUsersLoading(true);
    try {
      const data = await fetchAdminUsers(role, {
        limit: PAGE_LIMIT,
        offset,
        search: query.trim() ? query.trim() : undefined,
      });
      const list = data.data ?? [];
      if (offset > 0 && list.length === 0 && (data.meta?.total ?? 0) > 0) {
        await loadActiveUsers(
          role,
          Math.max(0, (data.meta?.total ?? 0) - PAGE_LIMIT),
          query
        );
        return;
      }
      setActiveUsers(list);
      if (data.meta) {
        setActiveUsersMeta(data.meta);
      } else {
        setActiveUsersMeta({ limit: PAGE_LIMIT, offset, total: list.length });
      }
    } finally {
      setActiveUsersLoading(false);
    }
  };

  useEffect(() => {
    loadDeans();
  }, []);

  const handleChange =
    (field: keyof DeanForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      };
      if (form.middleName && form.middleName.trim()) {
        payload.middleName = form.middleName.trim();
      }
      if (form.email && form.email.trim()) {
        payload.email = form.email.trim();
      }
      await createDeanStaff(payload);
      await loadDeans(0, deansSearch);
      setForm({
        password: "",
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
      });
      toast({
        title: "Сотрудник создан",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      setError("Не удалось создать сотрудника");
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      middleName: user.middleName ?? "",
      email: user.email ?? "",
      title: user.teacherTitle ?? "",
      bio: user.teacherBio ?? "",
      position: user.staffPosition ?? "",
    });
    openEditUserModal();
  };

  const handleEditUserSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) {
      return;
    }
    setEditUserLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      const trim = (value: string) => value.trim();
      if (trim(editUserForm.firstName) !== (editingUser.firstName ?? "")) {
        payload.firstName = trim(editUserForm.firstName);
      }
      if (trim(editUserForm.lastName) !== (editingUser.lastName ?? "")) {
        payload.lastName = trim(editUserForm.lastName);
      }
      if (trim(editUserForm.middleName) !== (editingUser.middleName ?? "")) {
        const next = trim(editUserForm.middleName);
        payload.middleName = next ? next : null;
      }
      if (trim(editUserForm.email) !== (editingUser.email ?? "")) {
        const next = trim(editUserForm.email);
        payload.email = next ? next : null;
      }
      if (editingUser.role === "teacher") {
        if (trim(editUserForm.title) !== (editingUser.teacherTitle ?? "")) {
          const next = trim(editUserForm.title);
          payload.title = next ? next : null;
        }
        if (trim(editUserForm.bio) !== (editingUser.teacherBio ?? "")) {
          const next = trim(editUserForm.bio);
          payload.bio = next ? next : null;
        }
      }
      if (editingUser.role === "dean") {
        if (trim(editUserForm.position) !== (editingUser.staffPosition ?? "")) {
          const next = trim(editUserForm.position);
          payload.position = next ? next : null;
        }
      }
      if (Object.keys(payload).length === 0) {
        toast({
          title: "Изменения не внесены",
          status: "info",
          duration: 2500,
          isClosable: true,
        });
        return;
      }
      await updateAdminUser(editingUser.id, payload);
      toast({
        title: "Профиль обновлён",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
      closeEditUserModal();
      setEditingUser(null);
      setEditUserForm({
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
        title: "",
        bio: "",
        position: "",
      });
      await loadActiveUsers(activeRole, activeUsersMeta.offset, activeUsersSearch);
      if (editingUser.role === "dean") {
        await loadDeans(deansMeta.offset, deansSearch);
      }
    } catch (err) {
      toast({
        title: "Не удалось обновить профиль",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleCloseEditUserModal = () => {
    if (editUserLoading) {
      return;
    }
    closeEditUserModal();
    setEditingUser(null);
    setEditUserForm({
      firstName: "",
      lastName: "",
      middleName: "",
      email: "",
      title: "",
      bio: "",
      position: "",
    });
  };

  const openConfirmDialog = (
    action: ConfirmType,
    id: string,
    label: string
  ) => {
    setConfirmAction({ type: action, id, label });
    openConfirm();
  };

  const openPasswordChangeDialog = (user: any) => {
    setPasswordUser({
      id: user.id,
      label: formatFullName(user.lastName, user.firstName, user.middleName),
    });
    setPasswordValue("");
    openPasswordDialog();
  };

  const handleClosePasswordDialog = () => {
    setPasswordUser(null);
    setPasswordValue("");
    closePasswordDialog();
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmProcessing(true);
    try {
      switch (confirmAction.type) {
        case "deleteDean":
          await deleteDeanStaff(confirmAction.id);
          await loadDeans(0, deansSearch);
          toast({
            title: "Сотрудник помечен как удалённый",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
          break;
        case "deleteUser":
          await deleteAdminUser(confirmAction.id);
          await Promise.all([
            loadActiveUsers(
              activeRole,
              activeUsersMeta.offset,
              activeUsersSearch
            ),
            loadDeletedUsers(
              deletedRole,
              deletedUsersMeta.offset,
              deletedUsersSearch
            ),
          ]);
          toast({
            title: "Пользователь удалён",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
          break;
        case "restoreDean":
          await restoreDeanStaff(confirmAction.id);
          await Promise.all([
            loadDeans(0, deansSearch),
            loadDeletedUsers(
              deletedRole,
              deletedUsersMeta.offset,
              deletedUsersSearch
            ),
          ]);
          toast({
            title: "Сотрудник восстановлен",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          break;
        case "restoreUser":
          await restoreAdminUser(confirmAction.id);
          await Promise.all([
            loadDeletedUsers(
              deletedRole,
              deletedUsersMeta.offset,
              deletedUsersSearch
            ),
            loadActiveUsers(
              activeRole,
              activeUsersMeta.offset,
              activeUsersSearch
            ),
          ]);
          toast({
            title: "Пользователь восстановлен",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          break;
        case "restoreGroup":
          await restoreAdminGroup(confirmAction.id);
          await loadDeletedGroups();
          toast({
            title: "Группа восстановлена",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          break;
        case "restoreSubject":
          await restoreAdminSubject(confirmAction.id);
          await loadDeletedSubjects();
          toast({
            title: "Предмет восстановлен",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          break;
        default:
          break;
      }
    } catch (err) {
      toast({
        title: "Операция не выполнена",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setConfirmProcessing(false);
      closeConfirm();
      setConfirmAction(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordUser || !passwordValue.trim()) {
      return;
    }
    setPasswordLoading(true);
    try {
      await resetAdminUserPassword(passwordUser.id, passwordValue.trim());
      toast({
        title: "Пароль обновлён",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setPasswordUser(null);
      setPasswordValue("");
      closePasswordDialog();
      await loadActiveUsers(
        activeRole,
        activeUsersMeta.offset,
        activeUsersSearch
      );
    } catch (err) {
      toast({
        title: "Не удалось обновить пароль",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const loadDeletedUsers = async (
    role: "teacher" | "student" | "dean",
    offset = 0,
    query = deletedUsersSearch
  ) => {
    setDeletedUsersLoading(true);
    try {
      const data = await fetchAdminDeletedUsers(role, {
        limit: PAGE_LIMIT,
        offset,
        search: query.trim() ? query.trim() : undefined,
      });
      const list = data.data ?? [];
      if (offset > 0 && list.length === 0 && (data.meta?.total ?? 0) > 0) {
        await loadDeletedUsers(
          role,
          Math.max(0, (data.meta?.total ?? 0) - PAGE_LIMIT),
          query
        );
        return;
      }
      setDeletedUsers(list);
      if (data.meta) {
        setDeletedUsersMeta(data.meta);
      } else {
        setDeletedUsersMeta({ limit: PAGE_LIMIT, offset, total: list.length });
      }
    } finally {
      setDeletedUsersLoading(false);
    }
  };

  const loadDeletedGroups = async () => {
    setDeletedGroupsLoading(true);
    try {
      const data = await fetchAdminDeletedGroups({ limit: PAGE_LIMIT });
      setDeletedGroups(data.data ?? []);
    } finally {
      setDeletedGroupsLoading(false);
    }
  };

  const loadDeletedSubjects = async () => {
    setDeletedSubjectsLoading(true);
    try {
      const data = await fetchAdminDeletedSubjects({ limit: PAGE_LIMIT });
      setDeletedSubjects(data.data ?? []);
    } finally {
      setDeletedSubjectsLoading(false);
    }
  };

  const handleDeansSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadDeans(0, deansSearch);
  };

  const handleActiveUsersSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadActiveUsers(activeRole, 0, activeUsersSearch);
  };

  const handleDeletedUsersSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadDeletedUsers(deletedRole, 0, deletedUsersSearch);
  };

  const handleDeansPageChange = async (direction: number) => {
    const nextOffset = Math.max(
      0,
      deansMeta.offset + direction * deansMeta.limit
    );
    if (direction > 0 && nextOffset >= deansMeta.total) {
      return;
    }
    await loadDeans(nextOffset, deansSearch);
  };

  const handleActiveUsersPageChange = async (direction: number) => {
    const nextOffset = Math.max(
      0,
      activeUsersMeta.offset + direction * activeUsersMeta.limit
    );
    if (direction > 0 && nextOffset >= activeUsersMeta.total) {
      return;
    }
    await loadActiveUsers(activeRole, nextOffset, activeUsersSearch);
  };

  const handleDeletedUsersPageChange = async (direction: number) => {
    const nextOffset = Math.max(
      0,
      deletedUsersMeta.offset + direction * deletedUsersMeta.limit
    );
    if (direction > 0 && nextOffset >= deletedUsersMeta.total) {
      return;
    }
    await loadDeletedUsers(deletedRole, nextOffset, deletedUsersSearch);
  };

  useEffect(() => {
    if (tabIndex === 0) {
      void loadDeans(0, deansSearch);
    } else if (tabIndex === 1) {
      void loadActiveUsers(activeRole, 0, activeUsersSearch);
    } else if (tabIndex === 2) {
      void loadDeletedUsers(deletedRole, 0, deletedUsersSearch);
    } else if (tabIndex === 3) {
      void loadDeletedGroups();
    } else if (tabIndex === 4) {
      void loadDeletedSubjects();
    }
  }, [tabIndex]);

  useEffect(() => {
    if (tabIndex === 2) {
      void loadDeletedUsers(deletedRole, 0, deletedUsersSearch);
    }
  }, [deletedRole, tabIndex]);

  useEffect(() => {
    if (tabIndex === 1) {
      void loadActiveUsers(activeRole, 0, activeUsersSearch);
    }
  }, [activeRole, tabIndex]);

  const activeDeansTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>ФИО</Th>
          <Th>ИНС</Th>
          <Th>Почта</Th>
          <Th textAlign="right">Действия</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deans.map((dean) => (
          <Tr key={dean.id} _hover={{ bg: tableHoverBg }}>
            <Td>
              {formatFullName(dean.lastName, dean.firstName, dean.middleName)}
            </Td>
            <Td>{dean.ins ?? "—"}</Td>
            <Td>{dean.email ?? "—"}</Td>
            <Td textAlign="right">
              <Tooltip label="Удалить" placement="top">
                <IconButton
                  aria-label="Удалить"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() =>
                    openConfirmDialog(
                      "deleteDean",
                      dean.id,
                      formatFullName(
                        dean.lastName,
                        dean.firstName,
                        dean.middleName
                      )
                    )
                  }
                />
              </Tooltip>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const activeUsersTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>ФИО</Th>
          <Th>ИНС</Th>
          <Th>Почта</Th>
          <Th>Роль</Th>
          <Th textAlign="right">Действия</Th>
        </Tr>
      </Thead>
      <Tbody>
        {activeUsers.map((user) => (
          <Tr key={user.id} _hover={{ bg: tableHoverBg }}>
            <Td>
              {formatFullName(user.lastName, user.firstName, user.middleName)}
            </Td>
            <Td>{user.ins ?? "—"}</Td>
            <Td>{user.email ?? "—"}</Td>
            <Td>
              <Badge colorScheme="brand">{user.role}</Badge>
            </Td>
            <Td textAlign="right">
              <HStack justify="flex-end" spacing={1}>
                <Tooltip label="Редактировать профиль" placement="top">
                  <IconButton
                    aria-label="Редактировать профиль"
                    icon={<EditIcon />}
                    size="sm"
                    colorScheme="brand"
                    variant="ghost"
                    onClick={() => openEditUser(user)}
                  />
                </Tooltip>
                <Tooltip label="Сбросить пароль" placement="top">
                  <IconButton
                    aria-label="Сбросить пароль"
                    icon={<UnlockIcon />}
                    size="sm"
                    colorScheme="blue"
                    variant="ghost"
                    onClick={() => openPasswordChangeDialog(user)}
                  />
                </Tooltip>
                <Tooltip label="Удалить пользователя" placement="top">
                  <IconButton
                    aria-label="Удалить пользователя"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() =>
                      openConfirmDialog(
                        "deleteUser",
                        user.id,
                        formatFullName(
                          user.lastName,
                          user.firstName,
                          user.middleName
                        )
                      )
                    }
                  />
                </Tooltip>
              </HStack>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const deletedUsersTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>ФИО</Th>
          <Th>ИНС</Th>
          <Th>Почта</Th>
          <Th>Роль</Th>
          <Th textAlign="right">Восстановление</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deletedUsers.map((user) => (
          <Tr key={user.id} _hover={{ bg: tableHoverBg }}>
            <Td>
              {formatFullName(user.lastName, user.firstName, user.middleName)}
            </Td>
            <Td>{user.ins ?? "—"}</Td>
            <Td>{user.email ?? "—"}</Td>
            <Td>
              <Badge colorScheme="brand">{user.role}</Badge>
            </Td>
            <Td textAlign="right">
              <IconButton
                aria-label="Восстановить"
                icon={<RepeatIcon />}
                size="sm"
                colorScheme="brand"
                variant="ghost"
                onClick={() =>
                  openConfirmDialog(
                    "restoreUser",
                    user.id,
                    formatFullName(
                      user.lastName,
                      user.firstName,
                      user.middleName
                    )
                  )
                }
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const deletedGroupsTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>Название</Th>
          <Th>Описание</Th>
          <Th textAlign="right">Восстановление</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deletedGroups.map((group) => (
          <Tr key={group.id} _hover={{ bg: tableHoverBg }}>
            <Td>{group.name}</Td>
            <Td>{group.description ?? "—"}</Td>
            <Td textAlign="right">
              <IconButton
                aria-label="Восстановить группу"
                icon={<RepeatIcon />}
                size="sm"
                colorScheme="brand"
                variant="ghost"
                onClick={() =>
                  openConfirmDialog("restoreGroup", group.id, group.name)
                }
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const deletedSubjectsTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>Код</Th>
          <Th>Название</Th>
          <Th textAlign="right">Восстановление</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deletedSubjects.map((subject) => (
          <Tr key={subject.id} _hover={{ bg: tableHoverBg }}>
            <Td>{subject.code}</Td>
            <Td>{subject.name}</Td>
            <Td textAlign="right">
              <IconButton
                aria-label="Восстановить предмет"
                icon={<RepeatIcon />}
                size="sm"
                colorScheme="brand"
                variant="ghost"
                onClick={() =>
                  openConfirmDialog("restoreSubject", subject.id, subject.name)
                }
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const confirmMessages: Record<ConfirmType, string> = {
    deleteDean: "Удалить сотрудника и пометить его аккаунт как неактивный?",
    deleteUser:
      "Удалить выбранного пользователя и пометить его аккаунт как неактивный?",
    restoreDean: "Восстановить сотрудника деканата и вернуть доступ?",
    restoreUser: "Восстановить выбранного пользователя?",
    restoreGroup: "Восстановить выбранную группу?",
    restoreSubject: "Восстановить выбранный предмет?",
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        Панель администратора
      </Heading>
      <Tabs
        index={tabIndex}
        onChange={setTabIndex}
        colorScheme="brand"
        variant="enclosed"
      >
        <TabList>
          <Tab>Сотрудники деканата</Tab>
          <Tab>Пользователи</Tab>
          <Tab>Удалённые пользователи</Tab>
          <Tab>Удалённые группы</Tab>
          <Tab>Удалённые предметы</Tab>
        </TabList>
        <TabPanels mt={4}>
          <TabPanel>
            <Stack
              spacing={6}
              direction={{ base: "column", lg: "row" }}
              align="flex-start"
            >
              <Box
                flex={1}
                borderWidth="1px"
                borderRadius="xl"
                p={6}
                bg={cardBg}
                boxShadow={cardShadow}
              >
                <Heading size="md" mb={4}>
                  Создать сотрудника деканата
                </Heading>
                <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <FormControl isRequired>
                      <FormLabel>Имя</FormLabel>
                      <Input
                        value={form.firstName}
                        onChange={handleChange("firstName")}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Фамилия</FormLabel>
                      <Input
                        value={form.lastName}
                        onChange={handleChange("lastName")}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Отчество</FormLabel>
                      <Input
                        value={form.middleName ?? ""}
                        onChange={handleChange("middleName")}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Электронная почта</FormLabel>
                      <Input
                        value={form.email ?? ""}
                        onChange={handleChange("email")}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Пароль</FormLabel>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={handleChange("password")}
                      />
                    </FormControl>
                    <Button
                      type="submit"
                      colorScheme="brand"
                      isLoading={createLoading}
                      transition="transform 0.2s ease, box-shadow 0.2s ease"
                      _hover={{
                        transform: "translateY(-2px)",
                        boxShadow: "md",
                      }}
                    >
                      Создать
                    </Button>
                    {error && (
                      <Alert status="error">
                        <AlertIcon />
                        {error}
                      </Alert>
                    )}
                  </Stack>
                </form>
              </Box>
              <Box
                flex={2}
                borderWidth="1px"
                borderRadius="xl"
                p={6}
                bg={cardBg}
                boxShadow={cardShadow}
                overflowX="auto"
              >
                <HStack
                  justify="space-between"
                  align="center"
                  mb={4}
                  flexWrap="wrap"
                >
                  <Heading size="md">Сотрудники деканата</Heading>
                  <Text fontSize="sm" color="gray.500">
                    Найдено: {deansMeta.total}
                  </Text>
                </HStack>
                <Box
                  as="form"
                  onSubmit={handleDeansSearchSubmit}
                  mb={4}
                  maxW={{ base: "100%", md: "360px" }}
                >
                  <FormControl>
                    <FormLabel>Поиск по ФИО или ИНС</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        value={deansSearch}
                        onChange={(event) => setDeansSearch(event.target.value)}
                        placeholder="Например, Иванова"
                      />
                    </InputGroup>
                  </FormControl>
                  <HStack spacing={3} mt={3}>
                    <Button
                      type="submit"
                      colorScheme="brand"
                      isLoading={deansLoading}
                    >
                      Найти
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDeansSearch("");
                        void loadDeans(0, "");
                      }}
                      isDisabled={deansLoading && deansSearch.trim() === ""}
                    >
                      Сбросить
                    </Button>
                  </HStack>
                </Box>
                {deansLoading ? (
                  <Center py={10}>
                    <Spinner />
                  </Center>
                ) : deans.length === 0 ? (
                  <Text color="gray.500">Список пуст</Text>
                ) : (
                  activeDeansTable
                )}
                <HStack justify="space-between" mt={4} flexWrap="wrap">
                  <Text fontSize="sm" color="gray.500">
                    Показано {deans.length} из {deansMeta.total}
                  </Text>
                  <HStack spacing={3} mt={{ base: 3, md: 0 }}>
                    <Button
                      size="sm"
                      onClick={() => void handleDeansPageChange(-1)}
                      isDisabled={deansMeta.offset === 0 || deansLoading}
                    >
                      Предыдущая
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleDeansPageChange(1)}
                      isDisabled={
                        deansMeta.offset + deansMeta.limit >= deansMeta.total ||
                        deansLoading
                      }
                    >
                      Следующая
                    </Button>
                  </HStack>
                </HStack>
              </Box>
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack
              spacing={4}
              borderWidth="1px"
              borderRadius="xl"
              p={6}
              bg={cardBg}
              boxShadow={cardShadow}
            >
              <HStack justify="space-between" align="center">
                <Heading size="md">Пользователи</Heading>
                <Select
                  value={activeRole}
                  onChange={(event) =>
                    setActiveRole(
                      event.target.value as "teacher" | "student" | "dean"
                    )
                  }
                  maxW="xs"
                >
                  <option value="teacher">Преподаватели</option>
                  <option value="student">Студенты</option>
                  <option value="dean">Сотрудники деканата</option>
                </Select>
              </HStack>
              <Box
                as="form"
                onSubmit={handleActiveUsersSearchSubmit}
                maxW={{ base: "100%", md: "360px" }}
              >
                <FormControl>
                  <FormLabel>Поиск по ФИО или ИНС</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      value={activeUsersSearch}
                      onChange={(event) =>
                        setActiveUsersSearch(event.target.value)
                      }
                      placeholder="Например, 00000045"
                    />
                  </InputGroup>
                </FormControl>
                <HStack spacing={3} mt={3}>
                  <Button
                    type="submit"
                    colorScheme="brand"
                    isLoading={activeUsersLoading}
                  >
                    Найти
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveUsersSearch("");
                      void loadActiveUsers(activeRole, 0, "");
                    }}
                    isDisabled={
                      activeUsersLoading && activeUsersSearch.trim() === ""
                    }
                  >
                    Сбросить
                  </Button>
                </HStack>
              </Box>
              {activeUsersLoading ? (
                <Center py={8}>
                  <Spinner />
                </Center>
              ) : activeUsers.length === 0 ? (
                <Text color="gray.500">
                  Нет пользователей по выбранной роли
                </Text>
              ) : (
                activeUsersTable
              )}
              <HStack justify="space-between" mt={2} flexWrap="wrap">
                <Text fontSize="sm" color="gray.500">
                  Показано {activeUsers.length} из {activeUsersMeta.total}
                </Text>
                <HStack spacing={3} mt={{ base: 3, md: 0 }}>
                  <Button
                    size="sm"
                    onClick={() => void handleActiveUsersPageChange(-1)}
                    isDisabled={
                      activeUsersMeta.offset === 0 || activeUsersLoading
                    }
                  >
                    Предыдущая
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleActiveUsersPageChange(1)}
                    isDisabled={
                      activeUsersMeta.offset + activeUsersMeta.limit >=
                        activeUsersMeta.total || activeUsersLoading
                    }
                  >
                    Следующая
                  </Button>
                </HStack>
              </HStack>
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack
              spacing={4}
              borderWidth="1px"
              borderRadius="xl"
              p={6}
              bg={cardBg}
              boxShadow={cardShadow}
            >
              <HStack justify="space-between">
                <Heading size="md">Удалённые пользователи</Heading>
                <Select
                  value={deletedRole}
                  onChange={(event) =>
                    setDeletedRole(
                      event.target.value as "teacher" | "student" | "dean"
                    )
                  }
                  maxW="xs"
                >
                  <option value="teacher">Преподаватели</option>
                  <option value="student">Студенты</option>
                  <option value="dean">Сотрудники деканата</option>
                </Select>
              </HStack>
              <Box
                as="form"
                onSubmit={handleDeletedUsersSearchSubmit}
                maxW={{ base: "100%", md: "360px" }}
              >
                <FormControl>
                  <FormLabel>Поиск по ФИО или ИНС</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      value={deletedUsersSearch}
                      onChange={(event) =>
                        setDeletedUsersSearch(event.target.value)
                      }
                      placeholder="Например, 00000031"
                    />
                  </InputGroup>
                </FormControl>
                <HStack spacing={3} mt={3}>
                  <Button
                    type="submit"
                    colorScheme="brand"
                    isLoading={deletedUsersLoading}
                  >
                    Найти
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDeletedUsersSearch("");
                      void loadDeletedUsers(deletedRole, 0, "");
                    }}
                    isDisabled={
                      deletedUsersLoading && deletedUsersSearch.trim() === ""
                    }
                  >
                    Сбросить
                  </Button>
                </HStack>
              </Box>
              {deletedUsersLoading ? (
                <Center py={8}>
                  <Spinner />
                </Center>
              ) : deletedUsers.length === 0 ? (
                <Text color="gray.500">Нет удалённых пользователей</Text>
              ) : (
                deletedUsersTable
              )}
              <HStack justify="space-between" mt={2} flexWrap="wrap">
                <Text fontSize="sm" color="gray.500">
                  Показано {deletedUsers.length} из {deletedUsersMeta.total}
                </Text>
                <HStack spacing={3} mt={{ base: 3, md: 0 }}>
                  <Button
                    size="sm"
                    onClick={() => void handleDeletedUsersPageChange(-1)}
                    isDisabled={
                      deletedUsersMeta.offset === 0 || deletedUsersLoading
                    }
                  >
                    Предыдущая
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleDeletedUsersPageChange(1)}
                    isDisabled={
                      deletedUsersMeta.offset + deletedUsersMeta.limit >=
                        deletedUsersMeta.total || deletedUsersLoading
                    }
                  >
                    Следующая
                  </Button>
                </HStack>
              </HStack>
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack
              spacing={4}
              borderWidth="1px"
              borderRadius="xl"
              p={6}
              bg={cardBg}
              boxShadow={cardShadow}
            >
              <Heading size="md">Удалённые группы</Heading>
              {deletedGroupsLoading ? (
                <Center py={8}>
                  <Spinner />
                </Center>
              ) : deletedGroups.length === 0 ? (
                <Text color="gray.500">Нет удалённых групп</Text>
              ) : (
                deletedGroupsTable
              )}
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack
              spacing={4}
              borderWidth="1px"
              borderRadius="xl"
              p={6}
              bg={cardBg}
              boxShadow={cardShadow}
            >
              <Heading size="md">Удалённые предметы</Heading>
              {deletedSubjectsLoading ? (
                <Center py={8}>
                  <Spinner />
                </Center>
              ) : deletedSubjects.length === 0 ? (
                <Text color="gray.500">Нет удалённых предметов</Text>
              ) : (
                deletedSubjectsTable
              )}
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={isEditUserOpen} onClose={handleCloseEditUserModal} isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleEditUserSubmit}>
          <ModalHeader>Редактирование пользователя</ModalHeader>
          <ModalCloseButton isDisabled={editUserLoading} />
          <ModalBody>
            <Stack spacing={4}>
              {editingUser && (
                <AvatarEditor
                  name={formatFullName(
                    editingUser.lastName,
                    editingUser.firstName,
                    editingUser.middleName
                  )}
                  avatarUrl={editingUser.avatarUrl}
                  identifier={editingUser.id}
                  onUpload={handleUserAvatarUpload}
                  onDelete={editingUser.avatarUrl ? handleUserAvatarDelete : undefined}
                  size="lg"
                />
              )}
              <Stack spacing={3}>
                <FormControl isRequired>
                  <FormLabel>Имя</FormLabel>
                  <Input
                    value={editUserForm.firstName}
                    onChange={(event) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      firstName: event.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Фамилия</FormLabel>
                <Input
                  value={editUserForm.lastName}
                  onChange={(event) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      lastName: event.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Отчество</FormLabel>
                <Input
                  value={editUserForm.middleName}
                  onChange={(event) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      middleName: event.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={editUserForm.email}
                  onChange={(event) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  placeholder="user@example.com"
                />
              </FormControl>
              {editingUser?.role === "teacher" && (
                <>
                  <FormControl>
                    <FormLabel>Должность</FormLabel>
                    <Input
                      value={editUserForm.title}
                      onChange={(event) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Биография</FormLabel>
                    <Input
                      value={editUserForm.bio}
                      onChange={(event) =>
                        setEditUserForm((prev) => ({
                          ...prev,
                          bio: event.target.value,
                        }))
                      }
                      placeholder="Краткая информация"
                    />
                  </FormControl>
                </>
              )}
              {editingUser?.role === "dean" && (
                <FormControl>
                  <FormLabel>Должность</FormLabel>
                  <Input
                    value={editUserForm.position}
                    onChange={(event) =>
                      setEditUserForm((prev) => ({
                        ...prev,
                        position: event.target.value,
                      }))
                    }
                  />
                </FormControl>
              )}
              </Stack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={handleCloseEditUserModal}
              isDisabled={editUserLoading}
            >
              Отмена
            </Button>
            <Button colorScheme="brand" type="submit" isLoading={editUserLoading}>
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!confirmProcessing) closeConfirm();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Подтверждение
            </AlertDialogHeader>
            <AlertDialogBody>
              {confirmAction
                ? `${confirmMessages[confirmAction.type]} (${
                    confirmAction.label
                  })`
                : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={closeConfirm}
                isDisabled={confirmProcessing}
              >
                Отмена
              </Button>
              <Button
                colorScheme="brand"
                onClick={handleConfirmAction}
                isLoading={confirmProcessing}
                ml={3}
              >
                Подтвердить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        leastDestructiveRef={passwordCancelRef}
        isOpen={isPasswordOpen}
        onClose={handleClosePasswordDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Сброс пароля
            </AlertDialogHeader>
            <AlertDialogBody>
              <Stack spacing={3}>
                <Text>
                  {passwordUser ? `Новый пароль для ${passwordUser.label}` : ""}
                </Text>
                <FormControl isRequired>
                  <FormLabel>Пароль</FormLabel>
                  <Input
                    type="password"
                    value={passwordValue}
                    minLength={8}
                    onChange={(event) => setPasswordValue(event.target.value)}
                    placeholder="Введите новый пароль"
                  />
                </FormControl>
              </Stack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={passwordCancelRef}
                onClick={handleClosePasswordDialog}
                isDisabled={passwordLoading}
              >
                Отмена
              </Button>
              <Button
                colorScheme="brand"
                onClick={handlePasswordReset}
                isLoading={passwordLoading}
                ml={3}
                isDisabled={!passwordValue.trim()}
              >
                Сохранить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default AdminDashboard;
```

## File: src/pages/DeanGroups.tsx
```typescript
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Heading,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Button,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  HStack,
  Center,
  Spinner,
  useColorModeValue,
  useDisclosure,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  fetchDeanGroups,
  createDeanGroup,
  fetchGroupRanking,
  deleteDeanGroup,
  fetchDeanStudents,
  detachStudentFromGroup,
} from "../api/client";
import { formatFullName } from "../utils/name";
import { DeleteIcon } from "@chakra-ui/icons";

const extractError = (error: unknown, fallback: string) => {
  const axiosError = error as {
    response?: { data?: { message?: string; error?: string; detail?: string } };
  };
  return (
    axiosError?.response?.data?.message ??
    axiosError?.response?.data?.error ??
    axiosError?.response?.data?.detail ??
    fallback
  );
};

const DeanGroups = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const toast = useToast();
  const [pendingGroup, setPendingGroup] = useState<{ id: string; name: string } | null>(null);
  const deleteDialog = useDisclosure();
  const deleteCancelRef = useRef<HTMLButtonElement | null>(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [detachContext, setDetachContext] = useState<{
    studentId: string;
    studentName: string;
    groupId: string;
    groupName: string;
  } | null>(null);
  const detachDialog = useDisclosure();
  const detachCancelRef = useRef<HTMLButtonElement | null>(null);
  const [detachProcessing, setDetachProcessing] = useState(false);

  const load = async () => {
    try {
      setIsFetching(true);
      const [groupsData, rankingData, studentsData] = await Promise.all([
        fetchDeanGroups({ limit: 100, offset: 0 }),
        fetchGroupRanking(),
        fetchDeanStudents({ limit: 1000, offset: 0 }),
      ]);
      setGroups(groupsData.data ?? []);
      setRanking(rankingData.items ?? []);
      const memberMap: Record<string, any[]> = {};
      (studentsData.data ?? []).forEach((student: any) => {
        const grp = student.group ?? student.student?.group ?? null;
        if (!grp?.id) {
          return;
        }
        const list = memberMap[grp.id] ?? [];
        memberMap[grp.id] = [...list, student];
      });
      setGroupMembers(memberMap);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await createDeanGroup({ name, description });
      await load();
      setName("");
      setDescription("");
      toast({ title: "Группа создана", status: "success", duration: 2500, isClosable: true });
    } catch (error) {
      toast({
        title: "Не удалось создать группу",
        description: extractError(error, "Попробуйте позже"),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");
  const groupList = useMemo(() => groups ?? [], [groups]);
  const rankingList = useMemo(() => ranking ?? [], [ranking]);

  return (
    <>
      <Box p={6}>
      <Heading size="lg" mb={6}>
        Учебные группы
      </Heading>
      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6} alignItems="stretch">
        <Box
          as="form"
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          display="flex"
          flexDirection="column"
          onSubmit={handleSubmit}
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
        >
          <Heading size="md" mb={4}>
            Создать группу
          </Heading>
          <Stack spacing={3} flex="1">
            <FormControl isRequired>
              <FormLabel>Название</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Описание</FormLabel>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormControl>
          </Stack>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={loading}
            alignSelf="flex-start"
            mt={4}
          >
            Сохранить
          </Button>
        </Box>
        <Box
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
        >
          <Heading size="md" mb={4}>
            Список групп
          </Heading>
          <Box flex="1" overflow="auto">
            {isFetching ? (
              <Center py={8}>
                <Spinner size="lg" thickness="4px" color="brand.500" />
              </Center>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Название</Th>
                    <Th>Описание</Th>
                    <Th textAlign="right">Действия</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {groupList.map((group) => (
                    <Tr key={group.id}>
                      <Td>{group.name}</Td>
                      <Td>{group.description ?? "—"}</Td>
                      <Td textAlign="right">
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          leftIcon={<DeleteIcon />}
                          onClick={() => {
                            setPendingGroup({ id: group.id, name: group.name });
                            deleteDialog.onOpen();
                          }}
                        >
                          Удалить
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>
        </Box>
        <Box
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
        >
          <Heading size="md" mb={4}>
            Рейтинг групп
          </Heading>
          {isFetching ? (
            <Center py={8}>
              <Spinner size="lg" thickness="4px" color="brand.500" />
            </Center>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Группа</Th>
                  <Th>Средний балл</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rankingList.map((item: any) => (
                  <Tr key={item.group.id}>
                    <Td>{item.group.name}</Td>
                    <Td>{item.average ? item.average.toFixed(2) : "."}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </SimpleGrid>
      <Box
        mt={6}
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        bg={cardBg}
        boxShadow={cardShadow}
        overflowX="auto"
      >
        <Heading size="md" mb={4}>
          Состав групп
        </Heading>
        {isFetching ? (
          <Center py={10}>
            <Spinner size="lg" thickness="4px" color="brand.500" />
          </Center>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Группа</Th>
                <Th>Студенты</Th>
              </Tr>
            </Thead>
            <Tbody>
              {groups.length === 0 ? (
                <Tr>
                  <Td colSpan={2}>
                    <Text color="gray.500">Группы не найдены</Text>
                  </Td>
                </Tr>
              ) : (
                groups.map((group) => (
                  <Tr key={`members-${group.id}`}>
                    <Td>{group.name}</Td>
                    <Td>
                      {(groupMembers[group.id] ?? []).length === 0 ? (
                        <Text color="gray.500">Студентов пока нет</Text>
                      ) : (
                        <Stack spacing={2}>
                          {(groupMembers[group.id] ?? []).map((student: any) => (
                            <HStack
                              key={student.id}
                              justify="space-between"
                              align="center"
                              spacing={3}
                            >
                              <Text>
                                {formatFullName(
                                  student.lastName,
                                  student.firstName,
                                  student.middleName
                                )}
                              </Text>
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="outline"
                                onClick={() => {
                                  setDetachContext({
                                    studentId: student.id,
                                    studentName: formatFullName(
                                      student.lastName,
                                      student.firstName,
                                      student.middleName
                                    ),
                                    groupId: group.id,
                                    groupName: group.name,
                                  });
                                  detachDialog.onOpen();
                                }}
                              >
                                Открепить
                              </Button>
                            </HStack>
                          ))}
                        </Stack>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </Box>
    </Box>
      <AlertDialog
        isOpen={deleteDialog.isOpen && !!pendingGroup}
        leastDestructiveRef={deleteCancelRef}
        onClose={() => {
          setPendingGroup(null);
          deleteDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Удалить группу
            </AlertDialogHeader>
            <AlertDialogBody>
              {pendingGroup ? `Вы уверены, что хотите удалить группу "${pendingGroup.name}"?` : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={deleteCancelRef} onClick={deleteDialog.onClose} isDisabled={deleteProcessing}>
                Отмена
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                isLoading={deleteProcessing}
                onClick={async () => {
                  if (!pendingGroup) return;
                  setDeleteProcessing(true);
                  try {
                    await deleteDeanGroup(pendingGroup.id);
                    await load();
                    toast({ title: "Группа удалена", status: "info", duration: 2500, isClosable: true });
                  } catch (error) {
                    toast({
                      title: "Не удалось удалить группу",
                      description: extractError(error, "Попробуйте позже"),
                      status: "error",
                      duration: 3000,
                      isClosable: true,
                    });
                  } finally {
                    setDeleteProcessing(false);
                    setPendingGroup(null);
                    deleteDialog.onClose();
                  }
                }}
              >
                Удалить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={detachDialog.isOpen && !!detachContext}
        leastDestructiveRef={detachCancelRef}
        onClose={() => {
          setDetachContext(null);
          detachDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Открепить студента
            </AlertDialogHeader>
            <AlertDialogBody>
              {detachContext
                ? `Открепить ${detachContext.studentName} от группы "${detachContext.groupName}"?`
                : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={detachCancelRef}
                onClick={detachDialog.onClose}
                isDisabled={detachProcessing}
              >
                Отмена
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                isLoading={detachProcessing}
                onClick={async () => {
                  if (!detachContext) return;
                  setDetachProcessing(true);
                  try {
                    await detachStudentFromGroup(detachContext.groupId, detachContext.studentId);
                    await load();
                    toast({ title: "Студент откреплён", status: "info", duration: 2500, isClosable: true });
                  } catch (error) {
                    toast({
                      title: "Не удалось открепить студента",
                      description: extractError(error, "Попробуйте позже"),
                      status: "error",
                      duration: 3000,
                      isClosable: true,
                    });
                  } finally {
                    setDetachProcessing(false);
                    setDetachContext(null);
                    detachDialog.onClose();
                  }
                }}
              >
                Открепить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default DeanGroups;
```

## File: src/pages/DeanSubjects.tsx
```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
import {
  createDeanSubject,
  fetchDeanGroups,
  fetchDeanSchedule,
  fetchDeanSubjects,
  fetchDeanTeachers,
  deleteDeanSubject,
} from "../api/client";
import { DeleteIcon } from "@chakra-ui/icons";

const PAGE_LIMIT = 200;

const extractError = (error: unknown, fallback: string) => {
  const axiosError = error as {
    response?: { data?: { message?: string; error?: string; detail?: string } };
  };
  return (
    axiosError?.response?.data?.message ??
    axiosError?.response?.data?.error ??
    axiosError?.response?.data?.detail ??
    fallback
  );
};

const createDefaultDateRange = () => {
  const fromDate = new Date();
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 7);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { from: format(fromDate), to: format(toDate) };
};

const DeanSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjectForm, setSubjectForm] = useState({
    code: "",
    name: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [scheduleFilters, setScheduleFilters] = useState({
    subjectId: "",
    groupId: "",
    teacherId: "",
    ...createDefaultDateRange(),
  });
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const toast = useToast();
  const [pendingSubject, setPendingSubject] = useState<{ id: string; name: string } | null>(null);
  const subjectDialog = useDisclosure();
  const subjectCancelRef = useRef<HTMLButtonElement | null>(null);
  const [subjectDeleting, setSubjectDeleting] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");

  const refreshSubjects = useCallback(async () => {
    const refreshed = await fetchDeanSubjects({ limit: PAGE_LIMIT });
    setSubjects(refreshed.data ?? []);
  }, []);

  const loadCatalogs = useCallback(async () => {
    try {
      const [subjectsData, groupsData, teachersData] = await Promise.all([
        fetchDeanSubjects({ limit: PAGE_LIMIT }),
        fetchDeanGroups({ limit: PAGE_LIMIT }),
        fetchDeanTeachers({ limit: PAGE_LIMIT }),
      ]);
      setSubjects(subjectsData.data ?? []);
      setGroups(groupsData.data ?? []);
      setTeachers(teachersData.data ?? []);
    } catch (catalogError) {
      console.error(catalogError);
      setError("Не удалось загрузить справочники предметов");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const handleSubjectSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      await createDeanSubject({
        code: subjectForm.code,
        name: subjectForm.name,
        description: subjectForm.description || undefined,
      });
      setSubjectForm({ code: "", name: "", description: "" });
      await refreshSubjects();
      toast({ title: "Предмет создан", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      setError("Не удалось создать предмет");
      toast({
        title: "Не удалось создать предмет",
        description: extractError(err, "Попробуйте позже"),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleScheduleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setScheduleLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (scheduleFilters.subjectId)
        params.subjectId = scheduleFilters.subjectId;
      if (scheduleFilters.groupId) params.groupId = scheduleFilters.groupId;
      if (scheduleFilters.teacherId)
        params.teacherId = scheduleFilters.teacherId;
      if (scheduleFilters.from) params.from = scheduleFilters.from;
      if (scheduleFilters.to) params.to = scheduleFilters.to;
      const data = await fetchDeanSchedule(params);
      setScheduleEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Не удалось загрузить расписание");
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (!initialLoading) {
      void handleScheduleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading]);

  const groupOptions = useMemo(
    () =>
      groups.map((group: any) => ({
        id: group.id,
        label: group.name,
      })),
    [groups]
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((teacher: any) => ({
        id: teacher.id,
        label: `${teacher.lastName} ${teacher.firstName}`,
      })),
    [teachers]
  );

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        Предметы и расписание
      </Heading>
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <SimpleGrid
        columns={{ base: 1, lg: 2 }}
        spacing={6}
        alignItems="stretch"
        mb={6}
      >
        <Box
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          as="form"
          onSubmit={handleSubjectSubmit}
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
        >
          <Heading size="md" mb={4}>
            Создать предмет
          </Heading>
          <Stack spacing={3} flex="1">
            <FormControl isRequired>
              <FormLabel htmlFor="create-subject-code">Код</FormLabel>
              <Input
                id="create-subject-code"
                value={subjectForm.code}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, code: e.target.value })
                }
                placeholder="MATH101"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="create-subject-name">Название</FormLabel>
              <Input
                id="create-subject-name"
                value={subjectForm.name}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, name: e.target.value })
                }
                placeholder="Математический анализ"
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="create-subject-description">
                Описание
              </FormLabel>
              <Input
                id="create-subject-description"
                value={subjectForm.description}
                onChange={(e) =>
                  setSubjectForm({
                    ...subjectForm,
                    description: e.target.value,
                  })
                }
                placeholder="Краткое описание курса"
              />
            </FormControl>
          </Stack>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={formLoading}
            alignSelf="flex-start"
            mt={4}
          >
            Сохранить
          </Button>
        </Box>

        <Box
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          as="form"
          onSubmit={handleScheduleSubmit}
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
        >
          <Heading size="md" mb={4}>
            Фильтр расписания
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel htmlFor="filter-subject">Предмет</FormLabel>
              <Select
                id="filter-subject"
                placeholder="Все предметы"
                value={scheduleFilters.subjectId}
                onChange={(e) =>
                  setScheduleFilters((prev) => ({
                    ...prev,
                    subjectId: e.target.value,
                  }))
                }
              >
                {subjects.map((subject: any) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="filter-group">Группа</FormLabel>
              <Select
                id="filter-group"
                placeholder="Все группы"
                value={scheduleFilters.groupId}
                onChange={(e) =>
                  setScheduleFilters((prev) => ({
                    ...prev,
                    groupId: e.target.value,
                  }))
                }
              >
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="filter-teacher">Преподаватель</FormLabel>
              <Select
                id="filter-teacher"
                placeholder="Все преподаватели"
                value={scheduleFilters.teacherId}
                onChange={(e) =>
                  setScheduleFilters((prev) => ({
                    ...prev,
                    teacherId: e.target.value,
                  }))
                }
              >
                {teacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="filter-from">Дата с</FormLabel>
              <Input
                id="filter-from"
                type="date"
                value={scheduleFilters.from}
                onChange={(e) =>
                  setScheduleFilters((prev) => ({
                    ...prev,
                    from: e.target.value,
                  }))
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="filter-to">Дата по</FormLabel>
              <Input
                id="filter-to"
                type="date"
                value={scheduleFilters.to}
                onChange={(e) =>
                  setScheduleFilters((prev) => ({
                    ...prev,
                    to: e.target.value,
                  }))
                }
              />
            </FormControl>
          </SimpleGrid>
          <HStack spacing={3} mt={4}>
            <Button
              type="submit"
              colorScheme="brand"
              isLoading={scheduleLoading}
            >
              Показать расписание
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setScheduleFilters({
                  subjectId: "",
                  groupId: "",
                  teacherId: "",
                  ...createDefaultDateRange(),
                });
                void handleScheduleSubmit();
              }}
              isDisabled={scheduleLoading}
            >
              Сбросить
            </Button>
          </HStack>
        </Box>
      </SimpleGrid>

      <Box
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        bg={cardBg}
        boxShadow={cardShadow}
        mb={6}
      >
        <Heading size="md" mb={3}>
          Список предметов
        </Heading>
        {initialLoading ? (
          <HStack spacing={3}>
            <Spinner size="sm" />
            <Text color="gray.500">Подготовка данных...</Text>
          </HStack>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Код</Th>
                  <Th>Название</Th>
                  <Th>Описание</Th>
                  <Th textAlign="right">Действия</Th>
                </Tr>
              </Thead>
              <Tbody>
                {subjects.length === 0 ? (
                  <Tr>
                    <Td colSpan={4}>
                      <Text color="gray.500">Предметы не найдены</Text>
                    </Td>
                  </Tr>
                ) : (
                  subjects.map((subject: any) => (
                    <Tr key={subject.id}>
                      <Td>{subject.code}</Td>
                      <Td>{subject.name}</Td>
                      <Td>{subject.description ?? "—"}</Td>
                      <Td textAlign="right">
                        <Button
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          leftIcon={<DeleteIcon />}
                          onClick={() => {
                            setPendingSubject({ id: subject.id, name: subject.name });
                            subjectDialog.onOpen();
                          }}
                        >
                          Удалить
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Box
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        bg={cardBg}
        boxShadow={cardShadow}
      >
        <Heading size="md" mb={3}>
          Расписание занятий
        </Heading>
        {scheduleLoading ? (
          <HStack spacing={3}>
            <Spinner size="sm" />
            <Text color="gray.500">Загрузка расписания...</Text>
          </HStack>
        ) : scheduleEntries.length === 0 ? (
          <Text color="gray.500">Занятия в выбранном диапазоне не найдены</Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Дата</Th>
                  <Th>Время</Th>
                  <Th>Предмет</Th>
                  <Th>Группа</Th>
                  <Th>Преподаватель</Th>
                  <Th>Тема</Th>
                </Tr>
              </Thead>
              <Tbody>
                {scheduleEntries.map((entry: any) => {
                  const startsAt = new Date(entry.session.startsAt);
                  const endsAt = entry.session.endsAt
                    ? new Date(entry.session.endsAt)
                    : null;
                  const teacherName = entry.teacher
                    ? `${entry.teacher.lastName ?? ""} ${
                        entry.teacher.firstName ?? ""
                      }`.trim()
                    : "—";
                  return (
                    <Tr key={entry.session.id}>
                      <Td>{startsAt.toLocaleDateString("ru-RU")}</Td>
                      <Td>
                        {startsAt.toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {endsAt
                          ? ` — ${endsAt.toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </Td>
                      <Td>{entry.subject?.name ?? "—"}</Td>
                      <Td>{entry.group?.name ?? "—"}</Td>
                      <Td>{teacherName || "—"}</Td>
                      <Td>{entry.session.topic ?? "—"}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
        </Box>
      )}
    </Box>

      <AlertDialog
        isOpen={subjectDialog.isOpen && !!pendingSubject}
        leastDestructiveRef={subjectCancelRef}
        onClose={() => {
          setPendingSubject(null);
          subjectDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Удалить предмет
            </AlertDialogHeader>
            <AlertDialogBody>
              {pendingSubject
                ? `Удалить предмет "${pendingSubject.name}"?`
                : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={subjectCancelRef}
                onClick={subjectDialog.onClose}
                isDisabled={subjectDeleting}
              >
                Отмена
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                isLoading={subjectDeleting}
                onClick={async () => {
                  if (!pendingSubject) return;
                  setSubjectDeleting(true);
                  try {
                    await deleteDeanSubject(pendingSubject.id);
                    await refreshSubjects();
                    toast({ title: "Предмет удалён", status: "info", duration: 2500, isClosable: true });
                  } catch (error) {
                    toast({
                      title: "Не удалось удалить предмет",
                      description: extractError(error, "Попробуйте позже"),
                      status: "error",
                      duration: 3000,
                      isClosable: true,
                    });
                  } finally {
                    setSubjectDeleting(false);
                    setPendingSubject(null);
                    subjectDialog.onClose();
                  }
                }}
              >
                Удалить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default DeanSubjects;
```

## File: src/pages/StudentDashboard.tsx
```typescript
import { useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import {
  Avatar,
  Badge,
  Box,
  Center,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { fetchStudentDashboard, fetchStudentSchedule } from "../api/client";
import { formatFullName } from "../utils/name";
import { getAvatarAccentColor } from "../utils/avatarColor";
import { useAvatarImage } from "../hooks/useAvatarImage";

const StudentDashboard = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchStudentDashboard();
        setData(response);
        const fromDate = new Date();
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 14);
        const scheduleData = await fetchStudentSchedule({
          from: fromDate.toISOString().slice(0, 10),
          to: toDate.toISOString().slice(0, 10),
        });
        setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      } catch (err) {
        const axiosError = err as AxiosError;
        if (axiosError?.response?.status === 401) {
          setScheduleError(
            "Требуется авторизация. Пожалуйста, войдите в систему повторно."
          );
        } else {
          setScheduleError("Не удалось загрузить данные профиля");
        }
      } finally {
        setLoading(false);
        setScheduleLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Center py={16}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (!data) {
    return (
      <Center py={16}>
        <Text color={scheduleError ? "red.400" : "gray.500"}>
          {scheduleError ?? "Не удалось загрузить данные профиля"}
        </Text>
      </Center>
    );
  }

  const stats = [
    {
      label: "Средний балл",
      value: data.averageGpa ? data.averageGpa.toFixed(2) : ".",
      colorScheme: "brand",
    },
    {
      label: "Группа",
      value: data.group ? data.group.name : "—",
      colorScheme: "purple",
    },
    { label: "ИНС", value: data.profile.ins ?? "—", colorScheme: "teal" },
  ];

  const avatarSrc = useAvatarImage(data.profile.avatarUrl);
  const avatarBg = useMemo(
    () =>
      getAvatarAccentColor(
        data.profile.id,
        data.profile.ins ?? data.profile.email ?? undefined
      ),
    [data.profile.email, data.profile.id, data.profile.ins]
  );
  const showAccent = !avatarSrc;

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Личный кабинет студента
      </Heading>

      <Stack
        spacing={3}
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        maxW="lg"
        bg={cardBg}
        boxShadow={cardShadow}
        transition="transform 0.2s ease, box-shadow 0.2s ease"
        _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
      >
        <HStack align="flex-start" spacing={5} flexWrap="wrap">
          <Avatar
            size="lg"
            bg={showAccent ? avatarBg : undefined}
            color={showAccent ? "white" : undefined}
            name={formatFullName(
              data.profile.lastName,
              data.profile.firstName,
              data.profile.middleName
            )}
            src={avatarSrc}
          />
          <Stack spacing={2}>
            <Text fontWeight="semibold">
              {formatFullName(
                data.profile.lastName,
                data.profile.firstName,
                data.profile.middleName
              )}
            </Text>
            <Text>
              <strong>Почта:</strong> {data.profile.email ?? "—"}
            </Text>
            <Text>
              <strong>Группа:</strong> {data.group ? data.group.name : "—"}
            </Text>
            <Text>
              <strong>ИНС:</strong> {data.profile.ins ?? "—"}
            </Text>
          </Stack>
        </HStack>
      </Stack>

      <Heading size="md" mt={8} mb={3}>
        Быстрая сводка
      </Heading>
      <Stack spacing={4} maxW="3xl">
        {stats.map((stat) => (
          <Box
            key={stat.label}
            borderWidth="1px"
            borderRadius="xl"
            px={4}
            py={3}
            bg={cardBg}
            boxShadow={cardShadow}
          >
            <Text fontSize="sm" color="gray.500">
              {stat.label}
            </Text>
            <Badge
              mt={2}
              colorScheme={stat.colorScheme}
              fontSize="lg"
              px={3}
              py={1}
              borderRadius="md"
            >
              {stat.value}
            </Badge>
          </Box>
        ))}
      </Stack>

      <Heading size="md" mt={8} mb={3}>
        Ближайшие занятия
      </Heading>
      {scheduleLoading ? (
        <HStack spacing={3}>
          <Spinner size="sm" />
          <Text color="gray.500">Загрузка расписания...</Text>
        </HStack>
      ) : scheduleError ? (
        <Text color="red.400">{scheduleError}</Text>
      ) : schedule.length === 0 ? (
        <Text color="gray.500">
          В ближайшие две недели нет запланированных занятий
        </Text>
      ) : (
        <Stack spacing={3}>
          {schedule.map((entry: any) => {
            const startsAt = new Date(entry.session.startsAt);
            const endsAt = entry.session.endsAt
              ? new Date(entry.session.endsAt)
              : null;
            return (
              <Box
                key={entry.session.id}
                borderWidth="1px"
                borderRadius="xl"
                p={4}
                bg={cardBg}
                boxShadow={cardShadow}
              >
                <Heading size="sm" mb={1}>
                  {entry.subject?.name ?? "Предмет не указан"}
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  {startsAt.toLocaleDateString("ru-RU")} ·{" "}
                  {startsAt.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {endsAt
                    ? ` — ${endsAt.toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                </Text>
                <Text>
                  Аудитория: <strong>{entry.group?.name ?? "—"}</strong>
                </Text>
                {entry.session.topic && (
                  <Text color="gray.600" fontSize="sm">
                    Тема: {entry.session.topic}
                  </Text>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default StudentDashboard;
```

## File: src/pages/TeacherDashboard.tsx
```typescript
import { useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import {
  Avatar,
  Box,
  Heading,
  Stack,
  Text,
  Tag,
  TagLabel,
  useColorModeValue,
  Spinner,
  HStack,
} from "@chakra-ui/react";
import { fetchTeacherDashboard, fetchTeacherSchedule } from "../api/client";
import { formatFullName } from "../utils/name";
import { getAvatarAccentColor } from "../utils/avatarColor";
import { useAvatarImage } from "../hooks/useAvatarImage";

const TeacherDashboard = () => {
  const [data, setData] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");

  useEffect(() => {
    const load = async () => {
      try {
        const dashboard = await fetchTeacherDashboard();
        setData(dashboard);
        const fromDate = new Date();
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 14);
        const params = {
          from: fromDate.toISOString().slice(0, 10),
          to: toDate.toISOString().slice(0, 10),
        };
        const scheduleData = await fetchTeacherSchedule(params);
        setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      } catch (err) {
        const axiosError = err as AxiosError;
        if (axiosError?.response?.status === 401) {
          setScheduleError(
            "Требуется авторизация. Пожалуйста, войдите в систему повторно."
          );
        } else {
          setScheduleError("Не удалось загрузить данные преподавателя");
        }
      } finally {
        setScheduleLoading(false);
      }
    };
    load();
  }, []);

  if (!data) {
    return (
      <Box p={6}>
        {scheduleError ? (
          <Text color="red.400">{scheduleError}</Text>
        ) : (
          <HStack spacing={3}>
            <Spinner size="sm" />
            <Text color="gray.500">Загрузка данных...</Text>
          </HStack>
        )}
      </Box>
    );
  }

  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  const avatarSrc = useAvatarImage(data.profile.avatarUrl);
  const avatarBg = useMemo(
    () =>
      getAvatarAccentColor(
        data.profile.id,
        data.profile.ins ?? data.profile.email ?? undefined
      ),
    [data.profile.email, data.profile.id, data.profile.ins]
  );
  const showAccent = !avatarSrc;

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Кабинет преподавателя
      </Heading>
      <Box
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        mb={6}
        bg={cardBg}
        boxShadow={cardShadow}
        transition="transform 0.2s ease, box-shadow 0.2s ease"
        _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
      >
        <HStack align="flex-start" spacing={5} flexWrap="wrap">
          <Avatar
            size="lg"
            bg={showAccent ? avatarBg : undefined}
            color={showAccent ? "white" : undefined}
            name={formatFullName(
              data.profile.lastName,
              data.profile.firstName,
              data.profile.middleName
            )}
            src={avatarSrc}
          />
          <Stack spacing={1.5}>
            <Heading size="md">
              {formatFullName(
                data.profile.lastName,
                data.profile.firstName,
                data.profile.middleName
              )}
            </Heading>
            <Text>ИНС: {data.profile.ins ?? "—"}</Text>
            <Text>Почта: {data.profile.email ?? "—"}</Text>
          </Stack>
        </HStack>
      </Box>
      <Heading size="md" mb={3}>
        Закреплённые предметы
      </Heading>
      <Stack spacing={4}>
        {subjects.length === 0 ? (
          <Box
            borderWidth="1px"
            borderRadius="xl"
            p={4}
            bg={cardBg}
            boxShadow={cardShadow}
          >
            <Text color="gray.500">Закреплённых предметов пока нет</Text>
          </Box>
        ) : (
          subjects.map((item: any) => (
            <Box
              key={item.subject.id}
              borderWidth="1px"
              borderRadius="xl"
              p={6}
              bg={cardBg}
              boxShadow={cardShadow}
              transition="transform 0.2s ease, box-shadow 0.2s ease"
              _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
            >
              <Heading size="sm" mb={2}>
                {item.subject.name}
              </Heading>
              <Stack direction="row" spacing={2} wrap="wrap">
                {item.groups.map((group: any) => (
                  <Tag key={group.id} colorScheme="brand">
                    <TagLabel>{group.name}</TagLabel>
                  </Tag>
                ))}
              </Stack>
            </Box>
          ))
        )}
      </Stack>

      <Heading size="md" mt={8} mb={3}>
        Ближайшие занятия
      </Heading>
      {scheduleLoading ? (
        <HStack spacing={3}>
          <Spinner size="sm" />
          <Text color="gray.500">Загрузка расписания...</Text>
        </HStack>
      ) : scheduleError ? (
        <Text color="red.400">{scheduleError}</Text>
      ) : schedule.length === 0 ? (
        <Text color="gray.500">В ближайшее время занятий не запланировано</Text>
      ) : (
        <Stack spacing={3}>
          {schedule.map((entry: any) => {
            const startsAt = new Date(entry.session.startsAt);
            const endsAt = entry.session.endsAt
              ? new Date(entry.session.endsAt)
              : null;
            return (
              <Box
                key={entry.session.id}
                borderWidth="1px"
                borderRadius="xl"
                p={4}
                bg={cardBg}
                boxShadow={cardShadow}
              >
                <Heading size="sm" mb={1}>
                  {entry.subject?.name ?? "Предмет не указан"}
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  {startsAt.toLocaleDateString("ru-RU")} ·{" "}
                  {startsAt.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {endsAt
                    ? ` — ${endsAt.toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                </Text>
                <Text>
                  Группа: <strong>{entry.group?.name ?? "—"}</strong>
                </Text>
                {entry.session.topic && (
                  <Text color="gray.600" fontSize="sm">
                    Тема: {entry.session.topic}
                  </Text>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default TeacherDashboard;
```

## File: src/pages/TeacherGradeEditor.tsx
```typescript
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Select,
  Skeleton,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
  Heading,
} from "@chakra-ui/react";
import { ChatIcon, SearchIcon } from "@chakra-ui/icons";
import { formatFullName } from "../utils/name";
import {
  fetchTeacherDashboard,
  fetchTeacherGradeTable,
  upsertGrade,
  updateGrade,
  deleteGrade,
} from "../api/client";

type GradeEntry = {
  gradeId?: string;
  sessionId: string;
  value?: number;
  notes?: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
  };
};

type SessionLabel = { id: string; label: string; time: string; raw: any };

const QUICK_GRADES = [5, 4, 3, 2];
const ALLOWED_GRADES = [2, 3, 4, 5];

const TeacherGradeEditor = () => {
  const toast = useToast();
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [subjectId, setSubjectId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [gradeTable, setGradeTable] = useState<any | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

  const noteModal = useDisclosure();
  const [noteEditor, setNoteEditor] = useState<{
    gradeId: string;
    notes: string;
    value: number;
    title: string;
  } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");
  const headerBg = useColorModeValue("gray.100", "gray.700");
  const rowHoverBg = useColorModeValue("gray.50", "gray.700");
  const summaryBg = useColorModeValue("gray.100", "gray.800");

  const subjectOptions = useMemo(() => {
    if (!dashboard || !Array.isArray(dashboard.subjects)) {
      return [] as Array<{ id: string; name: string; groups: any[] }>;
    }
    return dashboard.subjects
      .map((item: any) => {
        const subjectData = item?.subject ?? item;
        if (!subjectData || !subjectData.id) {
          return null;
        }
        return {
          id: subjectData.id,
          name: subjectData.name ?? "Без названия",
          groups: Array.isArray(item?.groups) ? item.groups : [],
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; groups: any[] }>;
  }, [dashboard]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await fetchTeacherDashboard();
        setDashboard(data);
        setError(null);
      } catch (err) {
        setError(
          "Не удалось загрузить данные преподавателя. Пожалуйста, войдите снова."
        );
      } finally {
        setDashboardLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const loadGradeTable = async (
    subject: string,
    group: string,
    options?: { silent?: boolean }
  ) => {
    if (!subject || !group) {
      setGradeTable(null);
      return;
    }
    const silent = options?.silent ?? false;
    if (!silent) {
      setTableLoading(true);
    }
    try {
      const data = await fetchTeacherGradeTable(subject, group);
      setGradeTable(data);
      setError(null);
    } catch (err) {
      setError("Не удалось загрузить журнал. Проверьте авторизацию.");
      setGradeTable(null);
    } finally {
      if (!silent) {
        setTableLoading(false);
      }
    }
  };

  useEffect(() => {
    if (subjectId && groupId) {
      loadGradeTable(subjectId, groupId);
    } else {
      setGradeTable(null);
    }
  }, [subjectId, groupId]);

  const gradeDictionary = useMemo(() => {
    const map = new Map<string, GradeEntry>();
    gradeTable?.grades?.forEach((entry: GradeEntry) => {
      map.set(`${entry.student.id}-${entry.sessionId}`, entry);
    });
    return map;
  }, [gradeTable]);

  const studentAverages = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    gradeTable?.grades?.forEach((entry: GradeEntry) => {
      if (entry.value == null) return;
      const key = entry.student.id;
      const stat = totals.get(key) ?? { sum: 0, count: 0 };
      stat.sum += entry.value;
      stat.count += 1;
      totals.set(key, stat);
    });
    return totals;
  }, [gradeTable]);

  const sessionAverages = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    gradeTable?.grades?.forEach((entry: GradeEntry) => {
      if (entry.value == null) {
        return;
      }
      const stat = totals.get(entry.sessionId) ?? { sum: 0, count: 0 };
      stat.sum += entry.value;
      stat.count += 1;
      totals.set(entry.sessionId, stat);
    });
    return totals;
  }, [gradeTable]);

  const sessionLabels = useMemo(() => {
    return (gradeTable?.sessions ?? []).map((session: any) => {
      const date = new Date(session.startsAt);
      const day = date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
      });
      const time = date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        id: session.id,
        label: day,
        time,
        raw: session,
      };
    });
  }, [gradeTable]);

  const students = gradeTable?.students ?? [];
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) {
      return students;
    }
    const needle = studentSearch.trim().toLowerCase();
    return students.filter((student: any) => {
      const fullName = formatFullName(
        student.lastName,
        student.firstName,
        student.middleName
      ).toLowerCase();
      return (
        fullName.includes(needle) ||
        (student.ins ?? "").toLowerCase().includes(needle)
      );
    });
  }, [students, studentSearch]);

  const badgeForAverage = (value?: number) => {
    if (value == null) return { color: "gray", text: "." };
    if (value >= 4.5) return { color: "green", text: value.toFixed(2) };
    if (value >= 3) return { color: "yellow", text: value.toFixed(2) };
    return { color: "red", text: value.toFixed(2) };
  };

  const handleGradeCommit = async (
    studentId: string,
    sessionId: string,
    rawValue: string,
    existing?: GradeEntry
  ) => {
    const key = `${studentId}-${sessionId}`;
    const trimmed = rawValue.trim();
    if (!subjectId || !groupId) return false;

    if (!trimmed && !existing?.gradeId) {
      toast({
        title: "Введите значение",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return false;
    }

    setUpdatingCell(key);
    try {
      if (!trimmed) {
        if (existing?.gradeId) {
          await deleteGrade(existing.gradeId);
          await loadGradeTable(subjectId, groupId);
          return true;
        }
        return false;
      }

      const normalized = trimmed.replace(",", ".");
      const numeric = Number.parseInt(normalized, 10);
      if (Number.isNaN(numeric)) {
        toast({
          title: "Некорректное значение",
          status: "warning",
          duration: 2500,
          isClosable: true,
        });
        return false;
      }
      if (!ALLOWED_GRADES.includes(numeric)) {
        toast({
          title: "Допустимы только оценки 2, 3, 4 или 5",
          status: "warning",
          duration: 2500,
          isClosable: true,
        });
        return false;
      }

      if (existing?.gradeId) {
        await updateGrade(existing.gradeId, {
          value: numeric,
          notes: existing.notes ?? undefined,
        });
      } else {
        await upsertGrade({ sessionId, studentId, value: numeric });
      }
      await loadGradeTable(subjectId, groupId);
      return true;
    } catch (err) {
      toast({
        title: "Не удалось сохранить оценку",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return false;
    } finally {
      setUpdatingCell(null);
    }
  };

  const openNotesModal = (entry: GradeEntry) => {
    if (!entry.gradeId) return;
    setNoteEditor({
      gradeId: entry.gradeId,
      notes: entry.notes ?? "",
      value: entry.value != null ? Math.round(entry.value) : 0,
      title: formatFullName(
        entry.student.lastName,
        entry.student.firstName,
        entry.student.middleName
      ),
    });
    setNoteDraft(entry.notes ?? "");
    noteModal.onOpen();
  };

  const handleSaveNotes = async () => {
    if (!noteEditor || !subjectId || !groupId) return;
    setNoteSaving(true);
    try {
      await updateGrade(noteEditor.gradeId, {
        value: noteEditor.value,
        notes: noteDraft || undefined,
      });
      await loadGradeTable(subjectId, groupId);
      noteModal.onClose();
      toast({
        title: "Комментарий сохранён",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Не удалось сохранить комментарий",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setNoteSaving(false);
    }
  };

  const GradeCell = ({
    studentId,
    studentName,
    session,
  }: {
    studentId: string;
    studentName: string;
    session: any;
  }) => {
    const key = `${studentId}-${session.id}`;
    const entry = gradeDictionary.get(key);
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState(
      entry?.value != null ? entry.value.toString() : ""
    );

    useEffect(() => {
      setDraft(entry?.value != null ? entry.value.toString() : "");
    }, [entry?.value]);

    const isProcessing = updatingCell === key;

    const close = () => {
      if (!isProcessing) {
        setIsOpen(false);
      }
    };

    const handleSave = async () => {
      const success = await handleGradeCommit(
        studentId,
        session.id,
        draft,
        entry
      );
      if (success) {
        setIsOpen(false);
      }
    };

    const handleClear = async () => {
      const success = await handleGradeCommit(studentId, session.id, "", entry);
      if (success) {
        setIsOpen(false);
        setDraft("");
      }
    };

    const applyQuickGrade = async (value: number) => {
      setDraft(value.toString());
      const success = await handleGradeCommit(
        studentId,
        session.id,
        value.toString(),
        entry
      );
      if (success) {
        setIsOpen(false);
      }
    };

    return (
      <Stack spacing={1} align="center">
        <Popover
          isOpen={isOpen}
          onOpen={() => setIsOpen(true)}
          onClose={close}
          placement="left"
        >
          <PopoverTrigger>
            <Button
              size="sm"
              variant="ghost"
              colorScheme={entry?.value != null ? "brand" : undefined}
              isLoading={isProcessing}
            >
              {entry?.value != null ? entry.value.toFixed(0) : "."}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverCloseButton isDisabled={isProcessing} />
            <PopoverHeader fontWeight="bold">Оценка</PopoverHeader>
            <PopoverBody>
              <Stack spacing={3}>
                <NumberInput
                  value={draft}
                  onChange={(valueString) => setDraft(valueString)}
                  min={2}
                  max={5}
                  step={1}
                  precision={0}
                  allowMouseWheel
                >
                  <NumberInputField
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSave();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setDraft(
                          entry?.value != null ? entry.value.toString() : ""
                        );
                        close();
                      }
                    }}
                  />
                </NumberInput>
                <HStack spacing={2} flexWrap="wrap">
                  {QUICK_GRADES.map((value) => (
                    <Button
                      key={value}
                      size="xs"
                      variant="outline"
                      onClick={() => void applyQuickGrade(value)}
                    >
                      {value.toString()}
                    </Button>
                  ))}
                </HStack>
              </Stack>
            </PopoverBody>
            <PopoverFooter display="flex" justifyContent="space-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                isDisabled={!entry?.gradeId}
                isLoading={isProcessing}
              >
                Очистить
              </Button>
              <Button
                size="sm"
                colorScheme="brand"
                onClick={handleSave}
                isLoading={isProcessing}
              >
                Сохранить
              </Button>
            </PopoverFooter>
          </PopoverContent>
        </Popover>
        <Tooltip
          label={entry?.notes ? entry.notes : "Комментариев нет"}
          placement="top"
          hasArrow
        >
          <IconButton
            aria-label="Комментарий"
            icon={<ChatIcon />}
            size="xs"
            variant={entry?.notes ? "solid" : "ghost"}
            colorScheme="brand"
            isDisabled={!entry?.gradeId}
            onClick={() => entry && openNotesModal(entry)}
          />
        </Tooltip>
      </Stack>
    );
  };

  if (dashboardLoading) {
    return (
      <Center py={16}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (!dashboard) {
    return (
      <Center py={16}>
        <Text color={error ? "red.400" : "gray.500"}>
          {error ?? "Не удалось загрузить данные преподавателя"}
        </Text>
      </Center>
    );
  }

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Журнал оценок
      </Heading>
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}
      <Stack
        direction={{ base: "column", md: "row" }}
        spacing={4}
        align="flex-start"
        mb={6}
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        bg={cardBg}
        boxShadow={cardShadow}
        transition="transform 0.2s ease, box-shadow 0.2s ease"
        _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
      >
        <FormControl isRequired>
          <FormLabel>Предмет</FormLabel>
          <Select
            placeholder="Выберите предмет"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setGroupId("");
              setGradeTable(null);
            }}
          >
            {subjectOptions.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Группа</FormLabel>
          <Select
            placeholder="Выберите группу"
            value={groupId}
            onChange={(event) => {
              setGroupId(event.target.value);
            }}
            isDisabled={!subjectId}
          >
            {(subjectOptions.find((s) => s.id === subjectId)?.groups ?? []).map(
              (group: any) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              )
            )}
          </Select>
        </FormControl>
      </Stack>

      <Stack
        direction={{ base: "column", md: "row" }}
        spacing={4}
        mb={6}
        align="center"
      >
        <FormControl maxW={{ base: "100%", md: "320px" }}>
          <FormLabel mb={1}>Фильтр студентов</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Например, Иванов или 00000012"
            />
          </InputGroup>
        </FormControl>
        <Button
          variant="ghost"
          onClick={() => setStudentSearch("")}
          isDisabled={!studentSearch}
        >
          Сбросить фильтр
        </Button>
      </Stack>

      {!subjectId || !groupId ? (
        <Text color="gray.500">
          Выберите предмет и группу, чтобы просмотреть и заполнить журнал.
        </Text>
      ) : tableLoading ? (
        <Skeleton height="280px" borderRadius="xl" />
      ) : !gradeTable || sessionLabels.length === 0 ? (
        <Text color="gray.500">По выбранным параметрам нет занятий.</Text>
      ) : (
        <Box
          borderWidth="1px"
          borderRadius="xl"
          boxShadow={cardShadow}
          bg={cardBg}
          maxH="70vh"
          overflow="auto"
        >
          <Table size="sm" variant="simple">
            <Thead bg={headerBg}>
              <Tr>
                <Th>Студент</Th>
                {sessionLabels.map((session: SessionLabel) => {
                  const stat = sessionAverages.get(session.id);
                  const avg =
                    stat && stat.count > 0 ? stat.sum / stat.count : undefined;
                  const badge = badgeForAverage(avg);
                  return (
                    <Th key={session.id} textAlign="center">
                      <Stack spacing={0} align="center">
                        <Text fontSize="xs" fontWeight="semibold">
                          {session.label}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {session.time}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          Средний: {badge.text}
                        </Text>
                      </Stack>
                    </Th>
                  );
                })}
                <Th textAlign="center">Средний</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredStudents.map((student: any) => {
                const stats = studentAverages.get(student.id);
                const average =
                  stats && stats.count > 0
                    ? stats.sum / stats.count
                    : undefined;
                const badge = badgeForAverage(average);
                return (
                  <Tr key={student.id} _hover={{ bg: rowHoverBg }}>
                    <Td fontWeight="medium">
                      {formatFullName(
                        student.lastName,
                        student.firstName,
                        student.middleName
                      )}
                    </Td>
                    {sessionLabels.map((session: SessionLabel) => (
                      <Td
                        key={`${student.id}-${session.id}`}
                        textAlign="center"
                      >
                        <GradeCell
                          studentId={student.id}
                          studentName={formatFullName(
                            student.lastName,
                            student.firstName,
                            student.middleName
                          )}
                          session={session.raw}
                        />
                      </Td>
                    ))}
                    <Td textAlign="center">
                      <Badge
                        colorScheme={badge.color}
                        px={3}
                        py={1}
                        borderRadius="md"
                      >
                        {badge.text}
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
              <Tr bg={summaryBg}>
                <Td fontWeight="semibold">Средний по группе</Td>
                {sessionLabels.map((session: SessionLabel) => {
                  const stat = sessionAverages.get(session.id);
                  const average =
                    stat && stat.count > 0 ? stat.sum / stat.count : undefined;
                  const badge = badgeForAverage(average);
                  return (
                    <Td key={`avg-${session.id}`} textAlign="center">
                      <Badge
                        colorScheme={badge.color}
                        px={3}
                        py={1}
                        borderRadius="md"
                      >
                        {badge.text}
                      </Badge>
                    </Td>
                  );
                })}
                <Td textAlign="center">
                  <Text fontSize="xs" color="gray.500">
                    Показано студентов: {filteredStudents.length} /{" "}
                    {students.length}
                  </Text>
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal isOpen={noteModal.isOpen} onClose={noteModal.onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Комментарий к оценке {noteEditor?.title}</ModalHeader>
          <ModalCloseButton isDisabled={noteSaving} />
          <ModalBody>
            <Textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Добавьте комментарий для студента"
              rows={5}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={noteModal.onClose}
              isDisabled={noteSaving}
            >
              Отмена
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleSaveNotes}
              isLoading={noteSaving}
            >
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TeacherGradeEditor;
```

## File: src/App.tsx
```typescript
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Header from "./components/Header";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import DeanSubjects from "./pages/DeanSubjects";
import DeanGroups from "./pages/DeanGroups";
import DeanTeachers from "./pages/DeanTeachers";
import DeanStudents from "./pages/DeanStudents";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherGradeEditor from "./pages/TeacherGradeEditor";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSubjects from "./pages/StudentSubjects";
import ProfilePage from "./pages/ProfilePage";
import type { AuthResponse, UserSummary } from "./api/client";
import { setAuthToken, fetchProfile, AUTH_STORAGE_KEY } from "./api/client";

const PROFILE_ROUTE = "/profile";
const LAST_ROUTE_KEY = "gradeflow.lastRoute";

const allowedRoutesByRole: Record<string, string[]> = {
  admin: ["/admin"],
  dean: ["/dean/teachers", "/dean/students", "/dean/groups", "/dean/subjects"],
  teacher: ["/teacher", "/teacher/gradebook"],
  student: ["/student", "/student/subjects"],
};

const isRouteAllowed = (role: string | undefined, pathname: string) => {
  if (!role) {
    return pathname === "/login" || pathname === PROFILE_ROUTE;
  }
  const allowed = new Set([PROFILE_ROUTE, ...(allowedRoutesByRole[role] ?? [])]);
  if (allowed.has(pathname)) {
    return true;
  }
  if (role === "dean" && pathname.startsWith("/dean/")) {
    return true;
  }
  if (role === "teacher" && pathname.startsWith("/teacher")) {
    return true;
  }
  if (role === "student" && pathname.startsWith("/student")) {
    return true;
  }
  if (role === "admin" && pathname === "/admin") {
    return true;
  }
  return false;
};

const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    style={{ width: "100%" }}
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

const renderWithShell = (content: ReactNode) => (
  <PageTransition>
    <Box px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }}>
      <Box mx="auto" w="100%" maxW="1280px">
        <Box mx="auto" w={{ base: "100%", xl: "90%" }}>{content}</Box>
      </Box>
    </Box>
  </PageTransition>
);

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [auth, setAuth] = useState<AuthResponse | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed: AuthResponse = JSON.parse(raw);
      if (parsed?.accessToken) {
        setAuthToken(parsed.accessToken);
      }
      return parsed;
    } catch (error) {
      console.warn("Failed to parse stored auth state", error);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  });
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const routeRestoredRef = useRef(false);

  useEffect(() => {
    if (auth) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
      setAuthToken(auth.accessToken);
      setProfile(auth.user);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthToken(null);
      setProfile(null);
    }
  }, [auth]);

  const applyProfile = useCallback((next: UserSummary) => {
    setProfile(next);
    setAuth((prev) => {
      if (!prev) {
        return prev;
      }
      const current = prev.user;
      const needsUpdate =
        current.avatarUrl !== next.avatarUrl ||
        current.firstName !== next.firstName ||
        current.lastName !== next.lastName ||
        current.middleName !== next.middleName ||
        current.email !== next.email ||
        current.ins !== next.ins;
      if (!needsUpdate) {
        return prev;
      }
      return { ...prev, user: { ...current, ...next } };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!auth) {
      return;
    }
    fetchProfile()
      .then((data) => {
        if (!cancelled) {
          applyProfile(data);
        }
      })
      .catch(() => {
        // ignore, fallback to auth summary already stored
      });
    return () => {
      cancelled = true;
    };
  }, [auth, applyProfile]);

  useEffect(() => {
    if (!auth) {
      return;
    }
    if (routeRestoredRef.current) {
      return;
    }
    const storedRoute = window.localStorage.getItem(LAST_ROUTE_KEY);
    routeRestoredRef.current = true;
    if (
      storedRoute &&
      storedRoute !== location.pathname &&
      isRouteAllowed(auth.user.role, storedRoute)
    ) {
      navigate(storedRoute, { replace: true });
    }
  }, [auth, location.pathname, navigate]);

  useEffect(() => {
    if (!auth || !routeRestoredRef.current) {
      return;
    }
    window.localStorage.setItem(LAST_ROUTE_KEY, location.pathname);
  }, [auth, location.pathname]);

  const defaultRouteForRole = useMemo(
    () => (role?: string | null) => {
      if (!role) {
        return "/login";
      }
      const allowed = allowedRoutesByRole[role] ?? [];
      if (allowed.length === 0) {
        return PROFILE_ROUTE;
      }
      return allowed[0];
    },
    []
  );

  useEffect(() => {
    if (!auth) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }
    if (!routeRestoredRef.current) {
      return;
    }
    if (!isRouteAllowed(auth.user.role, location.pathname)) {
      navigate(defaultRouteForRole(auth.user.role), { replace: true });
    }
  }, [auth, location.pathname, navigate, defaultRouteForRole]);

  const handleLogin = (payload: AuthResponse) => {
    setAuthToken(payload.accessToken);
    routeRestoredRef.current = false;
    setAuth(payload);
    setProfile(payload.user);
    navigate(defaultRouteForRole(payload.user.role), { replace: true });
  };

  const handleLogout = () => {
    setAuth(null);
    setProfile(null);
    routeRestoredRef.current = false;
    window.localStorage.removeItem(LAST_ROUTE_KEY);
    navigate("/login", { replace: true });
  };

  const ProtectedRoute = ({
    children,
    roles,
  }: {
    children: ReactNode;
    roles?: string[];
  }) => {
    if (!auth) {
      return <Navigate to="/login" replace />;
    }
    if (roles && !roles.includes(auth.user.role)) {
      return <Navigate to={defaultRouteForRole(auth.user.role)} replace />;
    }
    return <>{children}</>;
  };

  const appBg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box position="relative" minH="100vh" bg={appBg} overflow="hidden">
      <Box
        position="fixed"
        inset="0"
        zIndex={0}
        pointerEvents="none"
      >
        <Box
          position="absolute"
          top="-20%"
          left="-15%"
          w={{ base: "140vw", md: "70vw" }}
          h={{ base: "60vh", md: "70vh" }}
          bgGradient="radial( circle at top left, rgba(59,130,246,0.45), transparent 60% )"
          filter="blur(120px)"
        />
        <Box
          position="absolute"
          bottom="-25%"
          right="-25%"
          w={{ base: "140vw", md: "75vw" }}
          h={{ base: "70vh", md: "80vh" }}
          bgGradient="radial( circle at bottom right, rgba(236,72,153,0.35), transparent 65% )"
          filter="blur(140px)"
        />
      </Box>
      <Box position="relative" zIndex={1} minH="100vh">
      <Header
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
        role={auth?.user.role}
        isAuthenticated={!!auth}
        profile={profile}
      />
      <Box pt={{ base: 20, md: 24 }}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              auth ? (
                <Navigate to={defaultRouteForRole(auth.user.role)} replace />
              ) : (
                renderWithShell(<Login onLogin={handleLogin} />)
              )
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                {renderWithShell(
                  <ProfilePage profile={profile} onProfileUpdate={applyProfile} />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                {renderWithShell(<AdminDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/teachers"
            element={
              <ProtectedRoute roles={["dean"]}>
                {renderWithShell(<DeanTeachers />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/students"
            element={
              <ProtectedRoute roles={["dean"]}>
                {renderWithShell(<DeanStudents />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/groups"
            element={
              <ProtectedRoute roles={["dean"]}>
                {renderWithShell(<DeanGroups />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/subjects"
            element={
              <ProtectedRoute roles={["dean"]}>
                {renderWithShell(<DeanSubjects />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute roles={["teacher"]}>
                {renderWithShell(<TeacherDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/gradebook"
            element={
              <ProtectedRoute roles={["teacher"]}>
                {renderWithShell(<TeacherGradeEditor />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={["student"]}>
                {renderWithShell(<StudentDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/subjects"
            element={
              <ProtectedRoute roles={["student"]}>
                {renderWithShell(<StudentSubjects />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <Navigate
                to={auth ? defaultRouteForRole(auth.user.role) : "/login"}
                replace
              />
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to={auth ? defaultRouteForRole(auth.user.role) : "/login"}
                replace
              />
            }
          />
          </Routes>
        </AnimatePresence>
      </Box>
      </Box>
    </Box>
  );
};

export default App;
```

## File: src/main.tsx
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import theme from "./theme";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
```

## File: package.json
```json
{
  "name": "gradeflow-front",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@chakra-ui/icons": "^2.1.0",
    "@chakra-ui/react": "^2.9.0",
    "framer-motion": "^11.0.0",
    "@emotion/react": "^11.13.0",
    "@emotion/styled": "^11.13.0",
    "axios": "^1.7.7",
    "react-router-dom": "^6.27.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.4.5",
    "vite": "^7.1.12"
  }
}
```

## File: src/api/client.ts
```typescript
import axios from "axios";

const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

export const AUTH_STORAGE_KEY = "gradeflow.auth";

let cachedAccessToken: string | null | undefined;

const readAccessTokenFromStorage = (): string | null => {
  if (typeof window === "undefined") {
    cachedAccessToken = null;
    return cachedAccessToken;
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      cachedAccessToken = null;
      return cachedAccessToken;
    }
    const parsed = JSON.parse(raw) as { accessToken?: string };
    cachedAccessToken = parsed?.accessToken ?? null;
  } catch {
    cachedAccessToken = null;
  }
  return cachedAccessToken;
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken !== undefined) {
    return cachedAccessToken;
  }
  return readAccessTokenFromStorage();
};

const setCachedAccessToken = (token: string | null | undefined) => {
  cachedAccessToken = token ?? null;
};

const apiBaseURL = (() => {
  try {
    return new URL(
      RAW_API_BASE_URL,
      typeof window !== "undefined" ? window.location.origin : undefined
    ).toString();
  } catch {
    return RAW_API_BASE_URL;
  }
})();

const api = axios.create({
  baseURL: apiBaseURL,
});

const apiUrlObject = (() => {
  try {
    return new URL(
      apiBaseURL,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
  } catch {
    return new URL("http://localhost:8080/api");
  }
})();

const apiOrigin = apiUrlObject.origin;

export const resolveAssetUrl = (path?: string | null) => {
  if (!path) {
    return undefined;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${apiOrigin}${path}`;
  }
  return `${apiOrigin}/${path.replace(/^\/+/, "")}`;
};

export interface UserSummary {
  id: string;
  role: string;
  ins?: string;
  email?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  avatarUrl?: string;
  teacherTitle?: string;
  teacherBio?: string;
  staffPosition?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserSummary;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    limit: number;
    offset: number;
    total: number;
  };
}

export const setAuthToken = (token: string | null) => {
  setCachedAccessToken(token);
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.request.use((config) => {
  const token = getCachedAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    const headers = config.headers as Record<string, string>;
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRedirectingToLogin = false;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
      setCachedAccessToken(null);
      const loginUrl = "/login";
      if (window.location.pathname !== loginUrl) {
        window.location.href = loginUrl;
      } else {
        isRedirectingToLogin = false;
      }
    }
    return Promise.reject(err);
  }
);

export const loginByINS = async (ins: string, password: string) => {
  const { data } = await api.post<AuthResponse>("/auth/login/ins", {
    ins,
    password,
  });
  return data;
};

export const fetchProfile = async () => {
  const { data } = await api.get<UserSummary>("/profile");
  return data;
};

export const uploadProfileAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await api.put<UserSummary>("/profile/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteProfileAvatar = async () => {
  const { data } = await api.delete<UserSummary>("/profile/avatar");
  return data;
};

const createAvatarFormData = (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return formData;
};

export const uploadAdminUserAvatar = async (userId: string, file: File) => {
  const formData = createAvatarFormData(file);
  const { data } = await api.put<UserSummary>(
    `/admin/users/${userId}/avatar`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteAdminUserAvatar = async (userId: string) => {
  const { data } = await api.delete<UserSummary>(
    `/admin/users/${userId}/avatar`
  );
  return data;
};

export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}) => {
  await api.patch("/auth/password", payload);
};

export const resolveAvatarUrl = (path?: string | null) =>
  resolveAssetUrl(path);

export const fetchTeacherDashboard = async () => {
  const { data } = await api.get("/teacher/dashboard");
  return data;
};

export const fetchTeacherGradeTable = async (
  subjectId: string,
  groupId: string,
  params?: { limit?: number; offset?: number; search?: string }
) => {
  const { data } = await api.get(
    `/teacher/subjects/${subjectId}/groups/${groupId}/grades`,
    { params }
  );
  return data;
};

export const upsertGrade = async (payload: {
  sessionId: string;
  studentId: string;
  value: number;
  notes?: string;
}) => {
  const { data } = await api.post(`/teacher/grades`, payload);
  return data;
};

export const updateGrade = async (
  gradeId: string,
  payload: { value: number; notes?: string }
) => {
  const { data } = await api.patch(`/teacher/grades/${gradeId}`, payload);
  return data;
};

export const deleteGrade = async (gradeId: string) => {
  await api.delete(`/teacher/grades/${gradeId}`);
};

export const fetchStudentDashboard = async () => {
  const { data } = await api.get("/student/dashboard");
  return data;
};

export const fetchStudentSubjects = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/student/subjects", {
    params,
  });
  return data;
};

export const fetchStudentSubjectAverage = async (subjectId: string) => {
  const { data } = await api.get(`/student/subjects/${subjectId}/averages`);
  return data;
};

export const fetchDeanGroups = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/dean/groups", {
    params,
  });
  return data;
};

export const fetchDeanSubjects = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/dean/subjects", {
    params,
  });
  return data;
};

export const fetchDeanTeachers = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/dean/teachers", {
    params,
  });
  return data;
};

export const fetchDeanStudents = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/dean/students", {
    params,
  });
  return data;
};

export const createDeanGroup = async (payload: {
  name: string;
  description?: string;
}) => {
  const { data } = await api.post("/dean/groups", payload);
  return data;
};

export const deleteDeanGroup = async (groupId: string) => {
  await api.delete(`/dean/groups/${groupId}`);
};

export const createDeanSubject = async (payload: {
  code: string;
  name: string;
  description?: string;
}) => {
  const { data } = await api.post("/dean/subjects", payload);
  return data;
};

export const deleteDeanSubject = async (subjectId: string) => {
  await api.delete(`/dean/subjects/${subjectId}`);
};

export const createDeanTeacher = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/dean/teachers", payload);
  return data;
};

export const updateDeanTeacher = async (
  teacherId: string,
  payload: Record<string, unknown>
) => {
  const { data } = await api.patch(`/dean/teachers/${teacherId}`, payload);
  return data;
};

export const createDeanStudent = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/dean/students", payload);
  return data;
};

export const updateDeanStudent = async (
  studentId: string,
  payload: Record<string, unknown>
) => {
  const { data } = await api.patch(`/dean/students/${studentId}`, payload);
  return data;
};

export const assignTeacherToSubject = async (
  subjectId: string,
  payload: { teacherId: string }
) => {
  await api.post(`/dean/subjects/${subjectId}/assign`, payload);
};

export const fetchSubjectTeachers = async (subjectId: string) => {
  if (!subjectId) {
    return [];
  }
  const { data } = await api.get(`/dean/subjects/${subjectId}/teachers`);
  return data;
};

export const attachGroupToSubject = async (
  subjectId: string,
  payload: { groupId: string }
) => {
  await api.post(`/dean/subjects/${subjectId}/groups`, payload);
};

export const assignStudentToGroup = async (
  groupId: string,
  payload: { studentIds: string[] }
) => {
  await api.post(`/dean/groups/${groupId}/students`, payload);
};

export const uploadDeanStudentAvatar = async (
  studentId: string,
  file: File
) => {
  const formData = createAvatarFormData(file);
  const { data } = await api.put<UserSummary>(
    `/dean/students/${studentId}/avatar`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteDeanStudentAvatar = async (studentId: string) => {
  const { data } = await api.delete<UserSummary>(
    `/dean/students/${studentId}/avatar`
  );
  return data;
};

export const uploadDeanTeacherAvatar = async (
  teacherId: string,
  file: File
) => {
  const formData = createAvatarFormData(file);
  const { data } = await api.put<UserSummary>(
    `/dean/teachers/${teacherId}/avatar`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteDeanTeacherAvatar = async (teacherId: string) => {
  const { data } = await api.delete<UserSummary>(
    `/dean/teachers/${teacherId}/avatar`
  );
  return data;
};

export const fetchDeanStudentSubjects = async (
  studentId: string,
  params?: { limit?: number; offset?: number; search?: string }
) => {
  const { data } = await api.get<PaginatedResponse<any>>(
    `/dean/students/${studentId}/subjects`,
    { params }
  );
  return data;
};

export const updateDeanGrade = async (
  gradeId: string,
  payload: { value: number; notes?: string }
) => {
  const { data } = await api.patch(`/dean/grades/${gradeId}`, payload);
  return data;
};

export const scheduleSession = async (payload: {
  subjectId: string;
  teacherId: string;
  groupIds: string[];
  date: string;
  slot: number;
  topic?: string;
}) => {
  const { data } = await api.post("/dean/sessions", payload);
  return data;
};

export const fetchGroupRanking = async () => {
  const { data } = await api.get("/dean/groups/ranking");
  return data;
};

export const fetchAdminDeans = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/admin/deans", {
    params,
  });
  return data;
};

export const fetchAdminUsers = async (
  role: "student" | "teacher" | "dean",
  params?: { limit?: number; offset?: number; search?: string }
) => {
  const { data } = await api.get<PaginatedResponse<any>>("/admin/users", {
    params: { role, ...params },
  });
  return data;
};

export const createDeanStaff = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/admin/deans", payload);
  return data;
};

export const deleteDeanStaff = async (deanId: string) => {
  await api.delete(`/admin/deans/${deanId}`);
};

export const restoreDeanStaff = async (deanId: string) => {
  await api.post(`/admin/deans/${deanId}/restore`);
};

export const fetchAdminDeletedUsers = async (
  role: "student" | "teacher" | "dean",
  params?: { limit?: number; offset?: number; search?: string }
) => {
  const { data } = await api.get<PaginatedResponse<any>>(
    "/admin/users/deleted",
    {
      params: { role, ...params },
    }
  );
  return data;
};

export const restoreAdminUser = async (userId: string) => {
  await api.post(`/admin/users/${userId}/restore`);
};

export const resetAdminUserPassword = async (
  userId: string,
  password: string
) => {
  await api.patch(`/admin/users/${userId}/password`, { password });
};

export const updateAdminUser = async (
  userId: string,
  payload: Record<string, unknown>
) => {
  const { data } = await api.patch(`/admin/users/${userId}`, payload);
  return data;
};

export const deleteAdminUser = async (userId: string) => {
  await api.delete(`/admin/users/${userId}`);
};

export const fetchAdminDeletedGroups = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>(
    "/admin/groups/deleted",
    { params }
  );
  return data;
};

export const restoreAdminGroup = async (groupId: string) => {
  await api.post(`/admin/groups/${groupId}/restore`);
};

export const fetchAdminDeletedSubjects = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>(
    "/admin/subjects/deleted",
    { params }
  );
  return data;
};

export const restoreAdminSubject = async (subjectId: string) => {
  await api.post(`/admin/subjects/${subjectId}/restore`);
};

export const detachStudentFromGroup = async (
  groupId: string,
  studentId: string
) => {
  await api.delete(`/dean/groups/${groupId}/students/${studentId}`);
};

export const detachTeacherFromSubject = async (
  subjectId: string,
  teacherId: string
) => {
  await api.delete(`/dean/subjects/${subjectId}/teachers/${teacherId}`);
};

type ScheduleParams = {
  subjectId?: string;
  groupId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
};

export const fetchDeanSchedule = async (params?: ScheduleParams) => {
  const { data } = await api.get("/dean/schedule", { params });
  return data;
};

export const fetchTeacherSchedule = async (
  params?: Partial<ScheduleParams>
) => {
  const { data } = await api.get("/teacher/schedule", { params });
  return data;
};

export const fetchStudentSchedule = async (
  params?: Pick<ScheduleParams, "subjectId" | "from" | "to">
) => {
  const { data } = await api.get("/student/schedule", { params });
  return data;
};

export default api;
```

## File: src/pages/Login.tsx
```typescript
import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Alert,
  AlertIcon,
  useColorModeValue,
} from "@chakra-ui/react";
import { loginByINS, type AuthResponse } from "../api/client";

interface LoginProps {
  onLogin: (auth: AuthResponse) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [ins, setIns] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const trimmedINS = ins.trim();
      const response = await loginByINS(trimmedINS, password);
      onLogin(response);
    } catch (err) {
      setError("Неверные учётные данные");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      maxW="sm"
      mx="auto"
      mt={16}
      p={8}
      borderWidth="1px"
      borderRadius="xl"
      boxShadow={useColorModeValue("lg", "dark-lg")}
      bg={useColorModeValue("white", "gray.800")}
      transition="transform 0.3s ease, box-shadow 0.3s ease"
      _hover={{
        transform: "translateY(-4px)",
        boxShadow: useColorModeValue("xl", "dark-xl"),
      }}
    >
      <Heading size="lg" mb={6} textAlign="center">
        Вход в систему
      </Heading>
      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <FormControl>
            <FormLabel>ИНС</FormLabel>
            <Input
              value={ins}
              onChange={(event) => setIns(event.target.value)}
              placeholder="00000001"
              isRequired
            />
          </FormControl>
          <FormControl>
            <FormLabel>Пароль</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              isRequired
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={loading}
            transition="transform 0.2s ease"
            _hover={{ transform: "translateY(-2px)" }}
          >
            Войти
          </Button>
          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}
        </Stack>
      </form>
    </Box>
  );
};

export default Login;
```

## File: .gitignore
```
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
logs/
*.log

# Build outputs
dist/
build/

# Vite
.vite/
.vite/*

# Caches
.cache/
.parcel-cache/
.eslintcache
/.turbo
/.turbo/*

# Environment variables
.env
.env.*.local
!.env.example

# Coverage
coverage/

# TypeScript
*.tsbuildinfo

# OS & editors
.DS_Store
Thumbs.db
*.swp
.idea/
.vscode/
*.sublime-project
*.sublime-workspace

# Misc
*.tgz

*.js

gradleflow-front-vue/
```
