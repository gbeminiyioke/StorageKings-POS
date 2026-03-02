import { Icon } from "@chakra-ui/react";
import { Children } from "react";
import { FiHome, FiSettings, FiUsers, FiBox } from "react-icons/fi";

export const MENU_CONFIG = [
  {
    label: "Dashboard",
    icon: FiHome,
    path: "/dashboard",
    permission: null,
  },

  {
    label: "Inventory",
    icon: FiBox,
    children: [
      {
        label: "Products",
        path: "/dashboard/inventory/products",
        permission: "inventory_products",
      },
    ],
  },

  {
    label: "Settings",
    icon: FiSettings,
    children: [
      {
        label: "Branches",
        path: "/dashboard/branches",
        permission: "settings_branch_management",
      },
      {
        label: "Roles",
        path: "/dashboard/roles",
        permission: "settings_user_roles",
      },
      {
        label: "Security",
        path: "/dashboard/security",
        permission: "settings_security",
      },
    ],
  },
];
