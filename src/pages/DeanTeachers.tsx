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
  useToast,
  UnorderedList,
  ListItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
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
  updateDeanTeacher,
  uploadDeanTeacherAvatar,
  deleteDeanTeacherAvatar,
} from "../api/client";
import { formatFullName } from "../utils/name";
import AvatarEditor from "../components/AvatarEditor";
import ResponsiveTableContainer from "../components/ResponsiveTableContainer";

const extractApiError = (error: unknown, fallback: string) => {
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
  const [assignedTeachersBySubject, setAssignedTeachersBySubject] = useState<
    Record<string, any[]>
  >({});
  const [loadingSubjectId, setLoadingSubjectId] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Record<string, any> | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    title: "",
    bio: "",
  });
  const [editTeacherLoading, setEditTeacherLoading] = useState(false);
  const [teacherSubjectsMap, setTeacherSubjectsMap] = useState<
    Record<string, Array<{ id: string; name: string }>>
  >({});
  const [pendingDetachAssignment, setPendingDetachAssignment] = useState<
    { subjectId: string; subjectName: string; teacherId: string; teacherName: string } | null
  >(null);
  const detachConfirmDialog = useDisclosure();
  const detachCancelRef = useRef<HTMLButtonElement | null>(null);
  const [detachProcessing, setDetachProcessing] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const tableBg = useColorModeValue("gray.100", "gray.700");
  const addTeacherPrefix = useId();
  const assignTeacherPrefix = useId();
  const sessionPrefix = useId();
  const sessionGroupsFieldId = useId();
  const teacherSearchFieldId = useId();
  const teacherFormFieldIds = {
    firstName: `${addTeacherPrefix}-first-name`,
    lastName: `${addTeacherPrefix}-last-name`,
    middleName: `${addTeacherPrefix}-middle-name`,
    email: `${addTeacherPrefix}-email`,
    password: `${addTeacherPrefix}-password`,
  };
  const assignmentFieldIds = {
    subject: `${assignTeacherPrefix}-subject`,
    teacher: `${assignTeacherPrefix}-teacher`,
  };
  const sessionFieldIds = {
    subject: `${sessionPrefix}-subject`,
    teacher: `${sessionPrefix}-teacher`,
    date: `${sessionPrefix}-date`,
    slot: `${sessionPrefix}-slot`,
    topic: `${sessionPrefix}-topic`,
  };
  const toast = useToast();
  const editTeacherDialog = useDisclosure();
  const sessionAssignedTeachers =
    assignedTeachersBySubject[sessionForm.subjectId] ?? [];
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

  const buildTeacherAssignments = useCallback(
    async (subjectsList: any[]) => {
      const map: Record<string, Array<{ id: string; name: string }>> = {};
      await Promise.all(
        subjectsList.map(async (item: any) => {
          const subjectId = item.id ?? item.subject?.id;
          if (!subjectId) {
            return;
          }
          try {
            const assigned = await fetchSubjectTeachers(subjectId);
            const subjectName = item.name ?? item.subject?.name ?? "";
            (assigned ?? []).forEach((teacher: any) => {
              if (!teacher?.id) {
                return;
              }
              const current = map[teacher.id] ?? [];
              if (!current.some((entry) => entry.id === subjectId)) {
                map[teacher.id] = [
                  ...current,
                  { id: subjectId, name: subjectName },
                ];
              } else {
                map[teacher.id] = current;
              }
            });
          } catch (err) {
            console.error("failed to load teacher assignments", err);
          }
        })
      );
      setTeacherSubjectsMap(map);
    },
    []
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
      await buildTeacherAssignments(subjectsData.data ?? []);
      await loadTeachers(0, "");
    } catch (catalogError) {
      console.error(catalogError);
      setError("Не удалось загрузить справочники");
    } finally {
      setInitialLoading(false);
    }
  }, [loadTeachers, buildTeacherAssignments]);

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

  const openEditTeacherDialog = (teacher: any) => {
    setEditingTeacher(teacher);
    setEditTeacherForm({
      firstName: teacher.firstName ?? "",
      lastName: teacher.lastName ?? "",
      middleName: teacher.middleName ?? "",
      email: teacher.email ?? "",
      title: teacher.teacherTitle ?? "",
      bio: teacher.teacherBio ?? "",
    });
    editTeacherDialog.onOpen();
  };

  const handleEditTeacherSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTeacher) {
      return;
    }
    setEditTeacherLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      const trim = (value: string) => value.trim();
      const originalFirst = editingTeacher.firstName ?? "";
      const originalLast = editingTeacher.lastName ?? "";
      const originalMiddle = editingTeacher.middleName ?? "";
      const originalEmail = editingTeacher.email ?? "";
      const originalTitle = editingTeacher.teacher?.title ?? "";
      const originalBio = editingTeacher.teacher?.bio ?? "";

      if (trim(editTeacherForm.firstName) !== originalFirst) {
        payload.firstName = trim(editTeacherForm.firstName);
      }
      if (trim(editTeacherForm.lastName) !== originalLast) {
        payload.lastName = trim(editTeacherForm.lastName);
      }
      if (trim(editTeacherForm.middleName) !== originalMiddle) {
        const next = trim(editTeacherForm.middleName);
        payload.middleName = next ? next : null;
      }
      if (trim(editTeacherForm.email) !== originalEmail) {
        const next = trim(editTeacherForm.email);
        payload.email = next ? next : null;
      }
      if (trim(editTeacherForm.title) !== originalTitle) {
        const next = trim(editTeacherForm.title);
        payload.title = next ? next : null;
      }
      if (trim(editTeacherForm.bio) !== originalBio) {
        const next = trim(editTeacherForm.bio);
        payload.bio = next ? next : null;
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
      await updateDeanTeacher(editingTeacher.id, payload);
      await loadTeachers(teachersMeta.offset, teacherSearch);
      editTeacherDialog.onClose();
    } catch (err) {
      toast({
        title: "Не удалось обновить данные преподавателя",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setEditTeacherLoading(false);
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
      await buildTeacherAssignments(subjects);
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

  const handleSessionGroupsChange = useCallback(
    (values: Array<string | number>) => {
      const normalizedValues = values.map(String);
      setSessionForm((prev) => {
        const addedValue = normalizedValues.find(
          (value) => !prev.groupIds.includes(value)
        );
        if (addedValue) {
          return { ...prev, groupIds: [addedValue] };
        }
        if (normalizedValues.length === 0) {
          return { ...prev, groupIds: [] };
        }
        return prev;
      });
    },
    [setSessionForm]
  );

  const handleDetachTeacher = async (subjectId: string, teacherId: string) => {
    if (!subjectId || !teacherId) {
      return;
    }
    setDetachProcessing(true);
    setError(null);
    try {
      await detachTeacherFromSubject(subjectId, teacherId);
      await loadAssignedTeachers(subjectId);
      await buildTeacherAssignments(subjects);
      toast({
        title: "Преподаватель откреплён",
        status: "info",
      });
    } catch (err) {
      console.error(err);
      setError("Не удалось открепить преподавателя от предмета");
    } finally {
      setDetachProcessing(false);
    }
  };

  const handleTeacherAvatarUpload = useCallback(
    async (file: File) => {
      if (!editingTeacher) {
        throw new Error("Преподаватель не выбран");
      }
      try {
        const updated = await uploadDeanTeacherAvatar(editingTeacher.id, file);
        setEditingTeacher((prev) =>
          prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev
        );
        setTeachers((prev) =>
          prev.map((teacher) =>
            teacher.id === updated.id
              ? { ...teacher, avatarUrl: updated.avatarUrl }
              : teacher
          )
        );
      } catch (error) {
        throw new Error(
          extractApiError(error, "Не удалось обновить аватар преподавателя")
        );
      }
    },
    [
      editingTeacher,
      loadTeachers,
      teachersMeta.offset,
      teacherSearch,
      buildTeacherAssignments,
      subjects,
    ]
  );

  const handleTeacherAvatarDelete = useCallback(async () => {
    if (!editingTeacher) {
      throw new Error("Преподаватель не выбран");
    }
    try {
      const updated = await deleteDeanTeacherAvatar(editingTeacher.id);
      setEditingTeacher((prev) =>
        prev ? { ...prev, avatarUrl: updated.avatarUrl ?? null } : prev
      );
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher.id === updated.id ? { ...teacher, avatarUrl: null } : teacher
        )
      );
    } catch (error) {
      throw new Error(
        extractApiError(error, "Не удалось удалить аватар преподавателя")
      );
    }
  }, [
    editingTeacher,
    loadTeachers,
    teachersMeta.offset,
    teacherSearch,
    buildTeacherAssignments,
    subjects,
  ]);

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
    <Box p={{ base: 4, md: 6 }}>
      <Heading size="lg" mb={{ base: 4, md: 6 }}>
        Управление преподавателями
      </Heading>
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} alignItems="flex-start" mb={6}>
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
          minH={{ base: "auto", lg: "100%" }}
        >
          <Heading size="md" mb={3}>Добавить преподавателя</Heading>
          <FormControl id={teacherFormFieldIds.firstName} isRequired>
            <FormLabel htmlFor={teacherFormFieldIds.firstName}>Имя</FormLabel>
            <Input
              id={teacherFormFieldIds.firstName}
              name="firstName"
              value={teacherForm.firstName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, firstName: e.target.value })
              }
            />
          </FormControl>
          <FormControl id={teacherFormFieldIds.lastName} isRequired>
            <FormLabel htmlFor={teacherFormFieldIds.lastName}>Фамилия</FormLabel>
            <Input
              id={teacherFormFieldIds.lastName}
              name="lastName"
              value={teacherForm.lastName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, lastName: e.target.value })
              }
            />
          </FormControl>
          <FormControl id={teacherFormFieldIds.middleName}>
            <FormLabel htmlFor={teacherFormFieldIds.middleName}>Отчество</FormLabel>
            <Input
              id={teacherFormFieldIds.middleName}
              name="middleName"
              value={teacherForm.middleName}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, middleName: e.target.value })
              }
            />
          </FormControl>
          <FormControl id={teacherFormFieldIds.email}>
            <FormLabel htmlFor={teacherFormFieldIds.email}>Электронная почта</FormLabel>
            <Input
              id={teacherFormFieldIds.email}
              name="dean-contact-email"
              type="text"
              inputMode="email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              value={teacherForm.email}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, email: e.target.value })
              }
              placeholder="teacher@example.com"
            />
          </FormControl>
          <FormControl id={teacherFormFieldIds.password} isRequired>
            <FormLabel htmlFor={teacherFormFieldIds.password}>Пароль</FormLabel>
            <Input
              id={teacherFormFieldIds.password}
              name="dean-new-password"
              type="password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="none"
              value={teacherForm.password}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, password: e.target.value })
              }
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={formLoading}
            alignSelf="flex-start"
            mt={4}
          >
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
          minH={{ base: "auto", lg: "100%" }}
        >
          <Heading size="md" mb={3}>Назначить преподавателя на предмет</Heading>
          <FormControl id={assignmentFieldIds.subject} isRequired>
            <FormLabel htmlFor={assignmentFieldIds.subject}>Предмет</FormLabel>
            <Select
              id={assignmentFieldIds.subject}
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
          <FormControl id={assignmentFieldIds.teacher} isRequired>
            <FormLabel htmlFor={assignmentFieldIds.teacher}>Преподаватель</FormLabel>
            <Select
              id={assignmentFieldIds.teacher}
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
            alignSelf="flex-start"
            mt={4}
          >
            Назначить
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
          <FormControl id={sessionFieldIds.subject} isRequired>
            <FormLabel htmlFor={sessionFieldIds.subject}>Предмет</FormLabel>
            <Select
              id={sessionFieldIds.subject}
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
          <FormControl id={sessionFieldIds.teacher} isRequired>
            <FormLabel htmlFor={sessionFieldIds.teacher}>Преподаватель</FormLabel>
            <Select
              id={sessionFieldIds.teacher}
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
          <FormControl id={sessionFieldIds.date} isRequired>
            <FormLabel htmlFor={sessionFieldIds.date}>Дата</FormLabel>
            <Input
              id={sessionFieldIds.date}
              name="sessionDate"
              type="date"
              value={sessionForm.date}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, date: e.target.value })
              }
            />
          </FormControl>
          <FormControl id={sessionFieldIds.slot} isRequired>
            <FormLabel htmlFor={sessionFieldIds.slot}>Пара</FormLabel>
            <Select
              id={sessionFieldIds.slot}
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
        <FormControl id={sessionFieldIds.topic}>
          <FormLabel htmlFor={sessionFieldIds.topic}>Тема занятия</FormLabel>
          <Input
            id={sessionFieldIds.topic}
            name="sessionTopic"
            value={sessionForm.topic}
            onChange={(e) =>
              setSessionForm({ ...sessionForm, topic: e.target.value })
            }
            placeholder="Например, Лабораторная работа №1"
          />
        </FormControl>
        <FormControl as="fieldset" isRequired>
          <FormLabel as="legend">
            Группы <Text as="span" color="red.500">*</Text>
          </FormLabel>
          <CheckboxGroup
            value={sessionForm.groupIds}
            onChange={handleSessionGroupsChange}
          >
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2}>
              {groupOptions.map((group) => (
                <Checkbox
                  key={group.id}
                  value={group.id}
                  isRequired={false}
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
          <FormControl id={teacherSearchFieldId} maxW={{ base: "100%", md: "320px" }}>
            <FormLabel htmlFor={teacherSearchFieldId}>
              Фамилия, имя или ИНС
            </FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                id={teacherSearchFieldId}
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
          <ResponsiveTableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>ФИО</Th>
                  <Th>ИНС</Th>
                  <Th>Email</Th>
                  <Th>Предметы</Th>
                  <Th textAlign="right">Действия</Th>
                </Tr>
              </Thead>
              <Tbody>
                {teachersLoading ? (
                  <Tr>
                    <Td colSpan={5}>
                      <HStack spacing={3}>
                        <Spinner size="sm" />
                        <Text color="gray.500">Обновление списка...</Text>
                      </HStack>
                    </Td>
                  </Tr>
                ) : teachers.length === 0 ? (
                  <Tr>
                    <Td colSpan={5}>
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
                      <Td>
                        {(teacherSubjectsMap[teacher.id] ?? []).length === 0 ? (
                          <Text color="gray.500">Предметы не назначены</Text>
                        ) : (
                          <UnorderedList pl={4} spacing={1}>
                            {(teacherSubjectsMap[teacher.id] ?? []).map(
                              (subject) => {
                                const detachKey = `${subject.id}:${teacher.id}`;
                                return (
                                  <ListItem
                                    key={`${teacher.id}-subject-${subject.id}`}
                                  >
                                    <HStack
                                      justify="space-between"
                                      align="center"
                                      spacing={3}
                                      flexWrap="wrap"
                                      rowGap={2}
                                    >
                                      <Text>{subject.name || "Без названия"}</Text>
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        colorScheme="red"
                                        h="auto"
                                        minH={0}
                                        px={3}
                                        lineHeight="short"
                                        whiteSpace="normal"
                                        textAlign="center"
                                        onClick={() => {
                                          setPendingDetachAssignment({
                                            subjectId: subject.id,
                                            subjectName: subject.name || "Без названия",
                                            teacherId: teacher.id,
                                            teacherName: formatFullName(
                                              teacher.lastName,
                                              teacher.firstName,
                                              teacher.middleName
                                            ),
                                          });
                                          detachConfirmDialog.onOpen();
                                        }}
                                      >
                                        Открепить
                                      </Button>
                                    </HStack>
                                  </ListItem>
                                );
                              }
                            )}
                          </UnorderedList>
                        )}
                      </Td>
                      <Td textAlign="right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => openEditTeacherDialog(teacher)}
                        >
                          Редактировать
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

      <AlertDialog
        isOpen={detachConfirmDialog.isOpen && !!pendingDetachAssignment}
        leastDestructiveRef={detachCancelRef}
        onClose={() => {
          if (detachProcessing) return;
          setPendingDetachAssignment(null);
          detachConfirmDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Открепить преподавателя
            </AlertDialogHeader>
            <AlertDialogBody>
              {pendingDetachAssignment
                ? `Открепить ${pendingDetachAssignment.teacherName} от предмета "${pendingDetachAssignment.subjectName}"?`
                : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={detachCancelRef}
                onClick={detachConfirmDialog.onClose}
                isDisabled={detachProcessing}
              >
                Отмена
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                isLoading={detachProcessing}
                h="auto"
                minH={0}
                px={4}
                whiteSpace="normal"
                lineHeight="short"
                textAlign="center"
                onClick={async () => {
                  if (!pendingDetachAssignment) return;
                  setDetachProcessing(true);
                  try {
                    await handleDetachTeacher(
                      pendingDetachAssignment.subjectId,
                      pendingDetachAssignment.teacherId
                    );
                    setPendingDetachAssignment(null);
                    detachConfirmDialog.onClose();
                  } finally {
                    setDetachProcessing(false);
                  }
                }}
              >
                Открепить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal
        isOpen={editTeacherDialog.isOpen}
        onClose={editTeacherDialog.onClose}
        isCentered
      >
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleEditTeacherSubmit}>
          <ModalHeader>Редактирование преподавателя</ModalHeader>
          <ModalCloseButton isDisabled={editTeacherLoading} />
          <ModalBody>
            <Stack spacing={4}>
              {editingTeacher && (
                <AvatarEditor
                  name={formatFullName(
                    editingTeacher.lastName,
                    editingTeacher.firstName,
                    editingTeacher.middleName
                  )}
                  avatarUrl={editingTeacher.avatarUrl}
                  identifier={editingTeacher.id}
                  onUpload={handleTeacherAvatarUpload}
                  onDelete={editingTeacher.avatarUrl ? handleTeacherAvatarDelete : undefined}
                  size="lg"
                />
              )}
              <Stack spacing={3}>
                <FormControl isRequired>
                  <FormLabel>Имя</FormLabel>
                  <Input
                    value={editTeacherForm.firstName}
                    onChange={(e) =>
                      setEditTeacherForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Фамилия</FormLabel>
                  <Input
                    value={editTeacherForm.lastName}
                    onChange={(e) =>
                      setEditTeacherForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Отчество</FormLabel>
                  <Input
                    value={editTeacherForm.middleName}
                    onChange={(e) =>
                      setEditTeacherForm((prev) => ({
                        ...prev,
                        middleName: e.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={editTeacherForm.email}
                    onChange={(e) =>
                      setEditTeacherForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="teacher@example.com"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Должность</FormLabel>
                  <Input
                    value={editTeacherForm.title}
                    onChange={(e) =>
                      setEditTeacherForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Биография</FormLabel>
                  <Input
                    value={editTeacherForm.bio}
                    onChange={(e) =>
                      setEditTeacherForm((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    placeholder="Краткая информация"
                  />
                </FormControl>
              </Stack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={editTeacherDialog.onClose}
              isDisabled={editTeacherLoading}
            >
              Отмена
            </Button>
            <Button
              colorScheme="brand"
              type="submit"
              isLoading={editTeacherLoading}
            >
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DeanTeachers;
