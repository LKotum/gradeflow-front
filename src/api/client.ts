import axios from "axios";

const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

export const AUTH_STORAGE_KEY = "gradeflow.auth";

let cachedAccessToken: string | null | undefined;

const readAccessTokenFromStorage = (): string | null => {
  if (typeof window === "undefined") {
    cachedAccessToken = null;
    return cachedAccessToken;
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      cachedAccessToken = null;
      return cachedAccessToken;
    }
    const parsed = JSON.parse(raw) as { accessToken?: string };
    cachedAccessToken = parsed?.accessToken ?? null;
  } catch {
    cachedAccessToken = null;
  }
  return cachedAccessToken;
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken !== undefined) {
    return cachedAccessToken;
  }
  return readAccessTokenFromStorage();
};

const setCachedAccessToken = (token: string | null | undefined) => {
  cachedAccessToken = token ?? null;
};

const apiBaseURL = (() => {
  try {
    return new URL(
      RAW_API_BASE_URL,
      typeof window !== "undefined" ? window.location.origin : undefined
    ).toString();
  } catch {
    return RAW_API_BASE_URL;
  }
})();

const api = axios.create({
  baseURL: apiBaseURL,
});

const apiUrlObject = (() => {
  try {
    return new URL(
      apiBaseURL,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
  } catch {
    return new URL("http://localhost:8080/api");
  }
})();

const apiOrigin = apiUrlObject.origin;

export const resolveAssetUrl = (path?: string | null) => {
  if (!path) {
    return undefined;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${apiOrigin}${path}`;
  }
  return `${apiOrigin}/${path.replace(/^\/+/, "")}`;
};

export interface UserSummary {
  id: string;
  role: string;
  ins?: string;
  email?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  avatarUrl?: string;
  teacherTitle?: string;
  teacherBio?: string;
  staffPosition?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserSummary;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    limit: number;
    offset: number;
    total: number;
  };
}

export const setAuthToken = (token: string | null) => {
  setCachedAccessToken(token);
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.request.use((config) => {
  const token = getCachedAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    const headers = config.headers as Record<string, string>;
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRedirectingToLogin = false;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
      setCachedAccessToken(null);
      const loginUrl = "/login";
      if (window.location.pathname !== loginUrl) {
        window.location.href = loginUrl;
      } else {
        isRedirectingToLogin = false;
      }
    }
    return Promise.reject(err);
  }
);

export const loginByINS = async (ins: string, password: string) => {
  const { data } = await api.post<AuthResponse>("/auth/login/ins", {
    ins,
    password,
  });
  return data;
};

export const fetchProfile = async () => {
  const { data } = await api.get<UserSummary>("/profile");
  return data;
};

export const uploadProfileAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await api.put<UserSummary>("/profile/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteProfileAvatar = async () => {
  const { data } = await api.delete<UserSummary>("/profile/avatar");
  return data;
};

const createAvatarFormData = (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return formData;
};

export const uploadAdminUserAvatar = async (userId: string, file: File) => {
  const formData = createAvatarFormData(file);
  const { data } = await api.put<UserSummary>(
    `/admin/users/${userId}/avatar`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteAdminUserAvatar = async (userId: string) => {
  const { data } = await api.delete<UserSummary>(
    `/admin/users/${userId}/avatar`
  );
  return data;
};

export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}) => {
  await api.patch("/auth/password", payload);
};

export const resolveAvatarUrl = (path?: string | null) =>
  resolveAssetUrl(path);

export const fetchTeacherDashboard = async () => {
  const { data } = await api.get("/teacher/dashboard");
  return data;
};

export const fetchTeacherGradeTable = async (
  subjectId: string,
  groupId: string,
  params?: { limit?: number; offset?: number; search?: string }
) => {
  const { data } = await api.get(
    `/teacher/subjects/${subjectId}/groups/${groupId}/grades`,
    { params }
  );
  return data;
};

export const upsertGrade = async (payload: {
  sessionId: string;
  studentId: string;
  value: number;
  notes?: string;
}) => {
  const { data } = await api.post(`/teacher/grades`, payload);
  return data;
};

export const updateGrade = async (
  gradeId: string,
  payload: { value: number; notes?: string }
) => {
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

export const fetchStudentSubjects = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/student/subjects", {
    params,
  });
  return data;
};

export const fetchStudentSubjectAverage = async (subjectId: string) => {
  const { data } = await api.get(`/student/subjects/${subjectId}/averages`);
  return data;
};

export const fetchDeanGroups = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/dean/groups", {
    params,
  });
  return data;
};

export const fetchDeanSubjects = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/dean/subjects", {
    params,
  });
  return data;
};

export const fetchDeanTeachers = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/dean/teachers", {
    params,
  });
  return data;
};

export const fetchDeanStudents = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/dean/students", {
    params,
  });
  return data;
};

export const createDeanGroup = async (payload: {
  name: string;
  description?: string;
}) => {
  const { data } = await api.post("/dean/groups", payload);
  return data;
};

export const deleteDeanGroup = async (groupId: string) => {
  await api.delete(`/dean/groups/${groupId}`);
};

export const createDeanSubject = async (payload: {
  code: string;
  name: string;
  description?: string;
}) => {
  const { data } = await api.post("/dean/subjects", payload);
  return data;
};

export const deleteDeanSubject = async (subjectId: string) => {
  await api.delete(`/dean/subjects/${subjectId}`);
};

export const createDeanTeacher = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/dean/teachers", payload);
  return data;
};

export const updateDeanTeacher = async (
  teacherId: string,
  payload: Record<string, unknown>
) => {
  const { data } = await api.patch(`/dean/teachers/${teacherId}`, payload);
  return data;
};

export const createDeanStudent = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/dean/students", payload);
  return data;
};

export const updateDeanStudent = async (
  studentId: string,
  payload: Record<string, unknown>
) => {
  const { data } = await api.patch(`/dean/students/${studentId}`, payload);
  return data;
};

export const assignTeacherToSubject = async (
  subjectId: string,
  payload: { teacherId: string }
) => {
  await api.post(`/dean/subjects/${subjectId}/assign`, payload);
};

export const fetchSubjectTeachers = async (subjectId: string) => {
  if (!subjectId) {
    return [];
  }
  const { data } = await api.get(`/dean/subjects/${subjectId}/teachers`);
  return data;
};

export const attachGroupToSubject = async (
  subjectId: string,
  payload: { groupId: string }
) => {
  await api.post(`/dean/subjects/${subjectId}/groups`, payload);
};

export const assignStudentToGroup = async (
  groupId: string,
  payload: { studentIds: string[] }
) => {
  await api.post(`/dean/groups/${groupId}/students`, payload);
};

export const uploadDeanStudentAvatar = async (
  studentId: string,
  file: File
) => {
  const formData = createAvatarFormData(file);
  const { data } = await api.put<UserSummary>(
    `/dean/students/${studentId}/avatar`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteDeanStudentAvatar = async (studentId: string) => {
  const { data } = await api.delete<UserSummary>(
    `/dean/students/${studentId}/avatar`
  );
  return data;
};

export const uploadDeanTeacherAvatar = async (
  teacherId: string,
  file: File
) => {
  const formData = createAvatarFormData(file);
  const { data } = await api.put<UserSummary>(
    `/dean/teachers/${teacherId}/avatar`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteDeanTeacherAvatar = async (teacherId: string) => {
  const { data } = await api.delete<UserSummary>(
    `/dean/teachers/${teacherId}/avatar`
  );
  return data;
};

export const fetchDeanStudentSubjects = async (
  studentId: string,
  params?: { limit?: number; offset?: number; search?: string }
) => {
  const { data } = await api.get<PaginatedResponse<any>>(
    `/dean/students/${studentId}/subjects`,
    { params }
  );
  return data;
};

export const updateDeanGrade = async (
  gradeId: string,
  payload: { value: number; notes?: string }
) => {
  const { data } = await api.patch(`/dean/grades/${gradeId}`, payload);
  return data;
};

export const scheduleSession = async (payload: {
  subjectId: string;
  teacherId: string;
  groupIds: string[];
  date: string;
  slot: number;
  topic?: string;
}) => {
  const { data } = await api.post("/dean/sessions", payload);
  return data;
};

export const fetchGroupRanking = async () => {
  const { data } = await api.get("/dean/groups/ranking");
  return data;
};

export const fetchAdminDeans = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>("/admin/deans", {
    params,
  });
  return data;
};

export const fetchAdminUsers = async (
  role: "student" | "teacher" | "dean",
  params?: { limit?: number; offset?: number; search?: string }
) => {
  const { data } = await api.get<PaginatedResponse<any>>("/admin/users", {
    params: { role, ...params },
  });
  return data;
};

export const createDeanStaff = async (payload: Record<string, unknown>) => {
  const { data } = await api.post("/admin/deans", payload);
  return data;
};

export const deleteDeanStaff = async (deanId: string) => {
  await api.delete(`/admin/deans/${deanId}`);
};

export const restoreDeanStaff = async (deanId: string) => {
  await api.post(`/admin/deans/${deanId}/restore`);
};

export const fetchAdminDeletedUsers = async (
  role: "student" | "teacher" | "dean",
  params?: { limit?: number; offset?: number; search?: string }
) => {
  const { data } = await api.get<PaginatedResponse<any>>(
    "/admin/users/deleted",
    {
      params: { role, ...params },
    }
  );
  return data;
};

export const restoreAdminUser = async (userId: string) => {
  await api.post(`/admin/users/${userId}/restore`);
};

export const resetAdminUserPassword = async (
  userId: string,
  password: string
) => {
  await api.patch(`/admin/users/${userId}/password`, { password });
};

export const updateAdminUser = async (
  userId: string,
  payload: Record<string, unknown>
) => {
  const { data } = await api.patch(`/admin/users/${userId}`, payload);
  return data;
};

export const deleteAdminUser = async (userId: string) => {
  await api.delete(`/admin/users/${userId}`);
};

export const fetchAdminDeletedGroups = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>(
    "/admin/groups/deleted",
    { params }
  );
  return data;
};

export const restoreAdminGroup = async (groupId: string) => {
  await api.post(`/admin/groups/${groupId}/restore`);
};

export const fetchAdminDeletedSubjects = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<any>>(
    "/admin/subjects/deleted",
    { params }
  );
  return data;
};

export const restoreAdminSubject = async (subjectId: string) => {
  await api.post(`/admin/subjects/${subjectId}/restore`);
};

export const detachStudentFromGroup = async (
  groupId: string,
  studentId: string
) => {
  await api.delete(`/dean/groups/${groupId}/students/${studentId}`);
};

export const detachTeacherFromSubject = async (
  subjectId: string,
  teacherId: string
) => {
  await api.delete(`/dean/subjects/${subjectId}/teachers/${teacherId}`);
};

type ScheduleParams = {
  subjectId?: string;
  groupId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
};

export const fetchDeanSchedule = async (params?: ScheduleParams) => {
  const { data } = await api.get("/dean/schedule", { params });
  return data;
};

export const fetchTeacherSchedule = async (
  params?: Partial<ScheduleParams>
) => {
  const { data } = await api.get("/teacher/schedule", { params });
  return data;
};

export const fetchStudentSchedule = async (
  params?: Pick<ScheduleParams, "subjectId" | "from" | "to">
) => {
  const { data } = await api.get("/student/schedule", { params });
  return data;
};

export default api;
