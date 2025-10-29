import { Flex, Heading, Spacer, Button, HStack, IconButton, useColorMode, useColorModeValue, Fade } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

interface HeaderProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  role?: string;
  isAuthenticated: boolean;
}

const roleLinks: Record<string, Array<{ label: string; page: string }>> = {
  admin: [{ label: "Администрирование", page: "admin" }],
  dean: [
    { label: "Преподаватели", page: "dean-teachers" },
    { label: "Студенты", page: "dean-students" },
    { label: "Группы", page: "dean-groups" },
    { label: "Предметы", page: "dean-subjects" }
  ],
  teacher: [
    { label: "Кабинет", page: "teacher" },
    { label: "Журнал", page: "teacher-gradebook" }
  ],
  student: [
    { label: "Кабинет", page: "student" },
    { label: "Мои предметы", page: "student-subjects" }
  ]
};

const Header = ({ onNavigate, onLogout, role, isAuthenticated }: HeaderProps) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue("brand.700", "gray.800");
  const hoverBg = useColorModeValue("brand.600", "gray.700");
  const defaultPage = role ? roleLinks[role]?.[0]?.page ?? "student" : "login";
  return (
    <Fade in>
      <Flex as="header" bg={bg} color="white" px={6} py={4} align="center" boxShadow="sm" transition="box-shadow 0.3s ease">
        <Heading size="md" cursor="pointer" onClick={() => onNavigate(isAuthenticated ? defaultPage : "login")}>
          GradeFlow
        </Heading>
        <Spacer />
        {isAuthenticated ? (
          <HStack spacing={3}>
            {(roleLinks[role ?? ""] ?? []).map((link) => (
              <Button
                key={link.page}
                variant="ghost"
                color="white"
                _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
                onClick={() => onNavigate(link.page)}
                transition="all 0.2s ease"
              >
                {link.label}
              </Button>
            ))}
            <IconButton
              aria-label="Переключить тему"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              variant="ghost"
              color="white"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={toggleColorMode}
            />
            <Button variant="outline" color="white" borderColor="whiteAlpha.800" _hover={{ bg: hoverBg, transform: "translateY(-2px)" }} transition="all 0.2s ease" onClick={onLogout}>
              Выйти
            </Button>
          </HStack>
        ) : (
          <HStack spacing={3}>
            <IconButton
              aria-label="Переключить тему"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              variant="ghost"
              color="white"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={toggleColorMode}
            />
            <Button variant="outline" color="white" borderColor="whiteAlpha.800" _hover={{ bg: hoverBg, transform: "translateY(-2px)" }} transition="all 0.2s ease" onClick={() => onNavigate("login")}>
              Войти
            </Button>
          </HStack>
        )}
      </Flex>
    </Fade>
  );
};

export default Header;
