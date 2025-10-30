import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

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
import ProfilePage from "./pages/ProfilePage";
import type { AuthResponse, UserSummary } from "./api/client";
import { setAuthToken, fetchProfile } from "./api/client";

const AUTH_STORAGE_KEY = "gradeflow.auth";
const PROFILE_ROUTE = "/profile";

const allowedRoutesByRole: Record<string, string[]> = {
  admin: ["/admin"],
  dean: ["/dean/teachers", "/dean/students", "/dean/groups", "/dean/subjects"],
  teacher: ["/teacher", "/teacher/gradebook"],
  student: ["/student", "/student/subjects"],
};

const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    style={{ width: "100%" }}
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

const renderWithShell = (content: ReactNode) => (
  <PageTransition>
    <Box px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }}>
      <Box mx="auto" w="100%" maxW="1280px">
        <Box mx="auto" w={{ base: "100%", xl: "90%" }}>{content}</Box>
      </Box>
    </Box>
  </PageTransition>
);

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
  const [profile, setProfile] = useState<UserSummary | null>(null);

  useEffect(() => {
    if (auth) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
      setAuthToken(auth.accessToken);
      setProfile(auth.user);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthToken(null);
      setProfile(null);
    }
  }, [auth]);

  useEffect(() => {
    let cancelled = false;
    if (!auth) {
      return;
    }
    fetchProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
        }
      })
      .catch(() => {
        // ignore, fallback to auth summary already stored
      });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const defaultRouteForRole = useMemo(
    () => (role?: string | null) => {
      if (!role) {
        return "/login";
      }
      const allowed = allowedRoutesByRole[role] ?? [];
      if (allowed.length === 0) {
        return PROFILE_ROUTE;
      }
      return allowed[0];
    },
    []
  );

  useEffect(() => {
    if (!auth) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }
    const allowed = new Set([PROFILE_ROUTE, ...(allowedRoutesByRole[auth.user.role] ?? [])]);

    if (
      !allowed.has(location.pathname) &&
      !(auth.user.role === "dean" && location.pathname.startsWith("/dean/")) &&
      !(auth.user.role === "teacher" && location.pathname.startsWith("/teacher")) &&
      !(auth.user.role === "student" && location.pathname.startsWith("/student")) &&
      location.pathname !== "/admin"
    ) {
      navigate(defaultRouteForRole(auth.user.role), { replace: true });
    }
  }, [auth, location.pathname, navigate, defaultRouteForRole]);

  const handleLogin = (payload: AuthResponse) => {
    setAuthToken(payload.accessToken);
    setAuth(payload);
    setProfile(payload.user);
    navigate(defaultRouteForRole(payload.user.role), { replace: true });
  };

  const handleLogout = () => {
    setAuth(null);
    setProfile(null);
    navigate("/login", { replace: true });
  };

  const ProtectedRoute = ({
    children,
    roles,
  }: {
    children: ReactNode;
    roles?: string[];
  }) => {
    if (!auth) {
      return <Navigate to="/login" replace />;
    }
    if (roles && !roles.includes(auth.user.role)) {
      return <Navigate to={defaultRouteForRole(auth.user.role)} replace />;
    }
    return <>{children}</>;
  };

  const appBg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box position="relative" minH="100vh" bg={appBg} overflow="hidden">
      <Box
        position="fixed"
        inset="0"
        zIndex={0}
        pointerEvents="none"
      >
        <Box
          position="absolute"
          top="-20%"
          left="-15%"
          w={{ base: "140vw", md: "70vw" }}
          h={{ base: "60vh", md: "70vh" }}
          bgGradient="radial( circle at top left, rgba(59,130,246,0.45), transparent 60% )"
          filter="blur(120px)"
        />
        <Box
          position="absolute"
          bottom="-25%"
          right="-25%"
          w={{ base: "140vw", md: "75vw" }}
          h={{ base: "70vh", md: "80vh" }}
          bgGradient="radial( circle at bottom right, rgba(236,72,153,0.35), transparent 65% )"
          filter="blur(140px)"
        />
      </Box>
      <Box position="relative" zIndex={1} minH="100vh">
      <Header
        onNavigate={(path) => navigate(path)}
        onLogout={handleLogout}
        role={auth?.user.role}
        isAuthenticated={!!auth}
        profile={profile}
      />
      <Box pt={{ base: 20, md: 24 }}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              auth ? (
                <Navigate to={defaultRouteForRole(auth.user.role)} replace />
              ) : (
                renderWithShell(<Login onLogin={handleLogin} />)
              )
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                {renderWithShell(
                  <ProfilePage profile={profile} onProfileUpdate={setProfile} />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                {renderWithShell(<AdminDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/teachers"
            element={
              <ProtectedRoute roles={["dean"]}>
                {renderWithShell(<DeanTeachers />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/students"
            element={
              <ProtectedRoute roles={["dean"]}>
                {renderWithShell(<DeanStudents />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/groups"
            element={
              <ProtectedRoute roles={["dean"]}>
                {renderWithShell(<DeanGroups />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/subjects"
            element={
              <ProtectedRoute roles={["dean"]}>
                {renderWithShell(<DeanSubjects />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute roles={["teacher"]}>
                {renderWithShell(<TeacherDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/gradebook"
            element={
              <ProtectedRoute roles={["teacher"]}>
                {renderWithShell(<TeacherGradeEditor />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={["student"]}>
                {renderWithShell(<StudentDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/subjects"
            element={
              <ProtectedRoute roles={["student"]}>
                {renderWithShell(<StudentSubjects />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <Navigate
                to={auth ? defaultRouteForRole(auth.user.role) : "/login"}
                replace
              />
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to={auth ? defaultRouteForRole(auth.user.role) : "/login"}
                replace
              />
            }
          />
          </Routes>
        </AnimatePresence>
      </Box>
      </Box>
    </Box>
  );
};

export default App;
