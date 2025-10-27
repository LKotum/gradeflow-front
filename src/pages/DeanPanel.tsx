import { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import {
  fetchDeanSubjects,
  fetchDeanGroups,
  fetchDeanTeachers,
  fetchDeanStudents,
  createDeanTeacher,
  createDeanStudent,
  assignTeacherToSubject,
  assignStudentToGroup,
  scheduleSession
} from "../api/client";

const DeanPanel = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [teacherForm, setTeacherForm] = useState({ ins: "", password: "", firstName: "", lastName: "" });
  const [studentForm, setStudentForm] = useState({ ins: "", index: "", password: "", firstName: "", lastName: "", groupId: "" });
  const [assignmentForm, setAssignmentForm] = useState({ subjectId: "", teacherId: "" });
  const [groupAssignmentForm, setGroupAssignmentForm] = useState({ groupId: "", studentId: "" });
  const [sessionForm, setSessionForm] = useState({ subjectId: "", groupId: "", teacherId: "", startsAt: "", topic: "" });

  const loadData = async () => {
    const [subjectsData, groupsData, teachersData, studentsData] = await Promise.all([
      fetchDeanSubjects(),
      fetchDeanGroups(),
      fetchDeanTeachers(),
      fetchDeanStudents()
    ]);
    setSubjects(subjectsData);
    setGroups(groupsData);
    setTeachers(teachersData);
    setStudents(studentsData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTeacherSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createDeanTeacher(teacherForm);
      await loadData();
      setTeacherForm({ ins: "", password: "", firstName: "", lastName: "" });
    } catch (err) {
      setError("Unable to create teacher");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createDeanStudent(studentForm);
      await loadData();
      setStudentForm({ ins: "", index: "", password: "", firstName: "", lastName: "", groupId: "" });
    } catch (err) {
      setError("Unable to create student");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignmentForm.subjectId) return;
    setLoading(true);
    setError(null);
    try {
      await assignTeacherToSubject(assignmentForm.subjectId, { teacherId: assignmentForm.teacherId });
    } catch (err) {
      setError("Unable to assign teacher to subject");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupAssignmentForm.groupId) return;
    setLoading(true);
    setError(null);
    try {
      await assignStudentToGroup(groupAssignmentForm.groupId, { studentId: groupAssignmentForm.studentId });
    } catch (err) {
      setError("Unable to assign student to group");
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await scheduleSession({
        subjectId: sessionForm.subjectId,
        groupId: sessionForm.groupId,
        teacherId: sessionForm.teacherId,
        startsAt: new Date(sessionForm.startsAt).toISOString(),
        topic: sessionForm.topic
      });
    } catch (err) {
      setError("Unable to schedule session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Dean Operations
      </Heading>
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} alignItems="flex-start">
        <Stack borderWidth="1px" borderRadius="lg" p={4} spacing={3} as="form" onSubmit={handleTeacherSubmit}>
          <Heading size="md">Create Teacher</Heading>
          <FormControl isRequired>
            <FormLabel>INS</FormLabel>
            <Input value={teacherForm.ins} onChange={(e) => setTeacherForm({ ...teacherForm, ins: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>First Name</FormLabel>
            <Input value={teacherForm.firstName} onChange={(e) => setTeacherForm({ ...teacherForm, firstName: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Last Name</FormLabel>
            <Input value={teacherForm.lastName} onChange={(e) => setTeacherForm({ ...teacherForm, lastName: e.target.value })} />
          </FormControl>
          <Button type="submit" colorScheme="purple" isLoading={loading}>
            Create Teacher
          </Button>
        </Stack>

        <Stack borderWidth="1px" borderRadius="lg" p={4} spacing={3} as="form" onSubmit={handleStudentSubmit}>
          <Heading size="md">Create Student</Heading>
          <FormControl isRequired>
            <FormLabel>INS</FormLabel>
            <Input value={studentForm.ins} onChange={(e) => setStudentForm({ ...studentForm, ins: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Index</FormLabel>
            <Input value={studentForm.index} onChange={(e) => setStudentForm({ ...studentForm, index: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input type="password" value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>First Name</FormLabel>
            <Input value={studentForm.firstName} onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Last Name</FormLabel>
            <Input value={studentForm.lastName} onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })} />
          </FormControl>
          <FormControl>
            <FormLabel>Group</FormLabel>
            <Select placeholder="Select group" value={studentForm.groupId} onChange={(e) => setStudentForm({ ...studentForm, groupId: e.target.value })}>
              {groups.map((group) => (
                <option value={group.id} key={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button type="submit" colorScheme="purple" isLoading={loading}>
            Create Student
          </Button>
        </Stack>

        <Stack borderWidth="1px" borderRadius="lg" p={4} spacing={3} as="form" onSubmit={handleAssignmentSubmit}>
          <Heading size="md">Assign Teacher to Subject</Heading>
          <FormControl isRequired>
            <FormLabel>Subject</FormLabel>
            <Select placeholder="Select subject" value={assignmentForm.subjectId} onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })}>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Teacher</FormLabel>
            <Select placeholder="Select teacher" value={assignmentForm.teacherId} onChange={(e) => setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })}>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button type="submit" colorScheme="purple" isLoading={loading}>
            Assign
          </Button>
        </Stack>

        <Stack borderWidth="1px" borderRadius="lg" p={4} spacing={3} as="form" onSubmit={handleGroupAssignment}>
          <Heading size="md">Assign Student to Group</Heading>
          <FormControl isRequired>
            <FormLabel>Group</FormLabel>
            <Select placeholder="Select group" value={groupAssignmentForm.groupId} onChange={(e) => setGroupAssignmentForm({ ...groupAssignmentForm, groupId: e.target.value })}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Student</FormLabel>
            <Select placeholder="Select student" value={groupAssignmentForm.studentId} onChange={(e) => setGroupAssignmentForm({ ...groupAssignmentForm, studentId: e.target.value })}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button type="submit" colorScheme="purple" isLoading={loading}>
            Assign
          </Button>
        </Stack>

        <Stack borderWidth="1px" borderRadius="lg" p={4} spacing={3} as="form" onSubmit={handleSessionSubmit}>
          <Heading size="md">Schedule Session</Heading>
          <FormControl isRequired>
            <FormLabel>Subject</FormLabel>
            <Select placeholder="Select subject" value={sessionForm.subjectId} onChange={(e) => setSessionForm({ ...sessionForm, subjectId: e.target.value })}>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Group</FormLabel>
            <Select placeholder="Select group" value={sessionForm.groupId} onChange={(e) => setSessionForm({ ...sessionForm, groupId: e.target.value })}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Teacher</FormLabel>
            <Select placeholder="Select teacher" value={sessionForm.teacherId} onChange={(e) => setSessionForm({ ...sessionForm, teacherId: e.target.value })}>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Start Time</FormLabel>
            <Input type="datetime-local" value={sessionForm.startsAt} onChange={(e) => setSessionForm({ ...sessionForm, startsAt: e.target.value })} />
          </FormControl>
          <FormControl>
            <FormLabel>Topic</FormLabel>
            <Input value={sessionForm.topic} onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })} />
          </FormControl>
          <Button type="submit" colorScheme="purple" isLoading={loading}>
            Schedule
          </Button>
        </Stack>
      </SimpleGrid>
    </Box>
  );
};

export default DeanPanel;
