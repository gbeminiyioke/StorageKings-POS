import { useEffect, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
} from "@chakra-ui/react";
import api from "../api";

export default function AdminAuthLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await api.get("/security/logs");
    setLogs(data);
  };

  return (
    <Box p={6}>
      <Heading mb={4}>Authentication Logs</Heading>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>User ID</Th>
            <Th>Login</Th>
            <Th>Email</Th>
            <Th>Action</Th>
            <Th>IP</Th>
            <Th>Date</Th>
          </Tr>
        </Thead>

        <Tbody>
          {logs.map((log) => (
            <Tr key={log.id}>
              <Td>{log.user_id}</Td>
              <Td>{log.loginType}</Td>
              <Td>{log.email}</Td>
              <Td>{log.action}</Td>
              <Td>{log.ip_address}</Td>
              <Td>{new Date(log.created_at).toLocaleString()}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
