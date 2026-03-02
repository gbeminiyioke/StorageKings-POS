import { useEffect, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Heading,
} from "@chakra-ui/react";
import api from "../api";
import { killSession } from "../../../backend/src/controllers/security.controller";

export default function ActiveSessions() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data } = await api.get("/security/sessions");
    setSessions(data);
  };

  const kilSession = async (id) => {
    await api.put(`/security/sessions/${id}/kill`);
    fetchSessions();
  };

  return (
    <Box p={6}>
      <Heading mb={4}>Active Sessions</Heading>
      <Table>
        <Thead>
          <Tr>
            <Th>User ID</Th>
            <Th>Login Type</Th>
            <Th>IP</Th>
            <Th>Created</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>

        <Tbody>
          {sessions.map((s) => (
            <Tr key={s.id}>
              <Td>{s.user_id}</Td>
              <Td>{s.login_type}</Td>
              <Td>{s.ip_address}</Td>
              <Td>{new Date(s.created_at).toLocaleString()}</Td>
              <Td>
                <Button
                  size="sm"
                  colorScheme="red"
                  onClick={() => killSession(s.id)}
                >
                  Kill
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
