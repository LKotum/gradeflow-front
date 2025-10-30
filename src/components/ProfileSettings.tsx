import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { AxiosError } from "axios";
import {
  Alert,
  AlertIcon,
  Avatar,
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

interface ProfileSettingsProps {
  profile?: UserSummary | null;
  heading?: string;
  showName?: boolean;
  onProfileUpdate?: (profile: UserSummary) => void;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const extractErrorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<{ message?: string; error?: string; detail?: string }>;
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
  const [localProfile, setLocalProfile] = useState<UserSummary | null>(profile ?? null);
  const [profileLoading, setProfileLoading] = useState(!profile);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const handleAvatarButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
    if (file.size > MAX_AVATAR_SIZE) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер аватара — 5 МБ",
        status: "warning",
      });
      return;
    }
    setAvatarLoading(true);
    try {
      const updated = await uploadProfileAvatar(file);
      setLocalProfile(updated);
      setProfileError(null);
      onProfileUpdate?.(updated);
      toast({
        title: "Аватар обновлён",
        status: "success",
      });
    } catch (error) {
      toast({
        title: "Не удалось загрузить аватар",
        description: extractErrorMessage(error, "Попробуйте выбрать другой файл"),
        status: "error",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarLoading(true);
    try {
      const updated = await deleteProfileAvatar();
      setLocalProfile(updated);
      onProfileUpdate?.(updated);
      toast({
        title: "Аватар удалён",
        status: "info",
      });
    } catch (error) {
      toast({
        title: "Не удалось удалить аватар",
        description: extractErrorMessage(error, "Повторите попытку позже"),
        status: "error",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
              <Avatar
                size="xl"
                name={fullName}
                src={localProfile.avatarUrl ?? undefined}
                bg="brand.500"
              />
              <Stack spacing={3}>
                {showName && (
                  <Box>
                    <Text fontWeight="semibold" fontSize="lg">
                      {fullName}
                    </Text>
                    <Text color={subtleText}>
                      ИНС: {localProfile.ins ?? "—"}
                    </Text>
                    <Text color={subtleText}>
                      E-mail: {localProfile.email ?? "—"}
                    </Text>
                  </Box>
                )}
                <HStack spacing={3} flexWrap="wrap">
                  <Button
                    colorScheme="brand"
                    onClick={handleAvatarButtonClick}
                    isLoading={avatarLoading}
                  >
                    Обновить фото
                  </Button>
                  {localProfile.avatarUrl && (
                    <Button
                      variant="ghost"
                      colorScheme="red"
                      onClick={handleAvatarDelete}
                      isLoading={avatarLoading}
                    >
                      Удалить фото
                    </Button>
                  )}
                </HStack>
                <Text fontSize="sm" color={subtleText}>
                  Поддерживаются изображения форматов PNG, JPG, GIF. Размер не более 5 МБ.
                </Text>
              </Stack>
            </HStack>

            <Divider />

            <Box as="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={4}>
                <Text fontWeight="semibold">Смена пароля</Text>
                <FormControl isRequired>
                  <FormLabel>Текущий пароль</FormLabel>
                  <Input
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
                  <FormLabel>Новый пароль</FormLabel>
                  <Input
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
                  <FormLabel>Повторите новый пароль</FormLabel>
                  <Input
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
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleAvatarChange}
      />
    </Box>
  );
};

export default ProfileSettings;
