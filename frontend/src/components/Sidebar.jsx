import React, { useEffect, useState } from "react";
import {
  Box,
  VStack,
  Text,
  Flex,
  Divider,
  Icon,
  Avatar,
  Collapse,
  Badge,
  useStatStyles,
} from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

import {
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiFileText,
  FiSettings,
  FiUsers,
  FiShield,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiLayers,
  FiDatabase,
  FiCreditCard,
  FiClipboard,
  FiHardDrive,
  FiShoppingBag,
  FiShare,
  FiShare2,
  FiTruck,
  FiTrello,
} from "react-icons/fi";

/*-----------------------------------------
  MENU CONFIGURATION (SINGLE SOURCE)
-------------------------------------------*/
const menuConfig = [
  {
    section: "Dashboard",
    items: [
      {
        label: "Home",
        path: "/dashboard",
        icon: FiHome,
        permission: "dashboard",
      },
    ],
  },

  {
    section: "Sales",
    permission: "sales",
    items: [
      {
        label: "Sales",
        path: "/dashboard/sales",
        icon: FiShoppingCart,
        permission: "sales",
      },
    ],
  },

  {
    section: "Inventory",
    permission: "inventory",
    items: [
      {
        label: "Inventory",
        path: "/dashboard/products",
        icon: FiPackage,
        permission: "inventory",
      },

      {
        label: "Suppliers",
        path: "/dashboard/suppliers",
        icon: FiTrello,
        permission: "suppliers",
      },

      {
        label: "Received Items",
        path: "/dashboard/receive-items",
        icon: FiShoppingBag,
        permission: "receive_items",
      },

      {
        label: "Discharge Items",
        path: "/dashboard/discharge-items",
        icon: FiShare,
        permission: "discharge_items",
      },

      {
        label: "Storage",
        path: "/dashboard/storage",
        icon: FiHardDrive,
        permission: "storage",
      },

      {
        label: "Transfer",
        path: "/dashboard/transfer",
        icon: FiTruck,
        permission: "transfer",
      },
    ],
  },

  {
    section: "Customers",
    permission: "customers",
    items: [
      {
        label: "Customers",
        path: "/dashboard/customers",
        icon: FiUser,
        permission: "customers",
      },
    ],
  },

  {
    section: "Management",
    items: [
      {
        label: "POS Terminals",
        path: "/dashboard/pos-terminals",
        icon: FiDatabase,
        permission: "pos_terminals",
      },
      {
        label: "Branches",
        path: "/dashboard/branches",
        icon: FiShare2,
        permission: "branches",
      },
      {
        label: "Roles",
        path: "/dashboard/roles",
        icon: FiClipboard,
        permission: "roles",
      },
      {
        label: "Users",
        path: "/dashboard/users",
        icon: FiUsers,
        permission: "users",
      },
      {
        label: "Security",
        path: "/dashboard/security",
        icon: FiShield,
        permission: "security",
      },
    ],
  },

  {
    section: "Reports",
    permission: "reports_and_analytics",
    items: [
      {
        label: "Reports & Analytics",
        path: "/dashboard/reports",
        icon: FiFileText,
        permission: "reports_and_analytics",
      },
      {
        label: "Audit Logs",
        path: "/dashboard/audit_logs",
        icon: FiSettings,
        permission: "audit_logs",
      },
      {
        label: "Purchases Report",
        path: "/dashboard/purchases",
        icon: FiSettings,
      },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const permissions = user?.permissions || {};

  const [counts, setCounts] = useState({
    low_stock: 0,
    pending_receive: 0,
    pending_discharge: 0,
  });

  /*-------------------------------------------
    HELPER: CHECK PERMISSION
  ---------------------------------------------*/
  const hasPermission = (perm) => {
    if (!perm) return true;
    return permissions[perm] === true;
  };

  /*================================================
    OAD COUNTS (ONLY IF PERMITTED)
  ================================================== */
  useEffect(() => {
    let interval;

    const fetchCounts = async () => {
      try {
        const res = await api.get("/dashboard/counts");
        setCounts(res.data);
      } catch (err) {
        console.error("Failed to load counts");
      }
    };

    if (
      hasPermission("inventory") ||
      hasPermission("receive_items") ||
      hasPermission("discharge_items")
    ) {
      fetchCounts();
      interval = setInterval(fetchCounts, 30000);
    }

    console.log("Sidebar permissions:", user.permissions);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      w={collapsed ? "70px" : "260px"}
      h="100vh"
      bg="gray.100"
      transition="width 0.3s ease"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      overflow="hidden"
    >
      {/* TOP SECTION */}
      <Box overflow="auto" flex="1" p={4}>
        {/* HEADER + COLLAPSE BUTTON */}
        <Flex align="center" justify="space-between" mb={6}>
          {!collapsed && (
            <Text fontSize="md" fontWeight="bold">
              StorageKings POS
            </Text>
          )}

          <Box cursor="pointer" onClick={() => setCollapsed(!collapsed)}>
            <Icon as={collapsed ? FiChevronRight : FiChevronLeft} boxSize={5} />
          </Box>
        </Flex>

        <VStack align="stretch" spacing={4}>
          {menuConfig.map((section) => {
            const visibleItems = section.items.filter((item) =>
              hasPermission(item.permission),
            );

            if (section.permission && !hasPermission(section.permission)) {
              return null;
            }

            if (!visibleItems.length) {
              return null;
            }

            return (
              <Box key={section.section}>
                {!collapsed && (
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    textTransform="uppercase"
                    color="gray.600"
                    mb={2}
                  >
                    {section.section}
                  </Text>
                )}

                <VStack align="stretch" spacing={1}>
                  {visibleItems.map((item) => (
                    <NavLink key={item.path} to={item.path}>
                      {({ isActive }) => (
                        <Flex
                          align="center"
                          justify="space-between"
                          px={3}
                          py={2}
                          rounded="md"
                          bg={isActive ? "blue.500" : "transparent"}
                          color={isActive ? "white" : "black"}
                          _hover={{ bg: "gray.300" }}
                          transition="all 0.2s"
                        >
                          <Flex align="center" gap={3}>
                            <Icon as={item.icon} />
                            <Collapse in={!collapsed} animateOpacity>
                              <Text fontSize="sm">{item.label}</Text>
                            </Collapse>
                          </Flex>

                          {!collapsed &&
                            item.permission === "inventory" &&
                            counts.low_stock > 0 && (
                              <Badge colorScheme="red" borderRadius="full">
                                {counts.low_stock}
                              </Badge>
                            )}

                          {!collapsed &&
                            item.permission === "receive_items" &&
                            counts.pending_receive > 0 && (
                              <Badge colorScheme="orange" borderRadius="full">
                                {counts.pending_receive}
                              </Badge>
                            )}

                          {!collapsed &&
                            item.permission === "discharge_items" &&
                            counts.pending_discharge > 0 && (
                              <Badge colorScheme="purple" borderRadius="full">
                                {counts.pending_discharge}
                              </Badge>
                            )}

                          {!collapsed &&
                            item.permission === "inventory" &&
                            counts.total_stock_value > 0 && (
                              <Badge colorScheme="cyan" borderRadius="full">
                                {counts.total_stock_value}
                              </Badge>
                            )}
                        </Flex>
                      )}
                    </NavLink>
                  ))}
                </VStack>

                {!collapsed && <Divider my={3} />}
              </Box>
            );
          })}
        </VStack>
      </Box>

      {/* BOTTOM USER SECTION */}
      <Box p={4}>
        <Divider mb={4} />

        <Flex align="center" gap={3} mb={4}>
          <Avatar size="sm" name={user?.name} />
          {!collapsed && (
            <Box>
              <Text fontSize="sm" fontWeight="bold">
                {user?.name}
              </Text>

              <Text fontSize="xs" color="gray.600">
                {user?.roleName}
              </Text>
            </Box>
          )}
        </Flex>

        <Flex
          align="center"
          gap={3}
          px={3}
          py={2}
          rounded="md"
          bg="gray.300"
          cursor="pointer"
          _hover={{ bg: "gray.400" }}
          transition="all 0.2s"
          onClick={logout}
        >
          <Icon as={FiLogOut} boxSize={5} />
          {!collapsed && <Text fontSize="sm">Logout</Text>}
        </Flex>
      </Box>
    </Box>
  );
}
