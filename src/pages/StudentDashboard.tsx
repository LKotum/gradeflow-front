import { useEffect, useState } from "react";
import { Box, Heading, Text, Stack } from "@chakra-ui/react";
import { fetchStudentDashboard } from "../api/client";

const StudentDashboard = () => {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    fetchStudentDashboard().then(setData);
  }, []);

  if (!data) {
    return (
      <Box p={6}>
        <Heading size="md">Loading...</Heading>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Student Dashboard
      </Heading>
      <Stack spacing={2} borderWidth="1px" borderRadius="lg" p={4} maxW="lg">
        <Text>
          <strong>Name:</strong> {data.profile.firstName} {data.profile.lastName}
        </Text>
        <Text>
          <strong>INS:</strong> {data.profile.ins ?? "—"}
        </Text>
        <Text>
          <strong>Email:</strong> {data.profile.email ?? "—"}
        </Text>
        <Text>
          <strong>Group:</strong> {data.group ? data.group.name : "—"}
        </Text>
        <Text>
          <strong>Average GPA:</strong> {data.averageGpa ? data.averageGpa.toFixed(2) : "—"}
        </Text>
      </Stack>
    </Box>
  );
};

export default StudentDashboard;
