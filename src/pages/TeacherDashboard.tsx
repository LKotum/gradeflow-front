import { useEffect, useState } from "react";
import { Box, Heading, Stack, Text, Tag, TagLabel, SimpleGrid } from "@chakra-ui/react";
import { fetchTeacherDashboard } from "../api/client";

const TeacherDashboard = () => {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    fetchTeacherDashboard().then(setData);
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
        Teacher Dashboard
      </Heading>
      <Box borderWidth="1px" borderRadius="lg" p={4} mb={6}>
        <Heading size="md" mb={2}>
          {data.profile.firstName} {data.profile.lastName}
        </Heading>
        <Text>INS: {data.profile.ins ?? "—"}</Text>
        <Text>Email: {data.profile.email ?? "—"}</Text>
      </Box>
      <Heading size="md" mb={3}>
        Assigned Subjects
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {data.subjects.map((item: any) => (
          <Box key={item.subject.id} borderWidth="1px" borderRadius="lg" p={4}>
            <Heading size="sm" mb={2}>
              {item.subject.name}
            </Heading>
            <Stack direction="row" spacing={2} wrap="wrap">
              {item.groups.map((group: any) => (
                <Tag key={group.id} colorScheme="purple">
                  <TagLabel>{group.name}</TagLabel>
                </Tag>
              ))}
            </Stack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default TeacherDashboard;
