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
  AlertIcon,
  useColorModeValue
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
      setError("Неверные учётные данные");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      maxW="sm"
      mx="auto"
      mt={16}
      p={8}
      borderWidth="1px"
      borderRadius="xl"
      boxShadow={useColorModeValue("lg", "dark-lg")}
      bg={useColorModeValue("white", "gray.800")}
      transition="transform 0.3s ease, box-shadow 0.3s ease"
      _hover={{ transform: "translateY(-4px)", boxShadow: useColorModeValue("xl", "dark-xl") }}
    >
      <Heading size="lg" mb={6} textAlign="center">
        Вход в систему
      </Heading>
      <ButtonGroup isAttached mb={6} w="100%">
        <Button
          flexGrow={1}
          colorScheme="brand"
          variant={mode === "ins" ? "solid" : "outline"}
          onClick={() => setMode("ins")}
          transition="transform 0.2s ease"
          _hover={{ transform: "translateY(-2px)" }}
        >
          Сотрудник/Студент
        </Button>
        <Button
          flexGrow={1}
          colorScheme="brand"
          variant={mode === "admin" ? "solid" : "outline"}
          onClick={() => setMode("admin")}
          transition="transform 0.2s ease"
          _hover={{ transform: "translateY(-2px)" }}
        >
          Администратор
        </Button>
      </ButtonGroup>
      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <FormControl>
            <FormLabel>ИНС</FormLabel>
            <Input
              value={ins}
              onChange={(event) => setIns(event.target.value)}
              placeholder="00000001"
              isRequired
            />
          </FormControl>
          <FormControl>
            <FormLabel>Пароль</FormLabel>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} isRequired />
          </FormControl>
          <Button type="submit" colorScheme="brand" isLoading={loading} transition="transform 0.2s ease" _hover={{ transform: "translateY(-2px)" }}>
            Войти
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
