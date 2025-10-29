import { useEffect, useState } from "react";
import { Box, useColorModeValue, Fade } from "@chakra-ui/react";

import Header from "./components/Header";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import DeanSubjects from "./pages/DeanSubjects";
import DeanGroups from "./pages/DeanGroups";
import DeanTeachers from "./pages/DeanTeachers";
import DeanStudents from "./pages/DeanStudents";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherGradeEditor from "./pages/TeacherGradeEditor";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSubjects from "./pages/StudentSubjects";
import type { AuthResponse } from "./api/client";
import { setAuthToken } from "./api/client";

const AUTH_STORAGE_KEY = "gradeflow.auth";
const PAGE_STORAGE_KEY = "gradeflow.page";

const allowedPagesByRole: Record<string, string[]> = {
  admin: ["admin"],
  dean: ["dean-teachers", "dean-students", "dean-groups", "dean-subjects"],
  teacher: ["teacher", "teacher-gradebook"],
  student: ["student", "student-subjects"],
};

const App = () => {
  const [auth, setAuth] = useState<AuthResponse | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed: AuthResponse = JSON.parse(raw);
      if (parsed?.accessToken) {
        setAuthToken(parsed.accessToken);
      }
      return parsed;
    } catch (error) {
      console.warn("Failed to parse stored auth state", error);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  });
  const [page, setPage] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "login";
    }
    return window.localStorage.getItem(PAGE_STORAGE_KEY) ?? "login";
  });

  useEffect(() => {
    if (auth) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
      setAuthToken(auth.accessToken);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthToken(null);
    }
  }, [auth]);

  useEffect(() => {
    if (auth) {
      window.localStorage.setItem(PAGE_STORAGE_KEY, page);
    } else {
      window.localStorage.removeItem(PAGE_STORAGE_KEY);
    }
  }, [auth, page]);

  useEffect(() => {
    if (!auth) {
      return;
    }
    const allowed = allowedPagesByRole[auth.user.role] ?? [];
    if (allowed.length === 0) {
      return;
    }
    if (!allowed.includes(page)) {
      const fallback = allowed[0];
      setPage(fallback);
      window.localStorage.setItem(PAGE_STORAGE_KEY, fallback);
    }
  }, [auth, page]);

  const handleNavigate = (target: string) => {
    if (!auth && target !== "login") {
      setPage("login");
      return;
    }
    if (auth) {
      const allowed = allowedPagesByRole[auth.user.role] ?? [];
      if (
        target !== "login" &&
        allowed.length > 0 &&
        !allowed.includes(target)
      ) {
        return;
      }
    }
    setPage(target);
  };

  const handleLogin = (payload: AuthResponse) => {
    setAuth(payload);
    const targetPage = (() => {
      switch (payload.user.role) {
        case "admin":
          return "admin";
        case "dean":
          return "dean-teachers";
        case "teacher":
          return "teacher";
        case "student":
          return "student";
        default:
          return "student";
      }
    })();
    const allowed = allowedPagesByRole[payload.user.role] ?? [];
    const resolvedPage =
      allowed.length === 0 || allowed.includes(targetPage)
        ? targetPage
        : allowed[0];
    setPage(resolvedPage);
    window.localStorage.setItem(PAGE_STORAGE_KEY, resolvedPage);
  };

  const handleLogout = () => {
    setAuth(null);
    setPage("login");
    window.localStorage.removeItem(PAGE_STORAGE_KEY);
  };

  const renderPage = () => {
    if (!auth) {
      return <Login onLogin={handleLogin} />;
    }
    switch (page) {
      case "admin":
        return <AdminDashboard />;
      case "dean-teachers":
        return <DeanTeachers />;
      case "dean-students":
        return <DeanStudents />;
      case "dean-groups":
        return <DeanGroups />;
      case "dean-subjects":
        return <DeanSubjects />;
      case "teacher":
        return <TeacherDashboard />;
      case "teacher-gradebook":
        return <TeacherGradeEditor />;
      case "student":
        return <StudentDashboard />;
      case "student-subjects":
        return <StudentSubjects />;
      default:
        return <StudentDashboard />;
    }
  };

  const appBg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box position="relative" minH="100vh" bg={appBg} overflow="hidden">
      <Box position="absolute" inset="0" zIndex={0} pointerEvents="none">
        <Box
          position="absolute"
          top="-20%"
          left="-10%"
          w={{ base: "120vw", md: "60vw" }}
          h={{ base: "60vh", md: "70vh" }}
          bgGradient="radial( circle at top left, rgba(59,130,246,0.45), transparent 60% )"
          filter="blur(120px)"
        />
        <Box
          position="absolute"
          bottom="-25%"
          right="-20%"
          w={{ base: "120vw", md: "70vw" }}
          h={{ base: "70vh", md: "80vh" }}
          bgGradient="radial( circle at bottom right, rgba(236,72,153,0.35), transparent 65% )"
          filter="blur(140px)"
        />
      </Box>
      <Box position="relative" zIndex={1} minH="100vh">
        <Header
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          role={auth?.user.role}
          isAuthenticated={!!auth}
        />
        <Fade key={page} in>
          <Box px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }}>
            <Box mx="auto" w="100%" maxW="1280px">
              <Box mx="auto" w={{ base: "100%", xl: "75%" }}>
                {renderPage()}
              </Box>
            </Box>
          </Box>
        </Fade>
      </Box>
    </Box>
  );
};

export default App;
