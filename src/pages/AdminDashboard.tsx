import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  useColorModeValue,
  useDisclosure,
  useToast
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, RepeatIcon, SearchIcon } from "@chakra-ui/icons";
import {
  createDeanStaff,
  deleteDeanStaff,
  fetchAdminDeans,
  fetchAdminDeletedGroups,
  fetchAdminDeletedSubjects,
  fetchAdminDeletedUsers,
  fetchAdminUsers,
  restoreAdminGroup,
  restoreAdminSubject,
  restoreAdminUser,
  restoreDeanStaff,
  deleteAdminUser,
  resetAdminUserPassword
} from "../api/client";

interface DeanForm {
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  [key: string]: unknown;
}

type ConfirmType = "deleteDean" | "deleteUser" | "restoreDean" | "restoreUser" | "restoreGroup" | "restoreSubject";
const PAGE_LIMIT = 20;

const AdminDashboard = () => {
  const [deans, setDeans] = useState<any[]>([]);
  const [form, setForm] = useState<DeanForm>({ password: "", firstName: "", lastName: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [deansLoading, setDeansLoading] = useState(false);
  const [deansMeta, setDeansMeta] = useState({ limit: PAGE_LIMIT, offset: 0, total: 0 });
  const [deansSearch, setDeansSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const toast = useToast();

  const [activeRole, setActiveRole] = useState<"teacher" | "student" | "dean">("teacher");
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [activeUsersMeta, setActiveUsersMeta] = useState({ limit: PAGE_LIMIT, offset: 0, total: 0 });
  const [activeUsersSearch, setActiveUsersSearch] = useState("");

  const [deletedRole, setDeletedRole] = useState<"teacher" | "student" | "dean">("teacher");
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [deletedUsersLoading, setDeletedUsersLoading] = useState(false);
  const [deletedUsersMeta, setDeletedUsersMeta] = useState({ limit: PAGE_LIMIT, offset: 0, total: 0 });
  const [deletedUsersSearch, setDeletedUsersSearch] = useState("");

  const [deletedGroups, setDeletedGroups] = useState<any[]>([]);
  const [deletedGroupsLoading, setDeletedGroupsLoading] = useState(false);

  const [deletedSubjects, setDeletedSubjects] = useState<any[]>([]);
  const [deletedSubjectsLoading, setDeletedSubjectsLoading] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{ type: ConfirmType; id: string; label: string } | null>(null);
  const { isOpen: isConfirmOpen, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  const {
    isOpen: isPasswordOpen,
    onOpen: openPasswordDialog,
    onClose: closePasswordDialog
  } = useDisclosure();
  const passwordCancelRef = useRef<HTMLButtonElement | null>(null);
  const [passwordUser, setPasswordUser] = useState<{ id: string; label: string } | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("sm", "sm-dark");
  const tableHoverBg = useColorModeValue("gray.50", "gray.700");

  const loadDeans = async (offset = 0, query = deansSearch) => {
    setDeansLoading(true);
    try {
      const data = await fetchAdminDeans({
        limit: PAGE_LIMIT,
        offset,
        search: query.trim() ? query.trim() : undefined
      });
      const list = data.data ?? [];
      if (offset > 0 && list.length === 0 && (data.meta?.total ?? 0) > 0) {
        await loadDeans(Math.max(0, (data.meta?.total ?? 0) - PAGE_LIMIT), query);
        return;
      }
      setDeans(list);
      if (data.meta) {
        setDeansMeta(data.meta);
      } else {
        setDeansMeta({ limit: PAGE_LIMIT, offset, total: list.length });
      }
    } finally {
      setDeansLoading(false);
    }
  };

  const loadActiveUsers = async (role: "teacher" | "student" | "dean", offset = 0, query = activeUsersSearch) => {
    setActiveUsersLoading(true);
    try {
      const data = await fetchAdminUsers(role, {
        limit: PAGE_LIMIT,
        offset,
        search: query.trim() ? query.trim() : undefined
      });
      const list = data.data ?? [];
      if (offset > 0 && list.length === 0 && (data.meta?.total ?? 0) > 0) {
        await loadActiveUsers(role, Math.max(0, (data.meta?.total ?? 0) - PAGE_LIMIT), query);
        return;
      }
      setActiveUsers(list);
      if (data.meta) {
        setActiveUsersMeta(data.meta);
      } else {
        setActiveUsersMeta({ limit: PAGE_LIMIT, offset, total: list.length });
      }
    } finally {
      setActiveUsersLoading(false);
    }
  };

  useEffect(() => {
    loadDeans();
  }, []);

  const handleChange = (field: keyof DeanForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateLoading(true);
    setError(null);
    try {
      await createDeanStaff(form);
      await loadDeans(0, deansSearch);
      setForm({ password: "", firstName: "", lastName: "" });
      toast({ title: "Сотрудник создан", status: "success", duration: 3000, isClosable: true });
    } catch (err) {
      setError("Не удалось создать сотрудника");
    } finally {
      setCreateLoading(false);
    }
  };

  const openConfirmDialog = (action: ConfirmType, id: string, label: string) => {
    setConfirmAction({ type: action, id, label });
    openConfirm();
  };

  const openPasswordChangeDialog = (user: any) => {
    setPasswordUser({ id: user.id, label: `${user.firstName} ${user.lastName}` });
    setPasswordValue("");
    openPasswordDialog();
  };

  const handleClosePasswordDialog = () => {
    setPasswordUser(null);
    setPasswordValue("");
    closePasswordDialog();
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmProcessing(true);
    try {
      switch (confirmAction.type) {
        case "deleteDean":
          await deleteDeanStaff(confirmAction.id);
          await loadDeans(0, deansSearch);
          toast({ title: "Сотрудник помечен как удалённый", status: "info", duration: 3000, isClosable: true });
          break;
        case "deleteUser":
          await deleteAdminUser(confirmAction.id);
          await Promise.all([
            loadActiveUsers(activeRole, activeUsersMeta.offset, activeUsersSearch),
            loadDeletedUsers(deletedRole, deletedUsersMeta.offset, deletedUsersSearch)
          ]);
          toast({ title: "Пользователь удалён", status: "info", duration: 3000, isClosable: true });
          break;
        case "restoreDean":
          await restoreDeanStaff(confirmAction.id);
          await Promise.all([
            loadDeans(0, deansSearch),
            loadDeletedUsers(deletedRole, deletedUsersMeta.offset, deletedUsersSearch)
          ]);
          toast({ title: "Сотрудник восстановлен", status: "success", duration: 3000, isClosable: true });
          break;
        case "restoreUser":
          await restoreAdminUser(confirmAction.id);
          await Promise.all([
            loadDeletedUsers(deletedRole, deletedUsersMeta.offset, deletedUsersSearch),
            loadActiveUsers(activeRole, activeUsersMeta.offset, activeUsersSearch)
          ]);
          toast({ title: "Пользователь восстановлен", status: "success", duration: 3000, isClosable: true });
          break;
        case "restoreGroup":
          await restoreAdminGroup(confirmAction.id);
          await loadDeletedGroups();
          toast({ title: "Группа восстановлена", status: "success", duration: 3000, isClosable: true });
          break;
        case "restoreSubject":
          await restoreAdminSubject(confirmAction.id);
          await loadDeletedSubjects();
          toast({ title: "Предмет восстановлен", status: "success", duration: 3000, isClosable: true });
          break;
        default:
          break;
      }
    } catch (err) {
      toast({ title: "Операция не выполнена", status: "error", duration: 3000, isClosable: true });
    } finally {
      setConfirmProcessing(false);
      closeConfirm();
      setConfirmAction(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordUser || !passwordValue.trim()) {
      return;
    }
    setPasswordLoading(true);
    try {
      await resetAdminUserPassword(passwordUser.id, passwordValue.trim());
      toast({ title: "Пароль обновлён", status: "success", duration: 3000, isClosable: true });
      setPasswordUser(null);
      setPasswordValue("");
      closePasswordDialog();
      await loadActiveUsers(activeRole, activeUsersMeta.offset, activeUsersSearch);
    } catch (err) {
      toast({ title: "Не удалось обновить пароль", status: "error", duration: 3000, isClosable: true });
    } finally {
      setPasswordLoading(false);
    }
  };

  const loadDeletedUsers = async (role: "teacher" | "student" | "dean", offset = 0, query = deletedUsersSearch) => {
    setDeletedUsersLoading(true);
    try {
      const data = await fetchAdminDeletedUsers(role, {
        limit: PAGE_LIMIT,
        offset,
        search: query.trim() ? query.trim() : undefined
      });
      const list = data.data ?? [];
      if (offset > 0 && list.length === 0 && (data.meta?.total ?? 0) > 0) {
        await loadDeletedUsers(role, Math.max(0, (data.meta?.total ?? 0) - PAGE_LIMIT), query);
        return;
      }
      setDeletedUsers(list);
      if (data.meta) {
        setDeletedUsersMeta(data.meta);
      } else {
        setDeletedUsersMeta({ limit: PAGE_LIMIT, offset, total: list.length });
      }
    } finally {
      setDeletedUsersLoading(false);
    }
  };

  const loadDeletedGroups = async () => {
    setDeletedGroupsLoading(true);
    try {
      const data = await fetchAdminDeletedGroups({ limit: PAGE_LIMIT });
      setDeletedGroups(data.data ?? []);
    } finally {
      setDeletedGroupsLoading(false);
    }
  };

  const loadDeletedSubjects = async () => {
    setDeletedSubjectsLoading(true);
    try {
      const data = await fetchAdminDeletedSubjects({ limit: PAGE_LIMIT });
      setDeletedSubjects(data.data ?? []);
    } finally {
      setDeletedSubjectsLoading(false);
    }
  };

  const handleDeansSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadDeans(0, deansSearch);
  };

  const handleActiveUsersSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadActiveUsers(activeRole, 0, activeUsersSearch);
  };

  const handleDeletedUsersSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadDeletedUsers(deletedRole, 0, deletedUsersSearch);
  };

  const handleDeansPageChange = async (direction: number) => {
    const nextOffset = Math.max(0, deansMeta.offset + direction * deansMeta.limit);
    if (direction > 0 && nextOffset >= deansMeta.total) {
      return;
    }
    await loadDeans(nextOffset, deansSearch);
  };

  const handleActiveUsersPageChange = async (direction: number) => {
    const nextOffset = Math.max(0, activeUsersMeta.offset + direction * activeUsersMeta.limit);
    if (direction > 0 && nextOffset >= activeUsersMeta.total) {
      return;
    }
    await loadActiveUsers(activeRole, nextOffset, activeUsersSearch);
  };

  const handleDeletedUsersPageChange = async (direction: number) => {
    const nextOffset = Math.max(0, deletedUsersMeta.offset + direction * deletedUsersMeta.limit);
    if (direction > 0 && nextOffset >= deletedUsersMeta.total) {
      return;
    }
    await loadDeletedUsers(deletedRole, nextOffset, deletedUsersSearch);
  };

  useEffect(() => {
    if (tabIndex === 0) {
      void loadDeans(0, deansSearch);
    } else if (tabIndex === 1) {
      void loadActiveUsers(activeRole, 0, activeUsersSearch);
    } else if (tabIndex === 2) {
      void loadDeletedUsers(deletedRole, 0, deletedUsersSearch);
    } else if (tabIndex === 3) {
      void loadDeletedGroups();
    } else if (tabIndex === 4) {
      void loadDeletedSubjects();
    }
  }, [tabIndex]);

  useEffect(() => {
    if (tabIndex === 2) {
      void loadDeletedUsers(deletedRole, 0, deletedUsersSearch);
    }
  }, [deletedRole, tabIndex]);

  useEffect(() => {
    if (tabIndex === 1) {
      void loadActiveUsers(activeRole, 0, activeUsersSearch);
    }
  }, [activeRole, tabIndex]);

  const activeDeansTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>ФИО</Th>
          <Th>ИНС</Th>
          <Th>Почта</Th>
          <Th textAlign="right">Действия</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deans.map((dean) => (
          <Tr key={dean.id} _hover={{ bg: tableHoverBg }}>
            <Td>{`${dean.firstName} ${dean.lastName}`}</Td>
            <Td>{dean.ins ?? "—"}</Td>
            <Td>{dean.email ?? "—"}</Td>
            <Td textAlign="right">
              <Tooltip label="Удалить" placement="top">
                <IconButton
                  aria-label="Удалить"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => openConfirmDialog("deleteDean", dean.id, `${dean.firstName} ${dean.lastName}`)}
                />
              </Tooltip>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const activeUsersTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>ФИО</Th>
          <Th>ИНС</Th>
          <Th>Почта</Th>
          <Th>Роль</Th>
          <Th textAlign="right">Действия</Th>
        </Tr>
      </Thead>
      <Tbody>
        {activeUsers.map((user) => (
          <Tr key={user.id} _hover={{ bg: tableHoverBg }}>
            <Td>{`${user.firstName} ${user.lastName}`}</Td>
            <Td>{user.ins ?? "—"}</Td>
            <Td>{user.email ?? "—"}</Td>
            <Td>
              <Badge colorScheme="brand">{user.role}</Badge>
            </Td>
            <Td textAlign="right">
              <HStack justify="flex-end" spacing={1}>
                <Tooltip label="Сбросить пароль" placement="top">
                  <IconButton
                    aria-label="Сбросить пароль"
                    icon={<EditIcon />}
                    size="sm"
                    colorScheme="blue"
                    variant="ghost"
                    onClick={() => openPasswordChangeDialog(user)}
                  />
                </Tooltip>
                <Tooltip label="Удалить пользователя" placement="top">
                  <IconButton
                    aria-label="Удалить пользователя"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => openConfirmDialog("deleteUser", user.id, `${user.firstName} ${user.lastName}`)}
                  />
                </Tooltip>
              </HStack>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const deletedUsersTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>ФИО</Th>
          <Th>ИНС</Th>
          <Th>Почта</Th>
          <Th>Роль</Th>
          <Th textAlign="right">Восстановление</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deletedUsers.map((user) => (
          <Tr key={user.id} _hover={{ bg: tableHoverBg }}>
            <Td>{`${user.firstName} ${user.lastName}`}</Td>
            <Td>{user.ins ?? "—"}</Td>
            <Td>{user.email ?? "—"}</Td>
            <Td>
              <Badge colorScheme="brand">{user.role}</Badge>
            </Td>
            <Td textAlign="right">
              <IconButton
                aria-label="Восстановить"
                icon={<RepeatIcon />}
                size="sm"
                colorScheme="brand"
                variant="ghost"
                onClick={() => openConfirmDialog("restoreUser", user.id, `${user.firstName} ${user.lastName}`)}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const deletedGroupsTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>Название</Th>
          <Th>Описание</Th>
          <Th textAlign="right">Восстановление</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deletedGroups.map((group) => (
          <Tr key={group.id} _hover={{ bg: tableHoverBg }}>
            <Td>{group.name}</Td>
            <Td>{group.description ?? "—"}</Td>
            <Td textAlign="right">
              <IconButton
                aria-label="Восстановить группу"
                icon={<RepeatIcon />}
                size="sm"
                colorScheme="brand"
                variant="ghost"
                onClick={() => openConfirmDialog("restoreGroup", group.id, group.name)}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const deletedSubjectsTable = (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>Код</Th>
          <Th>Название</Th>
          <Th textAlign="right">Восстановление</Th>
        </Tr>
      </Thead>
      <Tbody>
        {deletedSubjects.map((subject) => (
          <Tr key={subject.id} _hover={{ bg: tableHoverBg }}>
            <Td>{subject.code}</Td>
            <Td>{subject.name}</Td>
            <Td textAlign="right">
              <IconButton
                aria-label="Восстановить предмет"
                icon={<RepeatIcon />}
                size="sm"
                colorScheme="brand"
                variant="ghost"
                onClick={() => openConfirmDialog("restoreSubject", subject.id, subject.name)}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const confirmMessages: Record<ConfirmType, string> = {
    deleteDean: "Удалить сотрудника и пометить его аккаунт как неактивный?",
    deleteUser: "Удалить выбранного пользователя и пометить его аккаунт как неактивный?",
    restoreDean: "Восстановить сотрудника деканата и вернуть доступ?",
    restoreUser: "Восстановить выбранного пользователя?",
    restoreGroup: "Восстановить выбранную группу?",
    restoreSubject: "Восстановить выбранный предмет?"
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        Панель администратора
      </Heading>
      <Tabs index={tabIndex} onChange={setTabIndex} colorScheme="brand" variant="enclosed">
        <TabList>
          <Tab>Сотрудники деканата</Tab>
          <Tab>Пользователи</Tab>
          <Tab>Удалённые пользователи</Tab>
          <Tab>Удалённые группы</Tab>
          <Tab>Удалённые предметы</Tab>
        </TabList>
        <TabPanels mt={4}>
          <TabPanel>
            <Stack spacing={6} direction={{ base: "column", lg: "row" }} align="flex-start">
              <Box flex={1} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow}>
                <Heading size="md" mb={4}>
                  Создать сотрудника деканата
                </Heading>
                <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <FormControl isRequired>
                      <FormLabel>Имя</FormLabel>
                      <Input value={form.firstName} onChange={handleChange("firstName")} />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Фамилия</FormLabel>
                      <Input value={form.lastName} onChange={handleChange("lastName")} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Электронная почта</FormLabel>
                      <Input value={form.email ?? ""} onChange={handleChange("email")} />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Пароль</FormLabel>
                      <Input type="password" value={form.password} onChange={handleChange("password")} />
                    </FormControl>
                    <Button
                      type="submit"
                      colorScheme="brand"
                      isLoading={createLoading}
                      transition="transform 0.2s ease, box-shadow 0.2s ease"
                      _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
                    >
                      Создать
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
              <Box flex={2} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow} overflowX="auto">
                <HStack justify="space-between" align="center" mb={4} flexWrap="wrap">
                  <Heading size="md">Сотрудники деканата</Heading>
                  <Text fontSize="sm" color="gray.500">
                    Найдено: {deansMeta.total}
                  </Text>
                </HStack>
                <Box as="form" onSubmit={handleDeansSearchSubmit} mb={4} maxW={{ base: "100%", md: "360px" }}>
                  <FormControl>
                    <FormLabel>Поиск по ФИО или ИНС</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input value={deansSearch} onChange={(event) => setDeansSearch(event.target.value)} placeholder="Например, Иванова" />
                    </InputGroup>
                  </FormControl>
                  <HStack spacing={3} mt={3}>
                    <Button type="submit" colorScheme="brand" isLoading={deansLoading}>
                      Найти
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDeansSearch("");
                        void loadDeans(0, "");
                      }}
                      isDisabled={deansLoading && deansSearch.trim() === ""}
                    >
                      Сбросить
                    </Button>
                  </HStack>
                </Box>
                {deansLoading ? (
                  <Center py={10}>
                    <Spinner />
                  </Center>
                ) : deans.length === 0 ? (
                  <Text color="gray.500">Список пуст</Text>
                ) : (
                  activeDeansTable
                )}
                <HStack justify="space-between" mt={4} flexWrap="wrap">
                  <Text fontSize="sm" color="gray.500">
                    Показано {deans.length} из {deansMeta.total}
                  </Text>
                  <HStack spacing={3} mt={{ base: 3, md: 0 }}>
                    <Button size="sm" onClick={() => void handleDeansPageChange(-1)} isDisabled={deansMeta.offset === 0 || deansLoading}>
                      Предыдущая
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleDeansPageChange(1)}
                      isDisabled={deansMeta.offset + deansMeta.limit >= deansMeta.total || deansLoading}
                    >
                      Следующая
                    </Button>
                  </HStack>
                </HStack>
              </Box>
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack spacing={4} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow}>
              <HStack justify="space-between" align="center">
                <Heading size="md">Пользователи</Heading>
                <Select
                  value={activeRole}
                  onChange={(event) => setActiveRole(event.target.value as "teacher" | "student" | "dean")}
                  maxW="xs"
                >
                  <option value="teacher">Преподаватели</option>
                  <option value="student">Студенты</option>
                  <option value="dean">Сотрудники деканата</option>
                </Select>
              </HStack>
              <Box as="form" onSubmit={handleActiveUsersSearchSubmit} maxW={{ base: "100%", md: "360px" }}>
                <FormControl>
                  <FormLabel>Поиск по ФИО или ИНС</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon color="gray.400" />
                    </InputLeftElement>
                    <Input value={activeUsersSearch} onChange={(event) => setActiveUsersSearch(event.target.value)} placeholder="Например, 00000045" />
                  </InputGroup>
                </FormControl>
                <HStack spacing={3} mt={3}>
                  <Button type="submit" colorScheme="brand" isLoading={activeUsersLoading}>
                    Найти
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveUsersSearch("");
                      void loadActiveUsers(activeRole, 0, "");
                    }}
                    isDisabled={activeUsersLoading && activeUsersSearch.trim() === ""}
                  >
                    Сбросить
                  </Button>
                </HStack>
              </Box>
              {activeUsersLoading ? (
                <Center py={8}>
                  <Spinner />
                </Center>
              ) : activeUsers.length === 0 ? (
                <Text color="gray.500">Нет пользователей по выбранной роли</Text>
              ) : (
                activeUsersTable
              )}
              <HStack justify="space-between" mt={2} flexWrap="wrap">
                <Text fontSize="sm" color="gray.500">
                  Показано {activeUsers.length} из {activeUsersMeta.total}
                </Text>
                <HStack spacing={3} mt={{ base: 3, md: 0 }}>
                  <Button size="sm" onClick={() => void handleActiveUsersPageChange(-1)} isDisabled={activeUsersMeta.offset === 0 || activeUsersLoading}>
                    Предыдущая
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleActiveUsersPageChange(1)}
                    isDisabled={activeUsersMeta.offset + activeUsersMeta.limit >= activeUsersMeta.total || activeUsersLoading}
                  >
                    Следующая
                  </Button>
                </HStack>
              </HStack>
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack spacing={4} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow}>
              <HStack justify="space-between">
                <Heading size="md">Удалённые пользователи</Heading>
                <Select
                  value={deletedRole}
                  onChange={(event) => setDeletedRole(event.target.value as "teacher" | "student" | "dean")}
                  maxW="xs"
                >
                  <option value="teacher">Преподаватели</option>
                  <option value="student">Студенты</option>
                  <option value="dean">Сотрудники деканата</option>
                </Select>
              </HStack>
              <Box as="form" onSubmit={handleDeletedUsersSearchSubmit} maxW={{ base: "100%", md: "360px" }}>
                <FormControl>
                  <FormLabel>Поиск по ФИО или ИНС</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon color="gray.400" />
                    </InputLeftElement>
                    <Input value={deletedUsersSearch} onChange={(event) => setDeletedUsersSearch(event.target.value)} placeholder="Например, 00000031" />
                  </InputGroup>
                </FormControl>
                <HStack spacing={3} mt={3}>
                  <Button type="submit" colorScheme="brand" isLoading={deletedUsersLoading}>
                    Найти
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDeletedUsersSearch("");
                      void loadDeletedUsers(deletedRole, 0, "");
                    }}
                    isDisabled={deletedUsersLoading && deletedUsersSearch.trim() === ""}
                  >
                    Сбросить
                  </Button>
                </HStack>
              </Box>
              {deletedUsersLoading ? (
                <Center py={8}>
                  <Spinner />
                </Center>
              ) : deletedUsers.length === 0 ? (
                <Text color="gray.500">Нет удалённых пользователей</Text>
              ) : (
                deletedUsersTable
              )}
              <HStack justify="space-between" mt={2} flexWrap="wrap">
                <Text fontSize="sm" color="gray.500">
                  Показано {deletedUsers.length} из {deletedUsersMeta.total}
                </Text>
                <HStack spacing={3} mt={{ base: 3, md: 0 }}>
                  <Button size="sm" onClick={() => void handleDeletedUsersPageChange(-1)} isDisabled={deletedUsersMeta.offset === 0 || deletedUsersLoading}>
                    Предыдущая
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleDeletedUsersPageChange(1)}
                    isDisabled={deletedUsersMeta.offset + deletedUsersMeta.limit >= deletedUsersMeta.total || deletedUsersLoading}
                  >
                    Следующая
                  </Button>
                </HStack>
              </HStack>
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack spacing={4} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow}>
              <Heading size="md">Удалённые группы</Heading>
              {deletedGroupsLoading ? (
                <Center py={8}>
                  <Spinner />
                </Center>
              ) : deletedGroups.length === 0 ? (
                <Text color="gray.500">Нет удалённых групп</Text>
              ) : (
                deletedGroupsTable
              )}
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack spacing={4} borderWidth="1px" borderRadius="xl" p={6} bg={cardBg} boxShadow={cardShadow}>
              <Heading size="md">Удалённые предметы</Heading>
              {deletedSubjectsLoading ? (
                <Center py={8}>
                  <Spinner />
                </Center>
              ) : deletedSubjects.length === 0 ? (
                <Text color="gray.500">Нет удалённых предметов</Text>
              ) : (
                deletedSubjectsTable
              )}
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <AlertDialog leastDestructiveRef={cancelRef} isOpen={isConfirmOpen} onClose={() => { if (!confirmProcessing) closeConfirm(); }}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Подтверждение
            </AlertDialogHeader>
            <AlertDialogBody>
              {confirmAction ? `${confirmMessages[confirmAction.type]} (${confirmAction.label})` : ""}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={closeConfirm} isDisabled={confirmProcessing}>
                Отмена
              </Button>
              <Button colorScheme="brand" onClick={handleConfirmAction} isLoading={confirmProcessing} ml={3}>
                Подтвердить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog leastDestructiveRef={passwordCancelRef} isOpen={isPasswordOpen} onClose={handleClosePasswordDialog}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Сброс пароля
            </AlertDialogHeader>
            <AlertDialogBody>
              <Stack spacing={3}>
                <Text>
                  {passwordUser ? `Новый пароль для ${passwordUser.label}` : ""}
                </Text>
                <FormControl isRequired>
                  <FormLabel>Пароль</FormLabel>
                  <Input
                    type="password"
                    value={passwordValue}
                    minLength={8}
                    onChange={(event) => setPasswordValue(event.target.value)}
                    placeholder="Введите новый пароль"
                  />
                </FormControl>
              </Stack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={passwordCancelRef} onClick={handleClosePasswordDialog} isDisabled={passwordLoading}>
                Отмена
              </Button>
              <Button colorScheme="brand" onClick={handlePasswordReset} isLoading={passwordLoading} ml={3} isDisabled={!passwordValue.trim()}>
                Сохранить
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default AdminDashboard;
