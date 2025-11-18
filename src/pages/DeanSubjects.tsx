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
import ResponsiveTableContainer from "../components/ResponsiveTableContainer";
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
    <Box p={{ base: 4, md: 6 }}>
      <Heading size="lg" mb={{ base: 4, md: 6 }}>
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
                name="code"
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
                name="name"
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
                name="description"
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
                name="from"
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
                name="to"
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
          <ResponsiveTableContainer>
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
          </ResponsiveTableContainer>
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
          <ResponsiveTableContainer>
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
          </ResponsiveTableContainer>
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
