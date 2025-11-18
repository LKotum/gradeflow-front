import { useMemo } from "react";
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
  VStack,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
  useBreakpointValue,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, HamburgerIcon, UnlockIcon } from "@chakra-ui/icons";
import { formatFullName } from "../utils/name";
import type { UserSummary } from "../api/client";
import { getAvatarAccentColor } from "../utils/avatarColor";
import { useAvatarImage } from "../hooks/useAvatarImage";

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
  const drawerBg = useColorModeValue("white", "gray.800");
  const drawerBorder = useColorModeValue("gray.100", "gray.700");
  const roleSpecificLinks = isAuthenticated ? roleLinks[role ?? ""] ?? [] : [];
  const defaultPage = isAuthenticated ? roleSpecificLinks[0]?.page ?? "/profile" : "/login";
  const avatarName = profile
    ? formatFullName(profile.lastName, profile.firstName, profile.middleName)
    : "Профиль";
  const avatarSrc = useAvatarImage(profile?.avatarUrl);
  const avatarBg = useMemo(
    () =>
      getAvatarAccentColor(
        profile?.id,
        profile?.ins ?? profile?.email ?? undefined
      ),
    [profile?.email, profile?.id, profile?.ins]
  );
  const hasAvatar = Boolean(avatarSrc);
  const navDisclosure = useDisclosure();
  const isDesktop = useBreakpointValue({ base: false, lg: true }) ?? false;

  const renderRoleButtons = (variant: "desktop" | "mobile") => {
    return roleSpecificLinks.map((link) => (
      <Button
        key={link.page}
        variant={variant === "desktop" ? "ghost" : "ghost"}
        color={variant === "desktop" ? "white" : undefined}
        colorScheme={variant === "mobile" ? "brand" : undefined}
        w={variant === "mobile" ? "full" : undefined}
        justifyContent={variant === "mobile" ? "flex-start" : undefined}
        _hover={{ bg: hoverBg, transform: variant === "desktop" ? "translateY(-2px)" : undefined }}
        onClick={() => {
          onNavigate(link.page);
          if (variant === "mobile") {
            navDisclosure.onClose();
          }
        }}
        transition="all 0.2s ease"
      >
        {link.label}
      </Button>
    ));
  };
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
        {isDesktop ? (
          isAuthenticated ? (
            <HStack spacing={3}>
              {renderRoleButtons("desktop")}
              <Tooltip label="Профиль" hasArrow>
                <Avatar
                  size="sm"
                  name={avatarName}
                  src={avatarSrc}
                  bg={hasAvatar ? undefined : avatarBg}
                  color={hasAvatar ? undefined : "white"}
                  cursor="pointer"
                  border={hasAvatar ? undefined : "2px solid rgba(255,255,255,0.7)"}
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
          )
        ) : (
          <HStack spacing={2}>
            {isAuthenticated && (
              <Tooltip label="Профиль" hasArrow>
                <Avatar
                  size="sm"
                  name={avatarName}
                  src={avatarSrc}
                  bg={hasAvatar ? undefined : avatarBg}
                  color={hasAvatar ? undefined : "white"}
                  cursor="pointer"
                  border={hasAvatar ? undefined : "2px solid rgba(255,255,255,0.7)"}
                  onClick={() => onNavigate("/profile")}
                />
              </Tooltip>
            )}
            <IconButton
              aria-label="Переключить тему"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              variant="ghost"
              color="white"
              _hover={{ bg: hoverBg }}
              transition="all 0.2s ease"
              onClick={toggleColorMode}
            />
            {isAuthenticated ? (
              <IconButton
                aria-label="Выйти"
                icon={<UnlockIcon />}
                variant="ghost"
                color="white"
                _hover={{ bg: hoverBg }}
                transition="all 0.2s ease"
                onClick={onLogout}
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                color="white"
                borderColor="whiteAlpha.800"
                onClick={() => onNavigate("/login")}
              >
                Войти
              </Button>
            )}
            <IconButton
              aria-label="Открыть меню"
              icon={<HamburgerIcon />}
              variant="ghost"
              color="white"
              _hover={{ bg: hoverBg }}
              onClick={navDisclosure.onOpen}
            />
          </HStack>
        )}
      </Flex>
      <Drawer
        isOpen={navDisclosure.isOpen}
        placement="right"
        onClose={navDisclosure.onClose}
        size="xs"
      >
        <DrawerOverlay />
        <DrawerContent bg={drawerBg}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor={drawerBorder}>
            Навигация
          </DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={4} mt={2}>
              {isAuthenticated ? (
                <>
                  {renderRoleButtons("mobile")}
                  <Button
                    w="full"
                    justifyContent="flex-start"
                    variant="ghost"
                    colorScheme="brand"
                    onClick={() => {
                      onNavigate("/profile");
                      navDisclosure.onClose();
                    }}
                  >
                    Профиль
                  </Button>
                  <Button
                    w="full"
                    justifyContent="flex-start"
                    colorScheme="red"
                    onClick={() => {
                      navDisclosure.onClose();
                      onLogout();
                    }}
                  >
                    Выйти
                  </Button>
                </>
              ) : (
                <Button
                  colorScheme="brand"
                  onClick={() => {
                    onNavigate("/login");
                    navDisclosure.onClose();
                  }}
                >
                  Войти
                </Button>
              )}
              <Button
                variant="outline"
                leftIcon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
                onClick={() => {
                  toggleColorMode();
                  navDisclosure.onClose();
                }}
              >
                {colorMode === "dark" ? "Светлая тема" : "Тёмная тема"}
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Fade>
  );
};

export default Header;
