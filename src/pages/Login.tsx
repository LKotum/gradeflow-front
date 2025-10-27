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
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const trimmedINS = ins.trim();
      const response =
        mode === "ins"
          ? await loginByINS(trimmedINS, password)
          : await loginAdmin(trimmedINS, password);
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
          <FormControl>
            <FormLabel>INS</FormLabel>
            <Input
              value={ins}
              onChange={(event) => setIns(event.target.value)}
              placeholder="00000001"
              isRequired
            />
          </FormControl>
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
