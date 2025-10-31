import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import type { AxiosError } from "axios";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Badge,
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
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import {
  assignStudentToGroup,
  createDeanStudent,
  detachStudentFromGroup,
  fetchDeanGroups,
  fetchDeanStudents,
  updateDeanStudent,
  fetchDeanStudentSubjects,
  updateDeanGrade,
  uploadDeanStudentAvatar,
  deleteDeanStudentAvatar,
} from "../api/client";
import { formatFullName } from "../utils/name";
import AvatarEditor from "../components/AvatarEditor";
import { invalidateAvatarCache } from "../hooks/useAvatarImage";

const PAGE_LIMIT = 20;

const extractApiError = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<{
    message?: string;
    error?: string;
    detail?: string;
  }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.response?.data?.error ??
    axiosError?.response?.data?.detail ??
    fallback
  );
};

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
  const [editingStudent, setEditingStudent] = useState<Record<string, any> | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [gradebookStudent, setGradebookStudent] = useState<any | null>(null);
  const [gradebook, setGradebook] = useState<any[]>([]);
  const [gradebookMeta, setGradebookMeta] = useState({
    limit: PAGE_LIMIT,
    offset: 0,
    total: 0,
  });
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradeUpdating, setGradeUpdating] = useState<string | null>(null);
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});
  const gradeOptions = ["2", "3", "4", "5"];

  const detachDialog = useDisclosure();
  const editDialog = useDisclosure();
  const gradebookDialog = useDisclosure();
  const cancelDetachRef = useRef<HTMLButtonElement | null>(null);

  const cardBg = useColorModeValue("white", "gray.800");
  const tableBg = useColorModeValue("gray.100", "gray.700");
  const studentSelectionFieldId = useId();
  const assignmentGroupSelectId = useId();
  const toast = useToast();

  const assignableStudents = useMemo(
    () =>
      students.filter(
        (student: any) =>
          !(student.group?.id ?? student.student?.group?.id ?? null)
      ),
    [students]
  );

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
        const assignableSet = new Set(
          list
            .filter(
              (student: any) =>
                !(student.group?.id ?? student.student?.group?.id ?? null)
            )
            .map((student: any) => student.id)
        );
        if (data.meta) {
          setStudentsMeta(data.meta);
        } else {
          setStudentsMeta({ limit: PAGE_LIMIT, offset, total: list.length });
        }
        setSelectedStudents((prev) =>
          prev.filter((id) => assignableSet.has(id))
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
      const selectedDetails = students.filter((student: any) =>
        selectedStudents.includes(student.id)
      );
      const alreadyAssigned = selectedDetails.filter(
        (student: any) =>
          !!(student.group?.id ?? student.student?.group?.id ?? null)
      );
      const toAttach = selectedDetails.filter(
        (student: any) =>
          !(student.group?.id ?? student.student?.group?.id ?? null)
      );
      if (alreadyAssigned.length > 0) {
        toast({
          title: "Студенты уже в группе",
          description:
            "Сначала открепите выбранных студентов от текущей группы.",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
      }
      if (toAttach.length === 0) {
        setSelectedStudents([]);
        setFormLoading(false);
        return;
      }
      await assignStudentToGroup(selectedGroup, {
        studentIds: toAttach.map((student: any) => student.id),
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

  const openEditStudentDialog = (student: any) => {
    setEditingStudent(student);
    setEditStudentForm({
      firstName: student.firstName ?? "",
      lastName: student.lastName ?? "",
      middleName: student.middleName ?? "",
      email: student.email ?? "",
    });
    editDialog.onOpen();
  };

  const handleEditStudentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingStudent) {
      return;
    }
    setEditLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      const trim = (value: string) => value.trim();
      const originalFirst = editingStudent.firstName ?? "";
      const originalLast = editingStudent.lastName ?? "";
      const originalMiddle = editingStudent.middleName ?? "";
      const originalEmail = editingStudent.email ?? "";

      if (trim(editStudentForm.firstName) !== originalFirst) {
        payload.firstName = trim(editStudentForm.firstName);
      }
      if (trim(editStudentForm.lastName) !== originalLast) {
        payload.lastName = trim(editStudentForm.lastName);
      }
      if (trim(editStudentForm.middleName) !== originalMiddle) {
        const next = trim(editStudentForm.middleName);
        payload.middleName = next ? next : null;
      }
      if (trim(editStudentForm.email) !== originalEmail) {
        const next = trim(editStudentForm.email);
        payload.email = next ? next : null;
      }
      if (Object.keys(payload).length === 0) {
        toast({
          title: "Изменения не внесены",
          status: "info",
          duration: 2500,
          isClosable: true,
        });
        return;
      }
      await updateDeanStudent(editingStudent.id, payload);
      await loadStudents(studentsMeta.offset, search);
      editDialog.onClose();
    } catch (err) {
      toast({
        title: "Не удалось обновить данные студента",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleStudentAvatarUpload = useCallback(
    async (file: File) => {
      if (!editingStudent) {
        throw new Error("Студент не выбран");
      }
      try {
        const previousPath = editingStudent.avatarUrl;
        const updated = await uploadDeanStudentAvatar(editingStudent.id, file);
        invalidateAvatarCache(previousPath);
        invalidateAvatarCache(updated.avatarUrl);
        setEditingStudent((prev) =>
          prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev
        );
        await loadStudents(studentsMeta.offset, search);
      } catch (error) {
        throw new Error(
          extractApiError(error, "Не удалось обновить аватар студента")
        );
      }
    },
    [editingStudent, loadStudents, studentsMeta.offset, search]
  );

  const handleStudentAvatarDelete = useCallback(async () => {
    if (!editingStudent) {
      throw new Error("Студент не выбран");
    }
    try {
      const previousPath = editingStudent.avatarUrl;
      const updated = await deleteDeanStudentAvatar(editingStudent.id);
      invalidateAvatarCache(previousPath);
      invalidateAvatarCache(updated.avatarUrl);
      setEditingStudent((prev) =>
        prev ? { ...prev, avatarUrl: updated.avatarUrl ?? null } : prev
      );
      await loadStudents(studentsMeta.offset, search);
    } catch (error) {
      throw new Error(
        extractApiError(error, "Не удалось удалить аватар студента")
      );
    }
  }, [editingStudent, loadStudents, studentsMeta.offset, search]);

  const loadGradebook = async (studentId: string) => {
    setGradebookLoading(true);
    try {
      const data = await fetchDeanStudentSubjects(studentId, {
        limit: PAGE_LIMIT,
        offset: 0,
      });
      const list = data.data ?? [];
      setGradebook(list);
      if (data.meta) {
        setGradebookMeta(data.meta);
      } else {
        setGradebookMeta({ limit: PAGE_LIMIT, offset: 0, total: list.length });
      }
      const drafts: Record<string, string> = {};
      list.forEach((subject: any) => {
        (subject.sessions ?? []).forEach((session: any) => {
          if (session.gradeId && session.grade != null) {
            drafts[session.gradeId] = Number(session.grade).toFixed(0);
          }
        });
      });
      setGradeDrafts(drafts);
    } finally {
      setGradebookLoading(false);
    }
  };

  const openGradebookDialog = async (student: any) => {
    setGradebookStudent(student);
    gradebookDialog.onOpen();
    await loadGradebook(student.id);
  };

  const handleGradeDraftChange = (gradeId: string, value: string) => {
    setGradeDrafts((prev) => ({ ...prev, [gradeId]: value }));
  };

  const handleGradeSave = async (gradeId: string, notes?: string | null) => {
    const draft = gradeDrafts[gradeId];
    if (!draft) {
      toast({
        title: "Выберите значение",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    const numeric = Number(draft);
    if (!gradeOptions.includes(draft) || Number.isNaN(numeric)) {
      toast({
        title: "Некорректное значение",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    if (!gradebookStudent) {
      return;
    }
    setGradeUpdating(gradeId);
    try {
      await updateDeanGrade(gradeId, {
        value: numeric,
        notes: notes ?? undefined,
      });
      await loadGradebook(gradebookStudent.id);
      toast({
        title: "Оценка обновлена",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch {
      toast({
        title: "Не удалось обновить оценку",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setGradeUpdating(null);
    }
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
        alignItems="stretch"
        mb={6}
      >
        <Box
          as="form"
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow="md"
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
          onSubmit={handleStudentSubmit}
          minH={{ base: "auto", lg: "100%" }}
        >
          <Heading size="md" mb={3}>
            Добавить студента
          </Heading>
          <Stack spacing={3} flex="1">
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
          </Stack>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={formLoading}
            alignSelf="flex-start"
            mt={4}
          >
            Сохранить студента
          </Button>
        </Box>

        <Box
          as="form"
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow="md"
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
          onSubmit={handleGroupAssignment}
          minH={{ base: "auto", lg: "100%" }}
        >
          <Heading size="md" mb={3}>
            Прикрепить студентов к группе
          </Heading>
          <Stack spacing={3} flex="1">
          <FormControl isRequired>
            <FormLabel htmlFor={assignmentGroupSelectId}>Группа</FormLabel>
            <Select
              id={assignmentGroupSelectId}
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
          <FormControl as="fieldset" isRequired flex="1">
            <FormLabel as="legend">
              Студенты <Text as="span" color="red.500">*</Text>
            </FormLabel>
            <CheckboxGroup
              value={selectedStudents}
              onChange={(values) => setSelectedStudents(values as string[])}
            >
              <SimpleGrid
                columns={{ base: 1, md: 2 }}
                spacing={1}
                maxH="240px"
                overflowY="auto"
                pr={1}
              >
                {assignableStudents.map((student: any) => (
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
            {assignableStudents.length === 0 && (
              <Text fontSize="sm" color="gray.500" mt={2}>
                Все студенты уже состоят в группах. Сначала открепите нужных студентов.
              </Text>
            )}
          </FormControl>
          </Stack>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={formLoading || studentsLoading}
            alignSelf="flex-start"
            mt={4}
          >
            Прикрепить выбранных
          </Button>
        </Box>
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
                    const groupData =
                      student.group ?? student.student?.group ?? null;
                    const groupName = groupData?.name ?? "Не назначена";
                    const groupId = groupData?.id ?? null;
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
                              onClick={() => openGradebookDialog(student)}
                            >
                              Оценки
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => openEditStudentDialog(student)}
                            >
                              Редактировать
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
      <Modal isOpen={editDialog.isOpen} onClose={editDialog.onClose} isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleEditStudentSubmit}>
          <ModalHeader>Редактирование студента</ModalHeader>
          <ModalCloseButton isDisabled={editLoading} />
          <ModalBody>
            <Stack spacing={4}>
              {editingStudent && (
                <AvatarEditor
                  name={formatFullName(
                    editingStudent.lastName,
                    editingStudent.firstName,
                    editingStudent.middleName
                  )}
                  avatarUrl={editingStudent.avatarUrl}
                  identifier={editingStudent.id}
                  onUpload={handleStudentAvatarUpload}
                  onDelete={editingStudent.avatarUrl ? handleStudentAvatarDelete : undefined}
                />
              )}
              <FormControl isRequired>
                <FormLabel>Имя</FormLabel>
                <Input
                  value={editStudentForm.firstName}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Фамилия</FormLabel>
                <Input
                  value={editStudentForm.lastName}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Отчество</FormLabel>
                <Input
                  value={editStudentForm.middleName}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      middleName: e.target.value,
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Электронная почта</FormLabel>
                <Input
                  type="email"
                  value={editStudentForm.email}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="student@example.com"
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={editDialog.onClose} isDisabled={editLoading}>
              Отмена
            </Button>
            <Button colorScheme="brand" type="submit" isLoading={editLoading}>
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={gradebookDialog.isOpen}
        onClose={gradebookDialog.onClose}
        size="6xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {gradebookStudent
              ? `Оценки студента ${formatFullName(
                  gradebookStudent.lastName,
                  gradebookStudent.firstName,
                  gradebookStudent.middleName
                )}`
              : "Оценки студента"}
          </ModalHeader>
          <ModalCloseButton isDisabled={gradebookLoading || gradeUpdating !== null} />
          <ModalBody>
            {gradebookLoading ? (
              <HStack spacing={3}>
                <Spinner size="sm" />
                <Text color="gray.500">Загрузка оценок...</Text>
              </HStack>
            ) : gradebook.length === 0 ? (
              <Text color="gray.500">Оценки не найдены</Text>
            ) : (
              <Accordion allowMultiple>
                {gradebook.map((subject: any) => (
                  <AccordionItem key={subject.subject.id}>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left">
                          <Text fontWeight="semibold">
                            {subject.subject.name}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Код: {subject.subject.code}
                          </Text>
                        </Box>
                        <Badge colorScheme="brand" mr={4}>
                          Средний: {subject.average != null ? Number(subject.average).toFixed(2) : "."}
                        </Badge>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Занятие</Th>
                            <Th textAlign="center">Оценка</Th>
                            <Th>Комментарий</Th>
                            <Th textAlign="right">Действия</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {(subject.sessions ?? []).map((session: any) => {
                            const gradeId: string | undefined = session.gradeId ?? undefined;
                            const gradeValue =
                              gradeId && gradeDrafts[gradeId] !== undefined
                                ? gradeDrafts[gradeId]
                                : session.grade != null
                                ? Number(session.grade).toFixed(0)
                                : "";
                            return (
                              <Tr key={session.session.id}>
                                <Td>
                                  {new Date(session.session.startsAt).toLocaleString("ru-RU")}
                                </Td>
                                <Td textAlign="center">
                                  {gradeId ? (
                                    <Select
                                      size="sm"
                                      value={gradeValue}
                                      onChange={(e) =>
                                        handleGradeDraftChange(gradeId, e.target.value)
                                      }
                                    >
                                      <option value="">Выберите</option>
                                      {gradeOptions.map((value) => (
                                        <option key={value} value={value}>
                                          {value}
                                        </option>
                                      ))}
                                    </Select>
                                  ) : (
                                    <Badge colorScheme="gray">нет оценки</Badge>
                                  )}
                                </Td>
                                <Td>{session.notes ?? ""}</Td>
                                <Td textAlign="right">
                                  <Button
                                    size="xs"
                                    colorScheme="brand"
                                    isDisabled={!gradeId}
                                    isLoading={gradeUpdating === gradeId}
                                    onClick={() =>
                                      gradeId
                                        ? handleGradeSave(gradeId, session.notes)
                                        : undefined
                                    }
                                  >
                                    Сохранить
                                  </Button>
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ModalBody>
          <ModalFooter>
            <Text fontSize="sm" color="gray.500">
              Показано {gradebook.length} из {gradebookMeta.total}
            </Text>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DeanStudents;
