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
  Td
} from "@chakra-ui/react";
import { fetchDeanSubjects, createDeanSubject } from "../api/client";

const DeanSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const loadSubjects = async () => {
    const data = await fetchDeanSubjects();
    setSubjects(data);
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await createDeanSubject({ code, name, description });
    await loadSubjects();
    setCode("");
    setName("");
    setDescription("");
    setLoading(false);
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Subjects
      </Heading>
      <Stack direction={{ base: "column", md: "row" }} spacing={6} align="flex-start">
        <Box flex={1} borderWidth="1px" borderRadius="lg" p={4} as="form" onSubmit={handleSubmit}>
          <Heading size="md" mb={4}>
            Create Subject
          </Heading>
          <FormControl isRequired mb={3}>
            <FormLabel>Code</FormLabel>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH101" />
          </FormControl>
          <FormControl isRequired mb={3}>
            <FormLabel>Name</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Calculus" />
          </FormControl>
          <FormControl mb={4}>
            <FormLabel>Description</FormLabel>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormControl>
          <Button type="submit" colorScheme="purple" isLoading={loading}>
            Create
          </Button>
        </Box>
        <Box flex={2} borderWidth="1px" borderRadius="lg" p={4} overflowX="auto">
          <Heading size="md" mb={4}>
            Existing Subjects
          </Heading>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Description</Th>
              </Tr>
            </Thead>
            <Tbody>
              {subjects.map((subject) => (
                <Tr key={subject.id}>
                  <Td>{subject.code}</Td>
                  <Td>{subject.name}</Td>
                  <Td>{subject.description ?? "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Stack>
    </Box>
  );
};

export default DeanSubjects;
