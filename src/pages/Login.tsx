import { useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { loginByINS, loginAdmin, type AuthResponse } from "../api/client";

interface LoginProps {
  onLogin: (auth: AuthResponse) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [mode, setMode] = useState<"ins" | "admin">("ins");
  const [ins, setIns] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response =
        mode === "ins"
          ? await loginByINS(ins.trim(), password)
          : await loginAdmin(username.trim(), password);
      onLogin(response);
    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="sm" mx="auto" mt={16} p={8} borderWidth="1px" borderRadius="lg">
      <Heading size="lg" mb={6} textAlign="center">
        Sign in
      </Heading>
      <ButtonGroup isAttached mb={6} w="100%">
        <Button flexGrow={1} colorScheme={mode === "ins" ? "purple" : undefined} onClick={() => setMode("ins")}>
          Staff / Teacher / Student
        </Button>
        <Button flexGrow={1} colorScheme={mode === "admin" ? "purple" : undefined} onClick={() => setMode("admin")}>
          Admin
        </Button>
      </ButtonGroup>
      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          {mode === "ins" ? (
            <FormControl>
              <FormLabel>INS</FormLabel>
              <Input value={ins} onChange={(event) => setIns(event.target.value)} placeholder="INS-0001" isRequired />
            </FormControl>
          ) : (
            <FormControl>
              <FormLabel>Username</FormLabel>
              <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" isRequired />
            </FormControl>
          )}
          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} isRequired />
          </FormControl>
          <Button type="submit" colorScheme="purple" isLoading={loading}>
            Login
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
  );
};

export default Login;
