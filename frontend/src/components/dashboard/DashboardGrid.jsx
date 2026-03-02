import { SimpleGrid } from "@chakra-ui/react";

export default function DashboardGrid({ children }) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={5} mb={6}>
      {children}
    </SimpleGrid>
  );
}
