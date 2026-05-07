import React, { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import {
  FiDollarSign,
  FiShoppingCart,
  FiAlertTriangle,
  FiMapPin,
  FiPackage,
  FiLogIn,
  FiLogOut,
  FiTrello,
} from "react-icons/fi";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import StatCard from "../components/dashboard/StatCard";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

export default function StaffDashboard() {
  const { user } = useAuth();
  const permissions = user?.permissions || {};
  const [stats, setStats] = useState({});

  const hasPermission = (perm) => permissions[perm] === true;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/dashboard/counts");
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStats();
  }, []);

  const toNumber = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const format = (n) =>
    toNumber(n).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
    });

  return (
    <Box>
      {/* PAGE TITLE */}
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Welcome back, {user?.fullname}
      </Text>

      {/* STATS */}
      <DashboardGrid>
        {/* TODAY'S SALES */}
        {hasPermission("sales") && (
          <StatCard
            title="Today's Sales"
            value={format(stats.todays_sales || 0)}
            icon={FiDollarSign}
            color="green.500"
          />
        )}

        <StatCard
          title="Transactions"
          value="3"
          icon={FiShoppingCart}
          color="blue.500"
        />

        {/* LOW STOCK */}
        {hasPermission("inventory") && (
          <StatCard
            title="Low Stock Items"
            value={stats.low_stock || 0}
            icon={FiAlertTriangle}
            color="orange.500"
          />
        )}

        {/* STOCK VALLUATION */}
        {hasPermission("inventory") && (
          <StatCard
            title="Stock Value"
            value={format(stats.total_stock_value || 0)}
            icon={FiTrello}
            color="orange.500"
          />
        )}

        {/* PENDING RECEIVES */}
        {hasPermission("receive_items") && (
          <StatCard
            title="Pending Receives"
            value={stats.pending_receive || 0}
            icon={FiLogIn}
            color="blue.500"
          />
        )}

        {/* PENDING DISHARGES */}
        {hasPermission("discharge_items") && (
          <StatCard
            title="Pending Discharges"
            value={stats.pending_discharge || 0}
            icon={FiLogOut}
            color="red.500"
          />
        )}

        {/* TOTA PRODUCTS (OPTIONAL FUTURE METRIC) */}
        {hasPermission("inventory") && (
          <StatCard
            title="Total Products"
            value={stats.total_products || 0}
            icon={FiPackage}
            color="purple.500"
          />
        )}

        {/* ACTIVE BRANCH */}
        <StatCard
          title="Active Branch"
          value={stats.active_branches || 0}
          icon={FiMapPin}
          color="purple.500"
        />
      </DashboardGrid>

      {/* FUTURE SECTIONS */}
      <Box bg="white" p={6} rounded="lg" boxShadow="sm">
        <Text fontWeight="bold" mb={2}>
          Sales Overview
        </Text>

        <Text fontSize="sm" color="gray.500">
          Charts and recent actvities coming next...
        </Text>
      </Box>
    </Box>
  );
}
