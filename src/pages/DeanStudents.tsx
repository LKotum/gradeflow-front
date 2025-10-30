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
  useDisclosure,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import {
  assignStudentToGroup,
  createDeanStudent,
  detachStudentFromGroup,
  fetchDeanGroups,
  fetchDeanStudents,
} from "../api/client";
import { formatFullName } from "../utils/name";

const PAGE_LIMIT = 20;

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

  const detachDialog = useDisclosure();
  const cancelDetachRef = useRef<HTMLButtonElement | null>(null);

  const cardBg = useColorModeValue("white", "gray.800");
  const tableBg = useColorModeValue("gray.100", "gray.700");
  const studentSelectionFieldId = useId();
  const studentSelectionLabelId = `${studentSelectionFieldId}-label`;

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
        if (data.meta) {
          setStudentsMeta(data.meta);
        } else {
          setStudentsMeta({ limit: PAGE_LIMIT, offset, total: list.length });
        }
        setSelectedStudents((prev) =>
          prev.filter((id) => list.some((student: any) => student.id === id))
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
      await assignStudentToGroup(selectedGroup, {
        studentIds: selectedStudents,
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
          onSubmit={handleStudentSubmit}
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
        >
          <Heading size="md">Добавить студента</Heading>
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
              placeholder="Необязательно"
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
          <Button type="submit" colorScheme="brand" isLoading={formLoading}>
            Сохранить студента
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
          onSubmit={handleGroupAssignment}
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
        >
          <Heading size="md">Прикрепить студентов к группе</Heading>
          <FormControl isRequired>
            <FormLabel>Группа</FormLabel>
            <Select
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
          <FormControl>
            <FormLabel id={studentSelectionLabelId}>
              Студенты <Text as="span" color="red.500">*</Text>
            </FormLabel>
            <CheckboxGroup
              aria-labelledby={studentSelectionLabelId}
              value={selectedStudents}
              onChange={(values) => setSelectedStudents(values as string[])}
            >
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={1}>
                {students.map((student: any) => (
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
          </FormControl>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={formLoading || studentsLoading}
          >
            Прикрепить выбранных
          </Button>
        </Stack>
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
                    const groupName =
                      student.student?.group?.name ??
                      student.group?.name ??
                      "Не назначена";
                    const groupId =
                      student.student?.group?.id ?? student.group?.id;
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
                              onClick={() => openDetachDialog(student)}
                              isDisabled={!groupId}
                            >
                              Открепить
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
    </Box>
  );
};

export default DeanStudents;
