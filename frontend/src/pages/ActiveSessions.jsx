import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  Badge,
  IconButton,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import api from "../api/api";

export default function ActiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState(null);

  const toast = useToast();

  const loadSessions = async () => {
    try {
      setLoading(true);

      const res = await api.get("/auth/active-sessions");

      setSessions(res.data || []);
    } catch (err) {
      console.error(err);

      toast({
        title: "Failed to load sessions",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const terminateSession = async (sessionId) => {
    const confirmLogout = window.confirm("Terminate this session?");

    if (!confirmLogout) return;

    try {
      setTerminatingId(sessionId);

      await api.post("/auth/kick-session", {
        sessionId,
      });

      toast({
        title: "Session terminated",
        status: "success",
      });

      loadSessions();
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

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <Flex justify="center" py={20}>
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        Active Sessions
      </Heading>

      <Text mb={4}>
        View and manage devices currently logged into your account.
      </Text>

      {/* Desktop Table */}
      <Box display={{ base: "none", lg: "block" }} overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Login Type</Th>
              <Th>Email</Th>
              <Th>Branch</Th>
              <Th>IP Address</Th>
              <Th>Device</Th>
              <Th>Created</Th>
              <Th>Last Activity</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>

          <Tbody>
            {sessions.map((session) => (
              <Tr key={session.id}>
                <Td>
                  <Badge
                    colorScheme={
                      session.login_type === "staff" ? "blue" : "green"
                    }
                  >
                    {session.login_type}
                  </Badge>
                </Td>
                <Td>{session.email}</Td>
                <Td>{session.branch_id || "-"}</Td>
                <Td>{session.ip_address || "-"}</Td>
                <Td>
                  {session.device_fingerprint || session.user_agent || "-"}
                </Td>
                <Td>{formatDate(session.created_at)}</Td>
                <Td>{formatDate(session.last_activity)}</Td>
                <Td>
                  <IconButton
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    aria-label="Terminate Session"
                    isLoading={terminatingId === session.id}
                    onClick={() => terminateSession(session.id)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Mobile View */}
      <VStack
        spacing={4}
        align="stretch"
        display={{ base: "flex", lg: "none" }}
      >
        {sessions.map((session) => (
          <Box key={session.id} borderWidth="1px" borderRadius="md" p={4}>
            <VStack align="start" spacing={2}>
              <Badge
                colorScheme={session.login_type === "staff" ? "blue" : "green"}
              >
                {session.login_type}
              </Badge>

              <Text>
                <strong>Email:</strong> {session.email}
              </Text>

              <Text>
                <strong>Branch:</strong> {session.branch_id || "-"}
              </Text>

              <Text>
                <strong>IP:</strong> {session.ip_address || "-"}
              </Text>

              <Text>
                <strong>Device:</strong>{" "}
                {session.device_fingerprint || session.user_agent || "-"}
              </Text>

              <Text>
                <strong>Created:</strong> {formatDate(session.created_at)}
              </Text>

              <Text>
                <strong>Last Activity:</strong>{" "}
                {formatDate(session.last_activity)}
              </Text>

              <Button
                leftIcon={<DeleteIcon />}
                colorScheme="red"
                size="sm"
                isLoading={terminatingId === session.id}
                onClick={() => terminateSession(session.id)}
              >
                Terminate Session
              </Button>
            </VStack>
          </Box>
        ))}
      </VStack>

      {!sessions.length && (
        <Flex justify="center" py={10}>
          <Text color="gray.500">No active sessions found.</Text>
        </Flex>
      )}
    </Box>
  );
}
