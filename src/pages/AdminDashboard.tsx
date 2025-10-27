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
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { fetchAdminDeans, createDeanStaff } from "../api/client";

interface DeanForm {
  ins: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  [key: string]: unknown;
}

const AdminDashboard = () => {
  const [deans, setDeans] = useState<any[]>([]);
  const [form, setForm] = useState<DeanForm>({ ins: "", password: "", firstName: "", lastName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeans = async () => {
    const data = await fetchAdminDeans();
    setDeans(data);
  };

  useEffect(() => {
    loadDeans();
  }, []);

  const handleChange = (field: keyof DeanForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createDeanStaff(form);
      await loadDeans();
      setForm({ ins: "", password: "", firstName: "", lastName: "" });
    } catch (err) {
      setError("Unable to create dean");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Admin Dashboard
      </Heading>
      <Stack spacing={6} direction={{ base: "column", md: "row" }} align="flex-start">
        <Box flex={1} borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="md" mb={4}>
            Create Dean Staff
          </Heading>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <FormControl isRequired>
                <FormLabel>INS</FormLabel>
                <Input value={form.ins} onChange={handleChange("ins")} placeholder="INS-1001" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input type="password" value={form.password} onChange={handleChange("password")} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>First Name</FormLabel>
                <Input value={form.firstName} onChange={handleChange("firstName")} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Last Name</FormLabel>
                <Input value={form.lastName} onChange={handleChange("lastName")} />
              </FormControl>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input value={form.email ?? ""} onChange={handleChange("email")} />
              </FormControl>
              <Button type="submit" colorScheme="purple" isLoading={loading}>
                Create
              </Button>
              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
            </Stack>
          </form>
        </Box>
        <Box flex={2} borderWidth="1px" borderRadius="lg" p={4} overflowX="auto">
          <Heading size="md" mb={4}>
            Current Dean Staff
          </Heading>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>INS</Th>
                <Th>Email</Th>
              </Tr>
            </Thead>
            <Tbody>
              {deans.map((dean) => (
                <Tr key={dean.id}>
                  <Td>{`${dean.firstName} ${dean.lastName}`}</Td>
                  <Td>{dean.ins ?? "—"}</Td>
                  <Td>{dean.email ?? "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Stack>
    </Box>
  );
};

export default AdminDashboard;
