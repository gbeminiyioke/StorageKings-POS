import { Box, Flex, Text, Icon } from "@chakra-ui/react";

export default function StatCard({ title, value, icon, color = "blue.500" }) {
  return (
    <Box
      bg="white"
      p={5}
      rounded="lg"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.100"
    >
      <Flex align="center" justify="space-between">
        <Box>
          <Text fontSize="sm" color="gray.500">
            {title}
          </Text>

          <Text fontSize="2xl" fontWeight="bold">
            {value}
          </Text>
        </Box>

        <Flex
          w="42px"
          h="42px"
          align="center"
          justify="center"
          rounded="full"
          bg={color}
          color="white"
        >
          <Icon as={icon} boxSize={5} />
        </Flex>
      </Flex>
    </Box>
  );
}
