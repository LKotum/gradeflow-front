import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Stack,
  Text,
  Tag,
  TagLabel,
  SimpleGrid,
  useColorModeValue,
  Spinner,
  HStack,
} from "@chakra-ui/react";
import { fetchTeacherDashboard, fetchTeacherSchedule } from "../api/client";

const TeacherDashboard = () => {
  const [data, setData] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

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
        setScheduleError("Не удалось загрузить данные преподавателя");
      } finally {
        setScheduleLoading(false);
      }
    };
    load();
  }, []);

  if (!data) {
    return (
      <Box p={6}>
        <HStack spacing={3}>
          <Spinner size="sm" />
          <Text color="gray.500">Загрузка данных...</Text>
        </HStack>
      </Box>
    );
  }

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");

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
        <Heading size="md" mb={2}>
          {data.profile.firstName} {data.profile.lastName}
        </Heading>
        <Text>ИНС: {data.profile.ins ?? "—"}</Text>
        <Text>Почта: {data.profile.email ?? "—"}</Text>
      </Box>
      <Heading size="md" mb={3}>
        Закреплённые предметы
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {data.subjects.map((item: any) => (
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
        ))}
      </SimpleGrid>

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
