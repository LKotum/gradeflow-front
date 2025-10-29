import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@chakra-ui/react";
import {
  createDeanSubject,
  fetchDeanGroups,
  fetchDeanSchedule,
  fetchDeanSubjects,
  fetchDeanTeachers,
} from "../api/client";

const PAGE_LIMIT = 200;

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

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");

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
      const refreshed = await fetchDeanSubjects({ limit: PAGE_LIMIT });
      setSubjects(refreshed.data ?? []);
    } catch (err) {
      setError("Не удалось создать предмет");
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
      <Heading size="lg" mb={4}>
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
        alignItems="flex-start"
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
        >
          <Heading size="md" mb={4}>
            Создать предмет
          </Heading>
          <Stack spacing={3}>
            <FormControl isRequired>
              <FormLabel>Код</FormLabel>
              <Input
                value={subjectForm.code}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, code: e.target.value })
                }
                placeholder="MATH101"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Название</FormLabel>
              <Input
                value={subjectForm.name}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, name: e.target.value })
                }
                placeholder="Математический анализ"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Описание</FormLabel>
              <Input
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
            <Button type="submit" colorScheme="brand" isLoading={formLoading}>
              Сохранить
            </Button>
          </Stack>
        </Box>

        <Box
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          as="form"
          onSubmit={handleScheduleSubmit}
        >
          <Heading size="md" mb={4}>
            Фильтр расписания
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Предмет</FormLabel>
              <Select
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
              <FormLabel>Группа</FormLabel>
              <Select
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
              <FormLabel>Преподаватель</FormLabel>
              <Select
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
              <FormLabel>Дата с</FormLabel>
              <Input
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
              <FormLabel>Дата по</FormLabel>
              <Input
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
              onClick={() =>
                setScheduleFilters({
                  subjectId: "",
                  groupId: "",
                  teacherId: "",
                  ...createDefaultDateRange(),
                })
              }
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
                </Tr>
              </Thead>
              <Tbody>
                {subjects.length === 0 ? (
                  <Tr>
                    <Td colSpan={3}>
                      <Text color="gray.500">Предметы не найдены</Text>
                    </Td>
                  </Tr>
                ) : (
                  subjects.map((subject: any) => (
                    <Tr key={subject.id}>
                      <Td>{subject.code}</Td>
                      <Td>{subject.name}</Td>
                      <Td>{subject.description ?? "—"}</Td>
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
    </Box>
  );
};

export default DeanSubjects;
