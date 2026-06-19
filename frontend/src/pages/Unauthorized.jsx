import { Box, Heading, Text, Button, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50" p={4}>
      <Box
        bg="white"
        p={8}
        rounded="lg"
        shadow="lg"
        textAlign="center"
        maxW="500px"
      >
        <Heading color="red.500" size="2xl">
          403
        </Heading>

        <Text fontSize="xl" mt={4}>
          You do not have permission to access this page.
        </Text>

        <Button
          mt={6}
          colorScheme="blue"
          onClick={() => navigate("/dashboard")}
        >
          Go Back to Dashboard
        </Button>
      </Box>
    </Flex>
  );
}
