import { useEffect, useState } from "react";
import { Box, Heading, Stack, Text, Table, Thead, Tbody, Tr, Th, Td, Button } from "@chakra-ui/react";
import { fetchStudentSubjects, fetchStudentSubjectAverage } from "../api/client";

const StudentSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [averages, setAverages] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchStudentSubjects().then(setSubjects);
  }, []);

  const handleRefreshAverage = async (subjectId: string) => {
    const data = await fetchStudentSubjectAverage(subjectId);
    setAverages((prev) => ({ ...prev, [subjectId]: data }));
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        My Subjects
      </Heading>
      <Stack spacing={6}>
        {subjects.map((subject) => (
          <Box key={subject.subject.id} borderWidth="1px" borderRadius="lg" p={4}>
            <Heading size="md" mb={3}>
              {subject.subject.name}
            </Heading>
            <Button size="sm" mb={3} onClick={() => handleRefreshAverage(subject.subject.id)}>
              Refresh averages
            </Button>
            <Text mb={2}>
              Average: {subject.average ? subject.average.toFixed(2) : "—"}
            </Text>
            {averages[subject.subject.id] && (
              <Text mb={2} fontSize="sm">
                Subject: {averages[subject.subject.id].subjectAverage?.toFixed(2) ?? "—"}, Group: {averages[subject.subject.id].groupAverage?.toFixed(2) ?? "—"}, Overall: {averages[subject.subject.id].overallAverage?.toFixed(2) ?? "—"}
              </Text>
            )}
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Grade</Th>
                  <Th>Notes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {subject.sessions.map((session: any) => (
                  <Tr key={session.session.id}>
                    <Td>{new Date(session.session.startsAt).toLocaleString()}</Td>
                    <Td>{session.grade ? session.grade.toFixed(2) : "—"}</Td>
                    <Td>{session.notes ?? ""}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default StudentSubjects;
