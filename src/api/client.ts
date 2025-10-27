import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api"
});

export interface UserSummary {
  id: string;
  role: string;
  ins?: string;
  email?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserSummary;
}

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const loginByINS = async (ins: string, password: string) => {
  const { data } = await api.post<AuthResponse>("/auth/login/ins", { ins, password });
  return data;
};

export const loginAdmin = async (ins: string, password: string) => {
  const { data } = await api.post<AuthResponse>("/auth/login/admin", { ins, password });
  return data;
};

export const fetchTeacherDashboard = async () => {
  const { data } = await api.get("/teacher/dashboard");
  return data;
};

export const fetchTeacherGradeTable = async (subjectId: string, groupId: string) => {
  const { data } = await api.get(`/teacher/subjects/${subjectId}/groups/${groupId}/grades`);
  return data;
};

export const upsertGrade = async (payload: { sessionId: string; studentId: string; value: number; notes?: string }) => {
  const { data } = await api.post(`/teacher/grades`, payload);
  return data;
};

export const updateGrade = async (gradeId: string, payload: { value: number; notes?: string }) => {
  const { data } = await api.patch(`/teacher/grades/${gradeId}`, payload);
  return data;
};

export const deleteGrade = async (gradeId: string) => {
  await api.delete(`/teacher/grades/${gradeId}`);
};

export const fetchStudentDashboard = async () => {
  const { data } = await api.get("/student/dashboard");
  return data;
};

export const fetchStudentSubjects = async () => {
  const { data } = await api.get("/student/subjects");
  return data;
};

export const fetchStudentSubjectAverage = async (subjectId: string) => {
  const { data } = await api.get(`/student/subjects/${subjectId}/averages`);
  return data;
};

export const fetchDeanGroups = async () => {
  const { data } = await api.get("/dean/groups");
  return data;
};

export const fetchDeanSubjects = async () => {
  const { data } = await api.get("/dean/subjects");
  return data;
};

export const fetchDeanTeachers = async () => {
  const { data } = await api.get("/dean/teachers");
  return data;
};

export const fetchDeanStudents = async () => {
  const { data } = await api.get("/dean/students");
  return data;
};

export const createDeanGroup = async (payload: { name: string; description?: string }) => {
  const { data } = await api.post("/dean/groups", payload);
  return data;
};

export const createDeanSubject = async (payload: { code: string; name: string; description?: string }) => {
  const { data } = await api.post("/dean/subjects", payload);
  return data;
};

export const createDeanTeacher = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/dean/teachers", payload);
  return data;
};

export const createDeanStudent = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/dean/students", payload);
  return data;
};

export const assignTeacherToSubject = async (subjectId: string, payload: { teacherId: string }) => {
  await api.post(`/dean/subjects/${subjectId}/assign`, payload);
};

export const attachGroupToSubject = async (subjectId: string, payload: { groupId: string }) => {
  await api.post(`/dean/subjects/${subjectId}/groups`, payload);
};

export const assignStudentToGroup = async (groupId: string, payload: { studentId: string }) => {
  await api.post(`/dean/groups/${groupId}/students`, payload);
};

export const scheduleSession = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/dean/sessions", payload);
  return data;
};

export const fetchGroupRanking = async () => {
  const { data } = await api.get("/dean/groups/ranking");
  return data;
};

export const fetchAdminDeans = async () => {
  const { data } = await api.get("/admin/deans");
  return data;
};

export const createDeanStaff = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/admin/deans", payload);
  return data;
};

export default api;
