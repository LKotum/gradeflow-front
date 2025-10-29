import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  Skeleton,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue
} from "@chakra-ui/react";
import { fetchStudentSubjects, fetchStudentSubjectAverage } from "../api/client";

const PAGE_LIMIT = 5;

const StudentSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [meta, setMeta] = useState({ limit: PAGE_LIMIT, offset: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [averages, setAverages] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const loadSubjects = async (offset = 0, currentSearch = "") => {
    setFetching(true);
    try {
      const data = await fetchStudentSubjects({ limit: PAGE_LIMIT, offset, search: currentSearch || undefined });
      setSubjects(data.data ?? []);
      setMeta(data.meta ?? { limit: PAGE_LIMIT, offset, total: 0 });
    } finally {
      setFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadSubjects(0, search);
  };

  const handlePageChange = async (direction: number) => {
    const nextOffset = Math.max(0, meta.offset + direction * PAGE_LIMIT);
    if (nextOffset > meta.total) return;
    await loadSubjects(nextOffset, search);
  };

  const handleRefreshAverage = async (subjectId: string) => {
    const data = await fetchStudentSubjectAverage(subjectId);
    setAverages((prev) => ({ ...prev, [subjectId]: data }));
  };

  const badgeForAverage = (value?: number) => {
    if (value == null) return { color: "gray", text: "—" };
    if (value >= 4.5) return { color: "green", text: value.toFixed(2) };
    if (value >= 3) return { color: "yellow", text: value.toFixed(2) };
    return { color: "red", text: value.toFixed(2) };
  };

  const cardBg = useColorModeValue("white", "gray.800");
  const tableHeaderBg = useColorModeValue("gray.100", "gray.700");

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Мои предметы
      </Heading>
      <Box as="form" onSubmit={handleSearch} mb={6} maxW="lg">
        <FormControl>
          <FormLabel>Поиск по названию или коду</FormLabel>
          <HStack spacing={3}>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Например, математика" />
            <Button type="submit" colorScheme="brand" isDisabled={fetching}>
              Найти
            </Button>
          </HStack>
        </FormControl>
      </Box>

      {loading ? (
        <Stack spacing={4}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height="120px" borderRadius="xl" />
          ))}
        </Stack>
      ) : subjects.length === 0 ? (
        <Center py={12}>
          <Text color="gray.500">Предметы не найдены</Text>
        </Center>
      ) : (
        <Accordion allowMultiple borderRadius="xl" borderWidth="1px" overflow="hidden" bg={cardBg}>
          {subjects.map((subject) => {
            const aggregate = averages[subject.subject.id];
            const summaryGrade = aggregate?.subjectAverage ?? subject.average ?? null;
            const badge = badgeForAverage(summaryGrade ?? undefined);
            return (
              <AccordionItem key={subject.subject.id} border="none">
                <h2>
                  <AccordionButton _expanded={{ bg: tableHeaderBg }}>
                    <Box flex="1" textAlign="left">
                      <Heading size="sm">{subject.subject.name}</Heading>
                      <Text fontSize="xs" color="gray.500">
                        Код: {subject.subject.code}
                      </Text>
                    </Box>
                    <Badge colorScheme={badge.color} mr={4} px={3} py={1} borderRadius="md">
                      Средний: {badge.text}
                    </Badge>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={6} bg={useColorModeValue("white", "gray.800")}
                  transition="transform 0.2s ease, box-shadow 0.2s ease">
                  <HStack spacing={3} mb={4} justify="space-between">
                    <Button
                      size="sm"
                      colorScheme="brand"
                      onClick={() => handleRefreshAverage(subject.subject.id)}
                      isLoading={fetching}
                    >
                      Обновить средний балл
                    </Button>
                    {aggregate && (
                      <Text fontSize="sm" color="gray.500">
                        По предмету: {aggregate.subjectAverage?.toFixed(2) ?? "—"} · По группе: {aggregate.groupAverage?.toFixed(2) ?? "—"} · Общий: {aggregate.overallAverage?.toFixed(2) ?? "—"}
                      </Text>
                    )}
                  </HStack>
                  <Box borderWidth="1px" borderRadius="xl" overflow="hidden">
                    <Table size="sm">
                      <Thead bg={tableHeaderBg}>
                        <Tr>
                          <Th>Дата</Th>
                          <Th textAlign="center">Оценка</Th>
                          <Th>Комментарий</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {subject.sessions.map((session: any) => {
                          const grade = session.grade ?? null;
                          const tag = badgeForAverage(grade ?? undefined);
                          return (
                            <Tr key={session.session.id}>
                              <Td>{new Date(session.session.startsAt).toLocaleString()}</Td>
                              <Td textAlign="center">
                                <Badge colorScheme={grade == null ? "gray" : tag.color} px={2} py={1} borderRadius="md">
                                  {grade == null ? "—" : grade.toFixed(2)}
                                </Badge>
                              </Td>
                              <Td>{session.notes ?? ""}</Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <HStack justify="space-between" mt={8}>
        <Text fontSize="sm" color="gray.500">
          Показано {subjects.length} из {meta.total}
        </Text>
        <HStack>
          <Button size="sm" onClick={() => handlePageChange(-1)} isDisabled={meta.offset === 0 || fetching}>
            Назад
          </Button>
          <Button size="sm" onClick={() => handlePageChange(1)} isDisabled={meta.offset + meta.limit >= meta.total || fetching}>
            Вперёд
          </Button>
        </HStack>
      </HStack>

      {fetching && !loading && (
        <Center mt={4}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.500" ml={2}>
            Обновление списка...
          </Text>
        </Center>
      )}
    </Box>
  );
};

export default StudentSubjects;
