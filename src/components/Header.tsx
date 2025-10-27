import { Flex, Heading, Spacer, Button, HStack } from "@chakra-ui/react";

interface HeaderProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  role?: string;
  isAuthenticated: boolean;
}

const roleLinks: Record<string, Array<{ label: string; page: string }>> = {
  admin: [{ label: "Admin", page: "admin" }],
  dean: [
    { label: "Overview", page: "dean" },
    { label: "Groups", page: "dean-groups" },
    { label: "Subjects", page: "dean-subjects" }
  ],
  teacher: [
    { label: "Dashboard", page: "teacher" },
    { label: "Gradebook", page: "teacher-gradebook" }
  ],
  student: [
    { label: "Dashboard", page: "student" },
    { label: "Subjects", page: "student-subjects" }
  ]
};

const Header = ({ onNavigate, onLogout, role, isAuthenticated }: HeaderProps) => {
  return (
    <Flex as="header" bg="purple.600" color="white" p={4} align="center">
      <Heading size="md">GradeFlow</Heading>
      <Spacer />
      {isAuthenticated ? (
        <HStack spacing={3}>
          {(roleLinks[role ?? ""] ?? []).map((link) => (
            <Button key={link.page} variant="ghost" color="white" onClick={() => onNavigate(link.page)}>
              {link.label}
            </Button>
          ))}
          <Button variant="outline" color="white" onClick={onLogout}>
            Logout
          </Button>
        </HStack>
      ) : (
        <Button variant="outline" color="white" onClick={() => onNavigate("login")}>
          Login
        </Button>
      )}
    </Flex>
  );
};

export default Header;
