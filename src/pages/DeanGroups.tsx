import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Heading,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Button,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  HStack,
  Center,
  Spinner,
  useColorModeValue,
  useDisclosure,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  fetchDeanGroups,
  createDeanGroup,
  fetchGroupRanking,
  deleteDeanGroup,
  fetchDeanStudents,
  detachStudentFromGroup,
} from "../api/client";
import { formatFullName } from "../utils/name";
import { DeleteIcon } from "@chakra-ui/icons";
import ResponsiveTableContainer from "../components/ResponsiveTableContainer";

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

const DeanGroups = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const toast = useToast();
  const [pendingGroup, setPendingGroup] = useState<{ id: string; name: string } | null>(null);
  const deleteDialog = useDisclosure();
  const deleteCancelRef = useRef<HTMLButtonElement | null>(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [detachContext, setDetachContext] = useState<{
    studentId: string;
    studentName: string;
    groupId: string;
    groupName: string;
  } | null>(null);
  const detachDialog = useDisclosure();
  const detachCancelRef = useRef<HTMLButtonElement | null>(null);
  const [detachProcessing, setDetachProcessing] = useState(false);

  const load = async () => {
    try {
      setIsFetching(true);
      const [groupsData, rankingData, studentsData] = await Promise.all([
        fetchDeanGroups({ limit: 100, offset: 0 }),
        fetchGroupRanking(),
        fetchDeanStudents({ limit: 1000, offset: 0 }),
      ]);
      setGroups(groupsData.data ?? []);
      setRanking(rankingData.items ?? []);
      const memberMap: Record<string, any[]> = {};
      (studentsData.data ?? []).forEach((student: any) => {
        const grp = student.group ?? student.student?.group ?? null;
        if (!grp?.id) {
          return;
        }
        const list = memberMap[grp.id] ?? [];
        memberMap[grp.id] = [...list, student];
      });
      setGroupMembers(memberMap);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await createDeanGroup({ name, description });
      await load();
      setName("");
      setDescription("");
      toast({ title: "Группа создана", status: "success", duration: 2500, isClosable: true });
    } catch (error) {
      toast({
        title: "Не удалось создать группу",
        description: extractError(error, "Попробуйте позже"),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");
  const groupList = useMemo(() => groups ?? [], [groups]);
  const rankingList = useMemo(() => ranking ?? [], [ranking]);

  return (
    <>
      <Box p={{ base: 4, md: 6 }}>
      <Heading size="lg" mb={{ base: 4, md: 6 }}>
        Учебные группы
      </Heading>
      <SimpleGrid columns={{ base: 1, xl: 12 }} spacing={6} alignItems="stretch">
        <Box
          gridColumn={{ xl: "span 3" }}
          as="form"
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          display="flex"
          flexDirection="column"
          onSubmit={handleSubmit}
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
        >
          <Heading size="md" mb={4}>
            Создать группу
          </Heading>
          <Stack spacing={3} flex="1">
            <FormControl isRequired>
              <FormLabel>Название</FormLabel>
              <Input
                name="groupName"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Описание</FormLabel>
              <Input
                name="groupDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormControl>
          </Stack>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={loading}
            alignSelf="flex-start"
            mt={4}
          >
            Сохранить
          </Button>
        </Box>
        <Box
          gridColumn={{ xl: "span 6" }}
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
        >
          <Heading size="md" mb={4}>
            Список групп
          </Heading>
          <Box flex="1" overflow="auto" overflowX="hidden" minW={0}>
            {isFetching ? (
              <Center py={8}>
                <Spinner size="lg" thickness="4px" color="brand.500" />
              </Center>
            ) : (
              <ResponsiveTableContainer>
                <Table size="sm" w="full" sx={{ tableLayout: "fixed" }}>
                <Thead>
                  <Tr>
                    <Th w="32%">Название</Th>
                    <Th w="58%">Описание</Th>
                    <Th w="10%" textAlign="right" whiteSpace="nowrap">Действия</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {groupList.map((group) => (
                    <Tr key={group.id}>
                      <Td>{group.name}</Td>
                      <Td>{group.description ?? "—"}</Td>
                      <Td textAlign="right">
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          leftIcon={<DeleteIcon />}
                          onClick={() => {
                            setPendingGroup({ id: group.id, name: group.name });
                            deleteDialog.onOpen();
                          }}
                        >
                          Удалить
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
                </Table>
              </ResponsiveTableContainer>
            )}
          </Box>
        </Box>
        <Box
          gridColumn={{ xl: "span 3" }}
          borderWidth="1px"
          borderRadius="xl"
          p={6}
          bg={cardBg}
          boxShadow={cardShadow}
          display="flex"
          flexDirection="column"
          transition="transform 0.2s ease, box-shadow 0.2s ease"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
        >
          <Heading size="md" mb={4}>
            Рейтинг групп
          </Heading>
          {isFetching ? (
            <Center py={8}>
              <Spinner size="lg" thickness="4px" color="brand.500" />
            </Center>
          ) : (
            <ResponsiveTableContainer>
              <Table size="sm">
              <Thead>
                <Tr>
                  <Th textAlign="center">Группа</Th>
                  <Th textAlign="center">Средний балл</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rankingList.map((item: any) => (
                  <Tr key={item.group.id}>
                    <Td textAlign="center">{item.group.name}</Td>
                    <Td textAlign="center">{item.average ? item.average.toFixed(2) : "."}</Td>
                  </Tr>
                ))}
              </Tbody>
              </Table>
            </ResponsiveTableContainer>
          )}
        </Box>
      </SimpleGrid>
      <Box
        mt={6}
        borderWidth="1px"
        borderRadius="xl"
        p={6}
        bg={cardBg}
        boxShadow={cardShadow}
        overflowX="auto"
      >
        <Heading size="md" mb={4}>
          Состав групп
        </Heading>
        {isFetching ? (
          <Center py={10}>
            <Spinner size="lg" thickness="4px" color="brand.500" />
          </Center>
        ) : (
          <ResponsiveTableContainer>
            <Table size="sm">
            <Thead>
              <Tr>
                <Th>Группа</Th>
                <Th>Студенты</Th>
              </Tr>
            </Thead>
            <Tbody>
              {groups.length === 0 ? (
                <Tr>
                  <Td colSpan={2}>
                    <Text color="gray.500">Группы не найдены</Text>
                  </Td>
                </Tr>
              ) : (
                groups.map((group) => (
                  <Tr key={`members-${group.id}`}>
                    <Td>{group.name}</Td>
                    <Td>
                      {(groupMembers[group.id] ?? []).length === 0 ? (
                        <Text color="gray.500">Студентов пока нет</Text>
                      ) : (
                        <Stack spacing={2}>
                          {(groupMembers[group.id] ?? []).map((student: any) => (
                            <HStack
                              key={student.id}
                              justify="space-between"
                              align="center"
                              spacing={3}
                              flexWrap="wrap"
                              rowGap={2}
                            >
                              <Text>
                                {formatFullName(
                                  student.lastName,
                                  student.firstName,
                                  student.middleName
                                )}
                              </Text>
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="outline"
                                h="auto"
                                minH={0}
                                px={3}
                                lineHeight="short"
                                whiteSpace="normal"
                                textAlign="center"
                                onClick={() => {
                                  setDetachContext({
                                    studentId: student.id,
                                    studentName: formatFullName(
                                      student.lastName,
                                      student.firstName,
                                      student.middleName
                                    ),
                                    groupId: group.id,
                                    groupName: group.name,
                                  });
                                  detachDialog.onOpen();
                                }}
                              >
                                Открепить
                              </Button>
                            </HStack>
                          ))}
                        </Stack>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Box>
    </Box>
      <AlertDialog
        isOpen={deleteDialog.isOpen && !!pendingGroup}
        leastDestructiveRef={deleteCancelRef}
        onClose={() => {
          setPendingGroup(null);
          deleteDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Удалить группу
            </AlertDialogHeader>
            <AlertDialogBody>
              {pendingGroup ? `Вы уверены, что хотите удалить группу "${pendingGroup.name}"?` : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={deleteCancelRef} onClick={deleteDialog.onClose} isDisabled={deleteProcessing}>
                Отмена
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                isLoading={deleteProcessing}
                onClick={async () => {
                  if (!pendingGroup) return;
                  setDeleteProcessing(true);
                  try {
                    await deleteDeanGroup(pendingGroup.id);
                    await load();
                    toast({ title: "Группа удалена", status: "info", duration: 2500, isClosable: true });
                  } catch (error) {
                    toast({
                      title: "Не удалось удалить группу",
                      description: extractError(error, "Попробуйте позже"),
                      status: "error",
                      duration: 3000,
                      isClosable: true,
                    });
                  } finally {
                    setDeleteProcessing(false);
                    setPendingGroup(null);
                    deleteDialog.onClose();
                  }
                }}
              >
                Удалить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={detachDialog.isOpen && !!detachContext}
        leastDestructiveRef={detachCancelRef}
        onClose={() => {
          setDetachContext(null);
          detachDialog.onClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Открепить студента
            </AlertDialogHeader>
            <AlertDialogBody>
              {detachContext
                ? `Открепить ${detachContext.studentName} от группы "${detachContext.groupName}"?`
                : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={detachCancelRef}
                onClick={detachDialog.onClose}
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
                lineHeight="short"
                whiteSpace="normal"
                textAlign="center"
                onClick={async () => {
                  if (!detachContext) return;
                  setDetachProcessing(true);
                  try {
                    await detachStudentFromGroup(detachContext.groupId, detachContext.studentId);
                    await load();
                    toast({ title: "Студент откреплён", status: "info", duration: 2500, isClosable: true });
                  } catch (error) {
                    toast({
                      title: "Не удалось открепить студента",
                      description: extractError(error, "Попробуйте позже"),
                      status: "error",
                      duration: 3000,
                      isClosable: true,
                    });
                  } finally {
                    setDetachProcessing(false);
                    setDetachContext(null);
                    detachDialog.onClose();
                  }
                }}
              >
                Открепить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default DeanGroups;
