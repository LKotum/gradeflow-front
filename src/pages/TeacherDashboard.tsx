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

  const profile = data?.profile ?? null;
  const avatarSrc = useAvatarImage(profile?.avatarUrl || undefined);
  const avatarBg = useMemo(() => {
    const seedId = profile?.id ?? "";
    const seedAlt = profile?.ins ?? profile?.email ?? undefined;
    return getAvatarAccentColor(seedId, seedAlt);
  }, [profile?.email, profile?.id, profile?.ins]);
  const showAccent = !avatarSrc;
  const subjects = Array.isArray(data?.subjects) ? data.subjects : [];

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

  return (
    <Box p={{ base: 4, md: 6 }}>
      <Heading size="lg" mb={{ base: 3, md: 4 }}>
        Кабинет преподавателя
      </Heading>
      <Box
        borderWidth="1px"
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        mb={{ base: 5, md: 6 }}
        bg={cardBg}
        boxShadow={cardShadow}
        transition="transform 0.2s ease, box-shadow 0.2s ease"
        _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
      >
        <Stack
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          spacing={{ base: 4, md: 5 }}
        >
          <Avatar
            size="lg"
            bg={showAccent ? avatarBg : undefined}
            color={showAccent ? "white" : undefined}
            name={formatFullName(
              profile?.lastName ?? "",
              profile?.firstName ?? "",
              profile?.middleName ?? ""
            )}
            src={avatarSrc || undefined}
          />
          <Stack spacing={1.5}>
            <Heading size="md">
              {formatFullName(
                profile?.lastName ?? "",
                profile?.firstName ?? "",
                profile?.middleName ?? ""
              )}
            </Heading>
            <Text>ИНС: {profile?.ins ?? "—"}</Text>
            <Text>Почта: {profile?.email ?? "—"}</Text>
          </Stack>
        </Stack>
      </Box>
      <Heading size="md" mb={{ base: 3, md: 4 }}>
        Закреплённые предметы
      </Heading>
      <Stack spacing={4}>
        {(subjects ?? []).length === 0 ? (
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
          (subjects ?? []).map((item: any, idx: number) => {
            const subj = item?.subject ?? null;
            const groups = Array.isArray(item?.groups) ? item.groups : [];
            if (!subj) return null;
            return (
              <Box
                key={subj.id ?? `subj-${idx}`}
                borderWidth="1px"
                borderRadius="xl"
                p={{ base: 4, md: 6 }}
                bg={cardBg}
                boxShadow={cardShadow}
                transition="transform 0.2s ease, box-shadow 0.2s ease"
                _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
              >
                <Heading size="sm" mb={2}>
                  {subj.name ?? "Без названия"}
                </Heading>
                <Stack
                  direction={{ base: "column", sm: "row" }}
                  spacing={2}
                  flexWrap="wrap"
                >
                  {groups.map((group: any, gIdx: number) => (
                    <Tag key={group?.id ?? `grp-${gIdx}`} colorScheme="brand">
                      <TagLabel>{group?.name ?? "Группа"}</TagLabel>
                    </Tag>
                  ))}
                </Stack>
              </Box>
            )
          })
        )}
      </Stack>

      <Heading size="md" mt={8} mb={{ base: 3, md: 4 }}>
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
