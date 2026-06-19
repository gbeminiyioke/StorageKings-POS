import { Box, VStack, Text } from "@chakra-ui/react";

export default function MobileDataCard({ title, children }) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={4} shadow="sm" bg="white">
      <Text fontWeight="bold" mb={2} fontSize="md">
        {title}
      </Text>

      <VStack align="stretch" spacing={2}>
        {children}
      </VStack>
    </Box>
  );
}
