import { useState } from "react";
import { Box } from "@chakra-ui/react";

import Header from "./components/Header";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import DeanPanel from "./pages/DeanPanel";
import DeanSubjects from "./pages/DeanSubjects";
import DeanGroups from "./pages/DeanGroups";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherGradeEditor from "./pages/TeacherGradeEditor";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSubjects from "./pages/StudentSubjects";
import type { AuthResponse } from "./api/client";
import { setAuthToken } from "./api/client";

const App = () => {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [page, setPage] = useState<string>("login");

  const handleNavigate = (target: string) => {
    if (!auth && target !== "login") {
      setPage("login");
      return;
    }
    setPage(target);
  };

  const handleLogin = (payload: AuthResponse) => {
    setAuthToken(payload.accessToken);
    setAuth(payload);
    switch (payload.user.role) {
      case "admin":
        setPage("admin");
        break;
      case "dean":
        setPage("dean");
        break;
      case "teacher":
        setPage("teacher");
        break;
      case "student":
        setPage("student");
        break;
      default:
        setPage("dashboard");
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuth(null);
    setPage("login");
  };

  const renderPage = () => {
    if (!auth) {
      return <Login onLogin={handleLogin} />;
    }
    switch (page) {
      case "admin":
        return <AdminDashboard />;
      case "dean":
        return <DeanPanel />;
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

  return (
    <Box minH="100vh" bg="gray.50">
      <Header
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        role={auth?.user.role}
        isAuthenticated={!!auth}
      />
      {renderPage()}
    </Box>
  );
};

export default App;
