import {
  Flex,
  Heading,
  Spacer,
  Button,
  HStack,
  IconButton,
  useColorMode,
  useColorModeValue,
  Fade,
  Avatar,
  Tooltip,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { formatFullName } from "../utils/name";
import type { UserSummary } from "../api/client";

interface HeaderProps {
  onNavigate: (path: string) => void;
  onLogout: () => void;
  role?: string;
  isAuthenticated: boolean;
  profile?: UserSummary | null;
}

const roleLinks: Record<string, Array<{ label: string; page: string }>> = {
  admin: [{ label: "Администрирование", page: "/admin" }],
  dean: [
    { label: "Преподаватели", page: "/dean/teachers" },
    { label: "Студенты", page: "/dean/students" },
    { label: "Группы", page: "/dean/groups" },
    { label: "Предметы", page: "/dean/subjects" }
  ],
  teacher: [
    { label: "Кабинет", page: "/teacher" },
    { label: "Журнал", page: "/teacher/gradebook" }
  ],
  student: [
    { label: "Кабинет", page: "/student" },
    { label: "Мои предметы", page: "/student/subjects" }
  ]
};

const Header = ({ onNavigate, onLogout, role, isAuthenticated, profile }: HeaderProps) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue("rgba(24, 69, 158, 0.9)", "rgba(26, 32, 44, 0.9)");
  const hoverBg = useColorModeValue("rgba(30, 90, 200, 0.85)", "rgba(45, 55, 72, 0.9)");
  const roleSpecificLinks = isAuthenticated ? roleLinks[role ?? ""] ?? [] : [];
  const defaultPage = isAuthenticated ? roleSpecificLinks[0]?.page ?? "/profile" : "/login";
  const avatarName = profile
    ? formatFullName(profile.lastName, profile.firstName, profile.middleName)
    : "Профиль";
  return (
    <Fade in>
      <Flex
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        w="100%"
        zIndex="popover"
        bg={bg}
        color="white"
        px={{ base: 4, md: 6 }}
        py={{ base: 3, md: 4 }}
        align="center"
        boxShadow="sm"
        transition="box-shadow 0.3s ease"
        backdropFilter="saturate(180%) blur(14px)"
        borderBottomWidth="1px"
        borderColor="whiteAlpha.200"
      >
        <Heading size="md" cursor="pointer" onClick={() => onNavigate(isAuthenticated ? defaultPage : "/login")}>
          GradeFlow
        </Heading>
        <Spacer />
        {isAuthenticated ? (
          <HStack spacing={3}>
            {roleSpecificLinks.map((link) => (
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
            <Tooltip label="Профиль" hasArrow>
              <Avatar
                size="sm"
                name={avatarName}
                src={profile?.avatarUrl ?? undefined}
                cursor="pointer"
                border="2px solid rgba(255,255,255,0.7)"
                onClick={() => onNavigate("/profile")}
              />
            </Tooltip>
            <IconButton
              aria-label="Переключить тему"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              variant="ghost"
              color="white"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={toggleColorMode}
            />
            <Button
              variant="outline"
              color="white"
              borderColor="whiteAlpha.800"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={onLogout}
            >
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
            <Button
              variant="outline"
              color="white"
              borderColor="whiteAlpha.800"
              _hover={{ bg: hoverBg, transform: "translateY(-2px)" }}
              transition="all 0.2s ease"
              onClick={() => onNavigate("/login")}
            >
              Войти
            </Button>
          </HStack>
        )}
      </Flex>
    </Fade>
  );
};

export default Header;
