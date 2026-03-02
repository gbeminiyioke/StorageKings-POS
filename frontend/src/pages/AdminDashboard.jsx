import React, { useState, useEffect } from "react";
import { Box, Text, Heading, SimpleGrid, Spinner } from "@chakra-ui/react";
import { FiShield, FiUsers, FiLock } from "react-icons/fi";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import StatCard from "../components/dashboard/StatCard";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    activeSessions: 0,
    failedLoginsToday: 0,
    lockedAccounts: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("security/stats");
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch security stats.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <Box>
      {/* PAGE TITLE */}
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Wellcome back, {user?.fullname}
      </Text>

      {/* SECURITY OVERVIEW */}
      <Box bg="white" p={6} rounded="lg" boxShadow="sm" mb={6}>
        <Heading size="md" mb={4}>
          Security Overview
        </Heading>

        {loading ? (
          <Spinner />
        ) : (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <StatCard
              title="Active Sessions"
              value={stats.activeSessions}
              icon={FiUsers}
              color="blue.500"
            />

            <StatCard
              title="Failed Logins Today"
              value={stats.failedLoginsToday}
              icon={FiShield}
              color="orange.500"
            />

            <StatCard
              title="Locked Accounts"
              value={stats.lockedAccounts}
              icon={FiLock}
              color="red.500"
            />
          </SimpleGrid>
        )}
      </Box>

      {/* FUTURE ADMIN MODULLES */}
      <Box bg="white" p={6} rounded="lg" boxShadow="sm">
        <Text fontWeight="bold" mb={2}>
          System Overview
        </Text>

        <Text fontSize="sm" color="gray.500">
          More analytics widgets coming soon...
        </Text>
      </Box>
    </Box>
  );
}
