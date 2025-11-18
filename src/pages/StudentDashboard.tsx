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
  SimpleGrid,
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

  const profile = data?.profile ?? null;
  const avatarSrc = useAvatarImage(profile?.avatarUrl || undefined);
  const avatarBg = useMemo(() => {
    const seedId = profile?.id ?? "";
    const seedAlt = profile?.ins ?? profile?.email ?? undefined;
    return getAvatarAccentColor(seedId, seedAlt);
  }, [profile?.id, profile?.ins, profile?.email]);
  const showAccent = !avatarSrc;

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

  return (
    <Box p={{ base: 4, md: 6 }}>
      <Heading size="lg" mb={{ base: 3, md: 4 }}>
        Личный кабинет студента
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
          <Stack spacing={2} w="full">
            <Text fontWeight="semibold">
              {formatFullName(
                profile?.lastName ?? "",
                profile?.firstName ?? "",
                profile?.middleName ?? ""
              )}
            </Text>
            <Text>
              <strong>Почта:</strong> {profile?.email ?? "—"}
            </Text>
            <Text>
              <strong>Группа:</strong> {data.group ? data.group.name : "—"}
            </Text>
            <Text>
              <strong>ИНС:</strong> {profile?.ins ?? "—"}
            </Text>
          </Stack>
        </Stack>
      </Box>

      <Heading size="md" mt={8} mb={{ base: 3, md: 4 }}>
        Быстрая сводка
      </Heading>
      <SimpleGrid
        columns={{
          base: 1,
          sm: Math.min(2, stats.length),
          md: stats.length,
        }}
        spacing={{ base: 3, md: 4 }}
        w="full"
      >
        {stats.map((stat) => (
          <Box
            key={stat.label}
            borderWidth="1px"
            borderRadius="xl"
            px={{ base: 4, md: 5 }}
            py={{ base: 3, md: 4 }}
            bg={cardBg}
            boxShadow={cardShadow}
            h="100%"
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
      </SimpleGrid>

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
