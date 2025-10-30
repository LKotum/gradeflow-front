import { Box, Heading } from "@chakra-ui/react";
import ProfileSettings from "../components/ProfileSettings";
import type { UserSummary } from "../api/client";

interface ProfilePageProps {
  profile: UserSummary | null;
  onProfileUpdate: (profile: UserSummary) => void;
}

const ProfilePage = ({ profile, onProfileUpdate }: ProfilePageProps) => {
  return (
    <Box px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }}>
      <Heading size="lg" mb={6}>
        Профиль пользователя
      </Heading>
      <ProfileSettings profile={profile} onProfileUpdate={onProfileUpdate} />
    </Box>
  );
};

export default ProfilePage;
