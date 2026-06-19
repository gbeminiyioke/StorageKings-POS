import { Box, Table, useBreakpointValue, VStack } from "@chakra-ui/react";

export default function ResponsiveTable({
  desktopTable,
  mobileCards,
  children,
  minWidth = "900px",
  tableSize = "sm",
}) {
  const isMobile = useBreakpointValue({
    base: true,
    md: false,
  });

  // Mode 1: Mobile card view
  if (isMobile && mobileCards) {
    return (
      <VStack spacing={3} align="stretch">
        {mobileCards}
      </VStack>
    );
  }

  // Mode 2: Generic wrapper with children
  if (children) {
    return (
      <Box overflowX="auto" maxW="100%">
        <Box minW={isMobile ? minWidth : "100%"}>{children}</Box>
      </Box>
    );
  }

  // Mode 3: Table mode
  return (
    <Box overflowX="auto" maxW="100%">
      <Box minW={isMobile ? minWidth : "100%"}>
        <Table size={tableSize}>{desktopTable}</Table>
      </Box>
    </Box>
  );
}
