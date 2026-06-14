import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { DeleteIcon, RepeatIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

export default function AdminSessionDashboard() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);

  const [sessions, setSessions] = useState([]);
  const [branches, setBranches] = useState([]);

  const [stats, setStats] = useState({
    total_active: 0,
    active_staff: 0,
    active_customers: 0,
  });

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [loginTypeFilter, setLoginTypeFilter] = useState("");

  const [terminatingId, setTerminatingId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const [sessionsRes, statsRes, branchesRes] = await Promise.all([
        api.get("/auth/admin/sessions"),
        api.get("/auth/admin/sessions/stats"),
        api.get("/branches/public/enabled"),
      ]);

      setSessions(sessionsRes.data || []);
      setStats(statsRes.data || {});
      setBranches(branchesRes.data || []);
    } catch (err) {
      console.error(err);

      toast({
        title: "Failed to load session dashboard",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const terminateSession = async (session) => {
    const confirmed = window.confirm(`Terminate session for ${session.email}?`);

    if (!confirmed) return;

    try {
      setTerminatingId(session.id);

      await api.post("/auth/admin/sessions/terminate", {
        sessionId: session.id,
      });

      toast({
        title: "Session terminated",
        status: "success",
      });

      loadData();
    } catch (err) {
      console.error(err);

      toast({
        title: err.response?.data?.message || "Failed to terminate session",
        status: "error",
      });
    } finally {
      setTerminatingId(null);
    }
  };

  const getStatus = (lastActivity) => {
    const mins = (Date.now() - new Date(lastActivity).getTime()) / 60000;

    if (mins <= 5) {
      return {
        label: "Online",
        color: "green",
      };
    }

    if (mins <= 30) {
      return {
        label: "Idle",
        color: "orange",
      };
    }

    return {
      label: "Inactive",
      color: "red",
    };
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const searchTerm = search.toLowerCase();

      const matchesSearch =
        !search ||
        s.email?.toLowerCase().includes(searchTerm) ||
        s.fullname?.toLowerCase().includes(searchTerm);

      const matchesBranch =
        !branchFilter || String(s.branch_id) === String(branchFilter);

      const matchesLoginType =
        !loginTypeFilter || s.login_type === loginTypeFilter;

      return matchesSearch && matchesBranch && matchesLoginType;
    });
  }, [sessions, search, branchFilter, loginTypeFilter]);

  if (loading) {
    return (
      <Flex justify="center" py={20}>
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Session Dashboard</Heading>

        <Button leftIcon={<RepeatIcon />} onClick={loadData}>
          Refresh
        </Button>
      </Flex>

      <SimpleGrid
        columns={{
          base: 1,
          md: 2,
          lg: 4,
        }}
        spacing={4}
        mb={6}
      >
        <Stat borderWidth="1px" borderRadius="md" p={4}>
          <StatLabel>Active Staff</StatLabel>
          <StatNumber>{stats.active_staff || 0}</StatNumber>
        </Stat>

        <Stat borderWidth="1px" borderRadius="md" p={4}>
          <StatLabel>Active Customers</StatLabel>
          <StatNumber>{stats.active_customers || 0}</StatNumber>
        </Stat>

        <Stat borderWidth="1px" borderRadius="md" p={4}>
          <StatLabel>Total Active</StatLabel>
          <StatNumber>{stats.total_active || 0}</StatNumber>
        </Stat>

        <Stat borderWidth="1px" borderRadius="md" p={4}>
          <StatLabel>Branches Online</StatLabel>
          <StatNumber>
            {
              new Set(
                sessions.filter((s) => s.branch_id).map((s) => s.branch_id),
              ).size
            }
          </StatNumber>
        </Stat>
      </SimpleGrid>

      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(4,1fr)",
        }}
        gap={4}
        mb={6}
      >
        <GridItem>
          <Input
            placeholder="Search name/email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </GridItem>

        <GridItem>
          <Select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">All Branches</option>

            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.branch_name}
              </option>
            ))}
          </Select>
        </GridItem>

        <GridItem>
          <Select
            value={loginTypeFilter}
            onChange={(e) => setLoginTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="staff">Staff</option>
            <option value="customer">Customer</option>
          </Select>
        </GridItem>
      </Grid>

      <Box
        overflowX="auto"
        display={{
          base: "none",
          lg: "block",
        }}
      >
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Type</Th>
              <Th>Branch</Th>
              <Th>IP</Th>
              <Th>Status</Th>
              <Th>Last Activity</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>

          <Tbody>
            {filteredSessions.map((session) => {
              const status = getStatus(session.last_activity);

              return (
                <Tr key={session.id}>
                  <Td>{session.fullname}</Td>

                  <Td>{session.email}</Td>

                  <Td>
                    <Badge
                      colorScheme={
                        session.login_type === "staff" ? "blue" : "green"
                      }
                    >
                      {session.login_type}
                    </Badge>
                  </Td>

                  <Td>{session.branch_name || "-"}</Td>

                  <Td>{session.ip_address}</Td>

                  <Td>
                    <Badge colorScheme={status.color}>{status.label}</Badge>
                  </Td>

                  <Td>{new Date(session.last_activity).toLocaleString()}</Td>

                  <Td>
                    <IconButton
                      icon={<DeleteIcon />}
                      colorScheme="red"
                      aria-label="Terminate"
                      isLoading={terminatingId === session.id}
                      onClick={() => terminateSession(session)}
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>

      <VStack
        spacing={4}
        align="stretch"
        display={{
          base: "flex",
          lg: "none",
        }}
      >
        {filteredSessions.map((session) => {
          const status = getStatus(session.last_activity);

          return (
            <Box key={session.id} borderWidth="1px" borderRadius="md" p={4}>
              <VStack align="start" spacing={2}>
                <Text fontWeight="bold">{session.fullname}</Text>

                <Text>{session.email}</Text>

                <Badge
                  colorScheme={
                    session.login_type === "staff" ? "blue" : "green"
                  }
                >
                  {session.login_type}
                </Badge>

                <Text>Branch: {session.branch_name || "-"}</Text>

                <Text>IP: {session.ip_address}</Text>

                <Badge colorScheme={status.color}>{status.label}</Badge>

                <Button
                  colorScheme="red"
                  size="sm"
                  isLoading={terminatingId === session.id}
                  onClick={() => terminateSession(session)}
                >
                  Terminate
                </Button>
              </VStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
