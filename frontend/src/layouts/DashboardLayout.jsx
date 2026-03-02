import React, { useMemo, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { motion } from "framer-motion";

const MotionBox = motion.create(Box);

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  /*================================================
    AUTO PAGE TITLE FROM ROUTE
  ==================================================*/
  const pageTitle = useMemo(() => {
    const path = location.pathname.split("/").pop();

    const routeMap = {
      dashboard: "Dashboard",
      sales: "Sales",
      refund: "Refund",
      categories: "Categories",
      products: " Products",
      purchases: "Purchases",
      payment: "Payment",
      bank: "Bank",
      eod: "End of Day",
      valuation: "Stock Valuation",
      users: "Users",
      roles: "Roles",
      branches: "Branches",
      security: "Security",
      business: "Business Settings",
    };

    return routeMap[path] || "Staff Dashboard";
  }, [location.pathname]);

  return (
    <Flex minH="100vh" overflow="hidden" bg="gray.100">
      {/* ===== SIDEBAR ===== */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* ======== MAIN AREA ======== */}
      <Flex direction="column" flex="1" overflow="hidden">
        {/* ========== TOP BAR ========= */}
        <Box
          h="56px"
          bg="white"
          dispay="flex"
          alignItems="center"
          px={6}
          borderBottom="1px solid"
          borderColor="gray.200"
          flexShrink="0"
        >
          <Text fontWeight="bold">{pageTitle}</Text>
        </Box>

        {/* ======= PAGE CONTENT (SCROLLABLE) ======== */}
        <Box flex="1" overflowY="auto" p={6} bg="gray.50">
          <MotionBox
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </MotionBox>
        </Box>
      </Flex>
    </Flex>
  );
}
