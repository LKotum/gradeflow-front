import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import {
  assignTeacherToSubject,
  createDeanTeacher,
  detachTeacherFromSubject,
  fetchDeanGroups,
  fetchDeanSubjects,
  fetchDeanTeachers,
  scheduleSession,
} from "../api/client";

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
  const [teacherSearch, setTeacherSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const tableBg = useColorModeValue("gray.100", "gray.700");

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
        firstName: teacherForm.firstName,
        lastName: teacherForm.lastName,
        email: teacherForm.email || undefined,
      });
      setTeacherForm({ password: "", firstName: "", lastName: "", email: "" });
      await loadTeachers(teachersMeta.offset, teacherSearch);
    } catch (err) {
      setError("Не удалось создать преподавателя");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAssignmentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignmentForm.subjectId || !assignmentForm.teacherId) return;
    setFormLoading(true);
    setError(null);
    try {
      await assignTeacherToSubject(assignmentForm.subjectId, {
        teacherId: assignmentForm.teacherId,
      });
      setAssignmentForm({ subjectId: "", teacherId: "" });
    } catch (err) {
      setError("Не удалось назначить преподавателя на предмет");
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
    if (!detachForm.subjectId || !detachForm.teacherId) {
      return;
    }
    setFormLoading(true);
    setError(null);
    try {
      await detachTeacherFromSubject(
        detachForm.subjectId,
        detachForm.teacherId
      );
      setDetachForm({ subjectId: "", teacherId: "" });
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
      <Heading size="lg" mb={4}>
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
                  {teacher.lastName} {teacher.firstName}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button type="submit" colorScheme="brand" isLoading={formLoading}>
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
              onChange={(e) =>
                setDetachForm((prev) => ({
                  ...prev,
                  subjectId: e.target.value,
                }))
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
              value={detachForm.teacherId}
              onChange={(e) =>
                setDetachForm((prev) => ({
                  ...prev,
                  teacherId: e.target.value,
                }))
              }
            >
              {teachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.lastName} {teacher.firstName}
                </option>
              ))}
            </Select>
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
              onChange={(e) =>
                setSessionForm({ ...sessionForm, subjectId: e.target.value })
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
              value={sessionForm.teacherId}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, teacherId: e.target.value })
              }
            >
              {teachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.lastName} {teacher.firstName}
                </option>
              ))}
            </Select>
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
        <FormControl isRequired>
          <FormLabel>Группы</FormLabel>
          <CheckboxGroup
            value={sessionForm.groupIds}
            onChange={(values) =>
              setSessionForm({ ...sessionForm, groupIds: values as string[] })
            }
          >
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2}>
              {groupOptions.map((group) => (
                <Checkbox key={group.id} value={group.id}>
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
                        {teacher.lastName} {teacher.firstName}
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
