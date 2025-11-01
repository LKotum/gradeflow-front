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
  const dragState = useRef({
    active: false,
    pointerId: null as number | null,
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
    try {
      setUploading(true);
      const cropped = await createCroppedFile(draft);
      await onUpload(cropped);
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
    if (removing) {
      return;
    }
    try {
      setRemoving(true);
      if (avatarUrl) {
        await onDelete();
      }
      toast({ title: "Аватар удалён", status: "info" });
      if (!avatarUrl) {
        toast({ title: "Аватар отсутствует", status: "info" });
      }
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
    setDraft((prev) => (prev ? { ...prev, offsetX: nextX, offsetY: nextY } : prev));
  }, [draft]);

  const stopDragging = useCallback(() => {
    const element = previewRef.current;
    if (dragState.current.pointerId !== null && element) {
      element.releasePointerCapture(dragState.current.pointerId);
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

  useEffect(() => () => cleanupDraft(), [cleanupDraft]);

  const renderPreview = () => {
    if (!draft) {
      return null;
    }
    const backgroundPositionX = 50 - draft.offsetX * 50;
    const backgroundPositionY = 50 - draft.offsetY * 50;
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
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
        onPointerCancel={stopDragging}
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
  const originX = (draft.naturalWidth - cropSize) / 2 - draft.offsetX * maxOffsetX;
  const originY = (draft.naturalHeight - cropSize) / 2 - draft.offsetY * maxOffsetY;
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
