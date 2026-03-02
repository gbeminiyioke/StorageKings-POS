import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <Box>
      <Heading color="red.500">403</Heading>
      <Text fontSize="xl" mt={4}>
        You do not have permission to access this page
      </Text>

      <Button mt={6} onClick={() => navigate("/dashboard")}>
        Go Back to Dashboard
      </Button>
    </Box>
  );
}
