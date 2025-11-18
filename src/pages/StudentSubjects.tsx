import { useEffect, useState, useId } from "react";
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
import ResponsiveTableContainer from "../components/ResponsiveTableContainer";

const PAGE_LIMIT = 5;

const StudentSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [meta, setMeta] = useState({ limit: PAGE_LIMIT, offset: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [averages, setAverages] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const searchInputId = useId();

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

  const cardBg = useColorModeValue("white", "gray.800");
  const tableHeaderBg = useColorModeValue("gray.100", "gray.700");
  const panelBg = useColorModeValue("white", "gray.800");

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
    if (value == null) return { color: "gray", text: "." };
    if (value >= 4.5) return { color: "green", text: value.toFixed(2) };
    if (value >= 3) return { color: "yellow", text: value.toFixed(2) };
    return { color: "red", text: value.toFixed(2) };
  };

  return (
    <Box p={{ base: 4, md: 6 }}>
      <Heading size="lg" mb={{ base: 3, md: 4 }}>
        Мои предметы
      </Heading>
      <Box as="form" onSubmit={handleSearch} mb={6} maxW="lg">
        <FormControl>
          <FormLabel htmlFor={searchInputId}>Поиск по названию или коду</FormLabel>
          <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
            <Input
              id={searchInputId}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Например, математика"
            />
            <Button type="submit" colorScheme="brand" isDisabled={fetching}>
              Найти
            </Button>
          </Stack>
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
                <AccordionPanel
                  pb={6}
                  bg={panelBg}
                  transition="transform 0.2s ease, box-shadow 0.2s ease"
                >
                  <Stack
                    direction={{ base: "column", lg: "row" }}
                    spacing={3}
                    mb={4}
                    justify="space-between"
                    align={{ base: "stretch", lg: "center" }}
                  >
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
                        По предмету: {aggregate.subjectAverage != null ? aggregate.subjectAverage.toFixed(2) : "."} · По группе: {aggregate.groupAverage != null ? aggregate.groupAverage.toFixed(2) : "."} · Общий: {aggregate.overallAverage != null ? aggregate.overallAverage.toFixed(2) : "."}
                      </Text>
                    )}
                  </Stack>
                  <ResponsiveTableContainer borderWidth="1px" borderRadius="xl">
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
                                  {grade == null ? "." : grade.toFixed(0)}
                                </Badge>
                              </Td>
                              <Td>{session.notes ?? ""}</Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </ResponsiveTableContainer>
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <Stack
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        spacing={3}
        mt={8}
      >
        <Text fontSize="sm" color="gray.500">
          Показано {subjects.length} из {meta.total}
        </Text>
        <HStack spacing={2}>
          <Button size="sm" onClick={() => handlePageChange(-1)} isDisabled={meta.offset === 0 || fetching}>
            Назад
          </Button>
          <Button
            size="sm"
            onClick={() => handlePageChange(1)}
            isDisabled={meta.offset + meta.limit >= meta.total || fetching}
          >
            Вперёд
          </Button>
        </HStack>
      </Stack>

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
