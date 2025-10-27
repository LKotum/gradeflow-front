import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  Stack,
  FormControl,
  FormLabel,
  Select,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text
} from "@chakra-ui/react";
import {
  fetchTeacherDashboard,
  fetchTeacherGradeTable,
  upsertGrade,
  updateGrade,
  deleteGrade
} from "../api/client";

const TeacherGradeEditor = () => {
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [gradeTable, setGradeTable] = useState<any | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    fetchTeacherDashboard().then(setDashboard);
  }, []);

  useEffect(() => {
    if (subjectId && groupId) {
      fetchTeacherGradeTable(subjectId, groupId).then((data) => {
        setGradeTable(data);
        if (data.sessions.length > 0) {
          setSessionId(data.sessions[0].id);
        }
        if (data.students.length > 0) {
          setStudentId(data.students[0].id);
        }
      });
    }
  }, [subjectId, groupId]);

  const students = gradeTable?.students ?? [];

  const sessionMap = useMemo(() => {
    if (!gradeTable) return new Map<string, any>();
    const map = new Map<string, any>();
    gradeTable.sessions.forEach((session: any) => {
      map.set(session.id, session);
    });
    return map;
  }, [gradeTable]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionId || !studentId) return;
    const parsedValue = parseFloat(value);
    if (Number.isNaN(parsedValue)) {
      return;
    }
    await upsertGrade({ sessionId, studentId, value: parsedValue, notes: notes || undefined });
    const data = await fetchTeacherGradeTable(subjectId, groupId);
    setGradeTable(data);
    setValue("");
    setNotes("");
  };

  if (!dashboard) {
    return (
      <Box p={6}>
        <Heading size="md">Loading...</Heading>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Gradebook
      </Heading>
      <Stack direction={{ base: "column", md: "row" }} spacing={4} align="flex-start" mb={6}>
        <FormControl isRequired>
          <FormLabel>Subject</FormLabel>
          <Select
            placeholder="Select subject"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setGroupId("");
              setGradeTable(null);
              setSessionId("");
              setStudentId("");
            }}
          >
            {dashboard.subjects.map((subject: any) => (
              <option key={subject.subject.id} value={subject.subject.id}>
                {subject.subject.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Group</FormLabel>
          <Select
            placeholder="Select group"
            value={groupId}
            onChange={(event) => {
              setGroupId(event.target.value);
              setGradeTable(null);
              setSessionId("");
              setStudentId("");
            }}
            isDisabled={!subjectId}
          >
            {(dashboard.subjects.find((s: any) => s.subject.id === subjectId)?.groups ?? []).map((group: any) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {gradeTable ? (
        <>
          <Box borderWidth="1px" borderRadius="lg" p={4} mb={6}>
            <Heading size="md" mb={3}>
              Add / Update Grade
            </Heading>
            <form onSubmit={handleSubmit}>
              <Stack direction={{ base: "column", md: "row" }} spacing={4} align="flex-end">
                <FormControl isRequired>
                  <FormLabel>Session</FormLabel>
                  <Select value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
                    {gradeTable.sessions.map((session: any) => (
                      <option key={session.id} value={session.id}>
                        {new Date(session.startsAt).toLocaleString()}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Student</FormLabel>
                  <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                    {students.map((student: any) => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Value</FormLabel>
                  <Input type="number" step="0.1" value={value} onChange={(event) => setValue(event.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
                </FormControl>
                <Button type="submit" colorScheme="purple">
                  Save
                </Button>
              </Stack>
            </form>
          </Box>

          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Session</Th>
                <Th>Student</Th>
                <Th>Grade</Th>
                <Th>Notes</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {gradeTable.grades.map((entry: any) => (
                <Tr key={`${entry.student.id}-${entry.sessionId}`}>
                  <Td>
                    {(() => {
                      const session = sessionMap.get(entry.sessionId);
                      const timestamp = entry.assessedAt ?? session?.startsAt;
                      return timestamp ? new Date(timestamp).toLocaleString() : "—";
                    })()}
                  </Td>
                  <Td>
                    {entry.student.firstName} {entry.student.lastName}
                  </Td>
                  <Td>{entry.value ?? "—"}</Td>
                  <Td>{entry.notes ?? ""}</Td>
                  <Td>
                    {entry.gradeId && (
                      <Stack direction="row" spacing={2}>
                        <Button size="xs" onClick={async () => {
                          const input = prompt("New value", entry.value ?? "0");
                          if (input === null) return;
                          const nextValue = parseFloat(input);
                          if (Number.isNaN(nextValue)) return;
                          await updateGrade(entry.gradeId, { value: nextValue, notes: entry.notes });
                          const data = await fetchTeacherGradeTable(subjectId, groupId);
                          setGradeTable(data);
                        }}>
                          Edit
                        </Button>
                        <Button size="xs" colorScheme="red" onClick={async () => {
                          await deleteGrade(entry.gradeId);
                          const data = await fetchTeacherGradeTable(subjectId, groupId);
                          setGradeTable(data);
                        }}>
                          Delete
                        </Button>
                      </Stack>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      ) : (
        <Text>Select subject and group to load gradebook.</Text>
      )}
    </Box>
  );
};

export default TeacherGradeEditor;
