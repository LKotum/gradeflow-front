import { useCallback, useEffect, useMemo, useState, useId } from "react";
import {
  Alert,
  AlertIcon,
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
} from "../api/client";
import { formatFullName } from "../utils/name";

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
  const [detachForm, setDetachForm] = useState({
    subjectId: "",
    teacherId: "",
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

  const cardBg = useColorModeValue("white", "gray.800");
  const tableBg = useColorModeValue("gray.100", "gray.700");
  const sessionGroupsFieldId = useId();
  const sessionGroupsLabelId = `${sessionGroupsFieldId}-label`;
  const toast = useToast();
  const detachTeachers =
    assignedTeachersBySubject[detachForm.subjectId] ?? [];
  const sessionAssignedTeachers =
    assignedTeachersBySubject[sessionForm.subjectId] ?? [];
  const detachTeachersLoading =
    !!detachForm.subjectId && loadingSubjectId === detachForm.subjectId;
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
      await loadTeachers(0, "");
    } catch (catalogError) {
      console.error(catalogError);
      setError("Не удалось загрузить справочники");
    } finally {
      setInitialLoading(false);
    }
  }, [loadTeachers]);

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

  const handleDetachSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { subjectId, teacherId } = detachForm;
    if (!subjectId || !teacherId) {
      return;
    }
    setFormLoading(true);
    setError(null);
    try {
      await detachTeacherFromSubject(subjectId, teacherId);
      await loadAssignedTeachers(subjectId);
      setDetachForm({ subjectId, teacherId: "" });
    } catch (err) {
      setError("Не удалось открепить преподавателя от предмета");
    } finally {
      setFormLoading(false);
    }
  };

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

      <SimpleGrid
        columns={{ base: 1, lg: 2, xl: 3 }}
        spacing={6}
        alignItems="flex-start"
        mb={6}
      >
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
          <FormControl isRequired>
            <FormLabel>Имя</FormLabel>
            <Input
              value={teacherForm.firstName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, firstName: e.target.value })
              }
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Фамилия</FormLabel>
            <Input
              value={teacherForm.lastName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, lastName: e.target.value })
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel>Отчество</FormLabel>
            <Input
              value={teacherForm.middleName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, middleName: e.target.value })
              }
              placeholder="Необязательно"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Электронная почта</FormLabel>
            <Input
              value={teacherForm.email}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, email: e.target.value })
              }
              placeholder="teacher@example.com"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Пароль</FormLabel>
            <Input
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
          <FormControl isRequired>
            <FormLabel>Предмет</FormLabel>
            <Select
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
          <FormControl isRequired>
            <FormLabel>Преподаватель</FormLabel>
            <Select
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

        <Stack
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          spacing={3}
          bg={cardBg}
          boxShadow="md"
          as="form"
          onSubmit={handleDetachSubmit}
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
        >
          <Heading size="md">Открепить преподавателя</Heading>
          <FormControl isRequired>
            <FormLabel>Предмет</FormLabel>
            <Select
              placeholder="Выберите предмет"
              value={detachForm.subjectId}
              onChange={(e) => {
                const value = e.target.value;
                setDetachForm({ subjectId: value, teacherId: "" });
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
          <FormControl isRequired>
            <FormLabel>Преподаватель</FormLabel>
            <Select
              placeholder={
                !detachForm.subjectId
                  ? "Сначала выберите предмет"
                  : detachTeachersLoading
                  ? "Загрузка..."
                  : detachTeachers.length === 0
                  ? "Назначенных преподавателей нет"
                  : "Выберите преподавателя"
              }
              value={detachForm.teacherId}
              onChange={(e) =>
                setDetachForm((prev) => ({
                  ...prev,
                  teacherId: e.target.value,
                }))
              }
              isDisabled={
                !detachForm.subjectId ||
                detachTeachersLoading ||
                detachTeachers.length === 0
              }
            >
              {detachTeachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {formatFullName(
                    teacher.lastName,
                    teacher.firstName,
                    teacher.middleName
                  )}
                </option>
              ))}
            </Select>
            {detachForm.subjectId && detachTeachersLoading && (
              <HStack spacing={2} mt={2}>
                <Spinner size="sm" />
                <Text fontSize="sm" color="gray.500">
                  Загрузка списка назначенных преподавателей...
                </Text>
              </HStack>
            )}
            {detachForm.subjectId &&
              !detachTeachersLoading &&
              detachTeachers.length === 0 && (
                <Text fontSize="sm" color="gray.500" mt={2}>
                  Для выбранного предмета нет назначенных преподавателей.
                </Text>
              )}
          </FormControl>
          <Button
            type="submit"
            colorScheme="red"
            variant="outline"
            isLoading={formLoading}
          >
            Открепить
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
          <FormControl isRequired>
            <FormLabel>Предмет</FormLabel>
            <Select
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
          <FormControl isRequired>
            <FormLabel>Преподаватель</FormLabel>
            <Select
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
          <FormControl isRequired>
            <FormLabel>Дата</FormLabel>
            <Input
              type="date"
              value={sessionForm.date}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, date: e.target.value })
              }
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Пара</FormLabel>
            <Select
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
        <FormControl>
          <FormLabel>Тема занятия</FormLabel>
          <Input
            value={sessionForm.topic}
            onChange={(e) =>
              setSessionForm({ ...sessionForm, topic: e.target.value })
            }
            placeholder="Например, Лабораторная работа №1"
          />
        </FormControl>
        <FormControl>
          <FormLabel id={sessionGroupsLabelId}>
            Группы <Text as="span" color="red.500">*</Text>
          </FormLabel>
          <CheckboxGroup
            aria-labelledby={sessionGroupsLabelId}
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
          <FormControl maxW={{ base: "100%", md: "320px" }}>
            <FormLabel>Фамилия, имя или ИНС</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
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
                </Tr>
              </Thead>
              <Tbody>
                {teachersLoading ? (
                  <Tr>
                    <Td colSpan={3}>
                      <HStack spacing={3}>
                        <Spinner size="sm" />
                        <Text color="gray.500">Обновление списка...</Text>
                      </HStack>
                    </Td>
                  </Tr>
                ) : teachers.length === 0 ? (
                  <Tr>
                    <Td colSpan={3}>
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
    </Box>
  );
};

export default DeanTeachers;
