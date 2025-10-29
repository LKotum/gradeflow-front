import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Select,
  Skeleton,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
  Heading
} from "@chakra-ui/react";
import { ChatIcon, SearchIcon } from "@chakra-ui/icons";
import {
  fetchTeacherDashboard,
  fetchTeacherGradeTable,
  upsertGrade,
  updateGrade,
  deleteGrade
} from "../api/client";

type GradeEntry = {
  gradeId?: string;
  sessionId: string;
  value?: number;
  notes?: string | null;
  student: { id: string; firstName: string; lastName: string };
};

type SessionLabel = { id: string; label: string; time: string; raw: any };

const QUICK_GRADES = [5, 4.5, 4, 3.5, 3, 2.5, 2, 0];

const TeacherGradeEditor = () => {
  const toast = useToast();
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [subjectId, setSubjectId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [gradeTable, setGradeTable] = useState<any | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

  const noteModal = useDisclosure();
  const [noteEditor, setNoteEditor] = useState<{ gradeId: string; notes: string; value: number; title: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");
  const headerBg = useColorModeValue("gray.100", "gray.700");
  const rowHoverBg = useColorModeValue("gray.50", "gray.700");
  const summaryBg = useColorModeValue("gray.100", "gray.800");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await fetchTeacherDashboard();
        setDashboard(data);
      } finally {
        setDashboardLoading(false);
      }
    };
    loadDashboard();
  }, []);



  const loadGradeTable = async (subject: string, group: string, options?: { silent?: boolean }) => {
    if (!subject || !group) {
      setGradeTable(null);
      return;
    }
    const silent = options?.silent ?? false;
    if (!silent) {
      setTableLoading(true);
    }
    try {
      const data = await fetchTeacherGradeTable(subject, group);
      setGradeTable(data);
    } finally {
      if (!silent) {
        setTableLoading(false);
      }
    }
  };

  useEffect(() => {
    if (subjectId && groupId) {
      loadGradeTable(subjectId, groupId);
    } else {
      setGradeTable(null);
    }
  }, [subjectId, groupId]);

  const gradeDictionary = useMemo(() => {
    const map = new Map<string, GradeEntry>();
    gradeTable?.grades?.forEach((entry: GradeEntry) => {
      map.set(`${entry.student.id}-${entry.sessionId}`, entry);
    });
    return map;
  }, [gradeTable]);

  const studentAverages = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    gradeTable?.grades?.forEach((entry: GradeEntry) => {
      if (entry.value == null) return;
      const key = entry.student.id;
      const stat = totals.get(key) ?? { sum: 0, count: 0 };
      stat.sum += entry.value;
      stat.count += 1;
      totals.set(key, stat);
    });
    return totals;
  }, [gradeTable]);

  const sessionAverages = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    gradeTable?.grades?.forEach((entry: GradeEntry) => {
      if (entry.value == null) {
        return;
      }
      const stat = totals.get(entry.sessionId) ?? { sum: 0, count: 0 };
      stat.sum += entry.value;
      stat.count += 1;
      totals.set(entry.sessionId, stat);
    });
    return totals;
  }, [gradeTable]);

  const sessionLabels = useMemo(() => {
    return (gradeTable?.sessions ?? []).map((session: any) => {
      const date = new Date(session.startsAt);
      const day = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
      const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      return {
        id: session.id,
        label: day,
        time,
        raw: session
      };
    });
  }, [gradeTable]);

  const students = gradeTable?.students ?? [];
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) {
      return students;
    }
    const needle = studentSearch.trim().toLowerCase();
    return students.filter((student: any) => {
      const fullName = `${student.lastName} ${student.firstName} ${student.middleName ?? ""}`.toLowerCase();
      return (
        fullName.includes(needle) ||
        (student.ins ?? "").toLowerCase().includes(needle)
      );
    });
  }, [students, studentSearch]);


  const badgeForAverage = (value?: number) => {
    if (value == null) return { color: "gray", text: "—" };
    if (value >= 4.5) return { color: "green", text: value.toFixed(2) };
    if (value >= 3) return { color: "yellow", text: value.toFixed(2) };
    return { color: "red", text: value.toFixed(2) };
  };

  const handleGradeCommit = async (studentId: string, sessionId: string, rawValue: string, existing?: GradeEntry) => {
    const key = `${studentId}-${sessionId}`;
    const trimmed = rawValue.trim();
    if (!subjectId || !groupId) return false;

    if (!trimmed && !existing?.gradeId) {
      toast({ title: "Введите значение", status: "warning", duration: 2500, isClosable: true });
      return false;
    }

    setUpdatingCell(key);
    try {
      if (!trimmed) {
        if (existing?.gradeId) {
          await deleteGrade(existing.gradeId);
          await loadGradeTable(subjectId, groupId);
          return true;
        }
        return false;
      }

      const normalized = trimmed.replace(",", ".");
      const numeric = parseFloat(normalized);
      if (Number.isNaN(numeric)) {
        toast({ title: "Некорректное значение", status: "warning", duration: 2500, isClosable: true });
        return false;
      }

      if (existing?.gradeId) {
        await updateGrade(existing.gradeId, { value: numeric, notes: existing.notes ?? undefined });
      } else {
        await upsertGrade({ sessionId, studentId, value: numeric });
      }
      await loadGradeTable(subjectId, groupId);
      return true;
    } catch (err) {
      toast({ title: "Не удалось сохранить оценку", status: "error", duration: 3000, isClosable: true });
      return false;
    } finally {
      setUpdatingCell(null);
    }
  };

  const openNotesModal = (entry: GradeEntry) => {
    if (!entry.gradeId) return;
    setNoteEditor({
      gradeId: entry.gradeId,
      notes: entry.notes ?? "",
      value: entry.value ?? 0,
      title: `${entry.student.firstName} ${entry.student.lastName}`
    });
    setNoteDraft(entry.notes ?? "");
    noteModal.onOpen();
  };

  const handleSaveNotes = async () => {
    if (!noteEditor || !subjectId || !groupId) return;
    setNoteSaving(true);
    try {
      await updateGrade(noteEditor.gradeId, { value: noteEditor.value, notes: noteDraft || undefined });
      await loadGradeTable(subjectId, groupId);
      noteModal.onClose();
      toast({ title: "Комментарий сохранён", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      toast({ title: "Не удалось сохранить комментарий", status: "error", duration: 3000, isClosable: true });
    } finally {
      setNoteSaving(false);
    }
  };

  const GradeCell = ({ studentId, studentName, session }: { studentId: string; studentName: string; session: any }) => {
    const key = `${studentId}-${session.id}`;
    const entry = gradeDictionary.get(key);
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState(entry?.value != null ? entry.value.toString() : "");

    useEffect(() => {
      setDraft(entry?.value != null ? entry.value.toString() : "");
    }, [entry?.value]);

    const isProcessing = updatingCell === key;

    const close = () => {
      if (!isProcessing) {
        setIsOpen(false);
      }
    };

    const handleSave = async () => {
      const success = await handleGradeCommit(studentId, session.id, draft, entry);
      if (success) {
        setIsOpen(false);
      }
    };

    const handleClear = async () => {
      const success = await handleGradeCommit(studentId, session.id, "", entry);
      if (success) {
        setIsOpen(false);
        setDraft("");
      }
    };

    const applyQuickGrade = async (value: number) => {
      setDraft(value.toString());
      const success = await handleGradeCommit(studentId, session.id, value.toString(), entry);
      if (success) {
        setIsOpen(false);
      }
    };

    return (
      <Stack spacing={1} align="center">
        <Popover isOpen={isOpen} onOpen={() => setIsOpen(true)} onClose={close} placement="left">
          <PopoverTrigger>
            <Button
              size="sm"
              variant="ghost"
              colorScheme={entry?.value != null ? "brand" : undefined}
              isLoading={isProcessing}
            >
              {entry?.value != null ? entry.value.toFixed(2) : "—"}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverCloseButton isDisabled={isProcessing} />
            <PopoverHeader fontWeight="bold">Оценка</PopoverHeader>
            <PopoverBody>
              <Stack spacing={3}>
                <NumberInput
                  value={draft}
                  onChange={(valueString) => setDraft(valueString)}
                  min={0}
                  max={5}
                  step={0.5}
                  precision={1}
                  allowMouseWheel
                >
                  <NumberInputField
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSave();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setDraft(entry?.value != null ? entry.value.toString() : "");
                        close();
                      }
                    }}
                  />
                </NumberInput>
                <HStack spacing={2} flexWrap="wrap">
                  {QUICK_GRADES.map((value) => (
                    <Button
                      key={value}
                      size="xs"
                      variant="outline"
                      onClick={() => void applyQuickGrade(value)}
                    >
                      {value.toFixed(1)}
                    </Button>
                  ))}
                </HStack>
              </Stack>
            </PopoverBody>
            <PopoverFooter display="flex" justifyContent="space-between">
              <Button size="sm" variant="ghost" onClick={handleClear} isDisabled={!entry?.gradeId} isLoading={isProcessing}>
                Очистить
              </Button>
              <Button size="sm" colorScheme="brand" onClick={handleSave} isLoading={isProcessing}>
                Сохранить
              </Button>
            </PopoverFooter>
          </PopoverContent>
        </Popover>
        <Tooltip label={entry?.notes ? entry.notes : "Комментариев нет"} placement="top" hasArrow>
          <IconButton
            aria-label="Комментарий"
            icon={<ChatIcon />}
            size="xs"
            variant={entry?.notes ? "solid" : "ghost"}
            colorScheme="brand"
            isDisabled={!entry?.gradeId}
            onClick={() => entry && openNotesModal(entry)}
          />
        </Tooltip>
      </Stack>
    );
  };

  if (dashboardLoading) {
    return (
      <Center py={16}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (!dashboard) {
    return (
      <Center py={16}>
        <Text color="gray.500">Не удалось загрузить данные преподавателя</Text>
      </Center>
    );
  }

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Журнал оценок
      </Heading>
      <Stack
        direction={{ base: "column", md: "row" }}
        spacing={4}
        align="flex-start"
        mb={6}
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        bg={cardBg}
        boxShadow={cardShadow}
        transition="transform 0.2s ease, box-shadow 0.2s ease"
        _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
      >
        <FormControl isRequired>
          <FormLabel>Предмет</FormLabel>
          <Select
            placeholder="Выберите предмет"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setGroupId("");
              setGradeTable(null);
            }}
          >
            {dashboard.subjects.map((subject: any) => (
              <option key={subject.subject.id} value={subject.subject.id}>
                {subject.subject.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Группа</FormLabel>
          <Select
            placeholder="Выберите группу"
            value={groupId}
            onChange={(event) => {
              setGroupId(event.target.value);
            }}
            isDisabled={!subjectId}
          >
            {(dashboard.subjects.find((s: any) => s.subject.id === subjectId)?.groups ?? []).map((group: any) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack direction={{ base: "column", md: "row" }} spacing={4} mb={6} align="center">
        <FormControl maxW={{ base: "100%", md: "320px" }}>
          <FormLabel mb={1}>Фильтр студентов</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Например, Иванов или 00000012"
            />
          </InputGroup>
        </FormControl>
        <Button variant="ghost" onClick={() => setStudentSearch("")} isDisabled={!studentSearch}>
          Сбросить фильтр
        </Button>
      </Stack>

      {!subjectId || !groupId ? (
        <Text color="gray.500">Выберите предмет и группу, чтобы просмотреть и заполнить журнал.</Text>
      ) : tableLoading ? (
        <Skeleton height="280px" borderRadius="xl" />
      ) : !gradeTable || sessionLabels.length === 0 ? (
        <Text color="gray.500">По выбранным параметрам нет занятий.</Text>
      ) : (
        <Box borderWidth="1px" borderRadius="xl" overflow="hidden" boxShadow={cardShadow} bg={cardBg}>
          <Table size="sm" variant="simple">
            <Thead bg={headerBg}>
              <Tr>
                <Th>Студент</Th>
                {sessionLabels.map((session: SessionLabel) => {
                  const stat = sessionAverages.get(session.id);
                  const avg = stat && stat.count > 0 ? stat.sum / stat.count : undefined;
                  const badge = badgeForAverage(avg);
                  return (
                    <Th key={session.id} textAlign="center">
                      <Stack spacing={0} align="center">
                        <Text fontSize="xs" fontWeight="semibold">
                          {session.label}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {session.time}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          Средний: {badge.text}
                        </Text>
                      </Stack>
                    </Th>
                  );
                })}
                <Th textAlign="center">Средний</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredStudents.map((student: any) => {
                const stats = studentAverages.get(student.id);
                const average = stats && stats.count > 0 ? stats.sum / stats.count : undefined;
                const badge = badgeForAverage(average);
                return (
                  <Tr key={student.id} _hover={{ bg: rowHoverBg }}>
                    <Td fontWeight="medium">
                      {student.lastName} {student.firstName}
                    </Td>
                    {sessionLabels.map((session: SessionLabel) => (
                      <Td key={`${student.id}-${session.id}`} textAlign="center">
                        <GradeCell
                          studentId={student.id}
                          studentName={`${student.firstName} ${student.lastName}`}
                          session={session.raw}
                        />
                      </Td>
                    ))}
                    <Td textAlign="center">
                      <Badge colorScheme={badge.color} px={3} py={1} borderRadius="md">
                        {badge.text}
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
              <Tr bg={summaryBg}>
                <Td fontWeight="semibold">Средний по группе</Td>
                {sessionLabels.map((session: SessionLabel) => {
                  const stat = sessionAverages.get(session.id);
                  const average = stat && stat.count > 0 ? stat.sum / stat.count : undefined;
                  const badge = badgeForAverage(average);
                  return (
                    <Td key={`avg-${session.id}`} textAlign="center">
                      <Badge colorScheme={badge.color} px={3} py={1} borderRadius="md">
                        {badge.text}
                      </Badge>
                    </Td>
                  );
                })}
                <Td textAlign="center">
                  <Text fontSize="xs" color="gray.500">
                    Показано студентов: {filteredStudents.length} / {students.length}
                  </Text>
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal isOpen={noteModal.isOpen} onClose={noteModal.onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Комментарий к оценке {noteEditor?.title}</ModalHeader>
          <ModalCloseButton isDisabled={noteSaving} />
          <ModalBody>
            <Textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Добавьте комментарий для студента"
              rows={5}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={noteModal.onClose} isDisabled={noteSaving}>
              Отмена
            </Button>
            <Button colorScheme="brand" onClick={handleSaveNotes} isLoading={noteSaving}>
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TeacherGradeEditor;
