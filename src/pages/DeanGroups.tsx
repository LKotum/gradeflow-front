import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue
} from "@chakra-ui/react";
import { fetchDeanGroups, createDeanGroup, fetchGroupRanking } from "../api/client";

const DeanGroups = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [groupsData, rankingData] = await Promise.all([fetchDeanGroups({ limit: 100, offset: 0 }), fetchGroupRanking()]);
    setGroups(groupsData.data ?? []);
    setRanking(rankingData.items ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await createDeanGroup({ name, description });
    await load();
    setName("");
    setDescription("");
    setLoading(false);
  };

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Учебные группы
      </Heading>
      <Stack direction={{ base: "column", md: "row" }} spacing={6} align="flex-start">
        <Box flex={1} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow} as="form" onSubmit={handleSubmit}>
          <Heading size="md" mb={4}>
            Создать группу
          </Heading>
          <FormControl isRequired mb={3}>
            <FormLabel>Название</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormControl>
          <FormControl mb={4}>
            <FormLabel>Описание</FormLabel>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormControl>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={loading}
            transition="transform 0.2s ease, box-shadow 0.2s ease"
            _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
          >
            Сохранить
          </Button>
        </Box>
        <Box flex={2} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow} overflowX="auto">
          <Heading size="md" mb={4}>
            Список групп
          </Heading>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Название</Th>
                <Th>Описание</Th>
              </Tr>
            </Thead>
            <Tbody>
              {groups.map((group) => (
                <Tr key={group.id}>
                  <Td>{group.name}</Td>
                  <Td>{group.description ?? "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
        <Box flex={1} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow} overflowX="auto">
          <Heading size="md" mb={4}>
            Рейтинг групп
          </Heading>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Группа</Th>
                <Th>Средний балл</Th>
              </Tr>
            </Thead>
            <Tbody>
              {ranking.map((item: any) => (
                <Tr key={item.group.id}>
                  <Td>{item.group.name}</Td>
                  <Td>{item.average ? item.average.toFixed(2) : "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Stack>
    </Box>
  );
};

export default DeanGroups;
