import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Spinner,
  Text,
  HStack,
  Input,
  useToast,
  Badge,
} from "@chakra-ui/react";

import { useEffect, useRef, useState } from "react";
import api from "../../api/api";

export default function StorageVisitRequestTable() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [reasons, setReasons] = useState({});
  const previousCount = useRef(0);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const loadRequests = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const res = await api.get("/inventory/storage-visit-requests");
      const rows = res.data || [];

      /* =========================
         NEW REQUEST ALERT
      ========================= */

      if (previousCount.current > 0 && rows.length > previousCount.current) {
        toast({
          title: "New storage visit request",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
      }

      previousCount.current = rows.length;

      setRequests(rows);
    } catch (err) {
      console.error(err);

      toast({
        title: "Failed to load visit requests",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    const interval = setInterval(() => {
      loadRequests(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  /* =========================
     APPROVE
  ========================= */

  const approveRequest = async (id) => {
    try {
      await api.put(`/inventory/storage-visit-requests/${id}/approve`);

      toast({
        title: "Visit approved",
        status: "success",
      });

      loadRequests();
    } catch (err) {
      console.error(err);

      toast({
        title: "Approval failed",
        description: err.response?.data?.message,
        status: "error",
      });
    }
  };

  /* =========================
     REJECT
  ========================= */

  const rejectRequest = async (id) => {
    try {
      if (!reasons[id]) {
        toast({
          title: "Reason required",
          status: "warning",
        });

        return;
      }

      await api.put(`/inventory/storage-visit-requests/${id}/reject`, {
        rejection_reason: reasons[id],
      });

      toast({
        title: "Visit rejected",
        status: "success",
      });

      setRejectingId(null);

      loadRequests();
    } catch (err) {
      console.error(err);

      toast({
        title: "Rejection failed",
        status: "error",
      });
    }
  };

  if (loading) {
    return (
      <Box py={10} textAlign="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead bg="gray.100">
          <Tr>
            <Th>Request Date</Th>
            <Th>Customer Name</Th>
            <Th>Branch</Th>
            <Th>Visit Date</Th>
            <Th>Storage No</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>

        <Tbody>
          {requests.map((r) => (
            <Tr key={r.visit_request_id}>
              <Td>{formatDate(r.created_at)}</Td>
              <Td>{r.customer_name}</Td>
              <Td>{r.branch_name}</Td>
              <Td>{formatDate(r.visit_date)}</Td>
              <Td>{r.storage_no}</Td>
              <Td>
                <Badge colorScheme="orange">{r.request_status}</Badge>
              </Td>
              <Td>
                <HStack>
                  <Button
                    size="xs"
                    colorScheme="green"
                    onClick={() => approveRequest(r.visit_request_id)}
                  >
                    Approve
                  </Button>

                  <Button
                    size="xs"
                    colorScheme="red"
                    onClick={() => setRejectingId(r.visit_request_id)}
                  >
                    Reject
                  </Button>
                </HStack>

                {rejectingId === r.visit_request_id && (
                  <HStack mt={2}>
                    <Input
                      size="sm"
                      placeholder="Reason"
                      value={reasons[r.visit_request_id] || ""}
                      onChange={(e) =>
                        setReasons({
                          ...reasons,
                          [r.visit_request_id]: e.target.value,
                        })
                      }
                    />

                    <Button
                      size="sm"
                      colorScheme="red"
                      onClick={() => rejectRequest(r.visit_request_id)}
                    >
                      Save
                    </Button>
                  </HStack>
                )}
              </Td>
            </Tr>
          ))}

          {requests.length === 0 && (
            <Tr>
              <Td colSpan={7}>
                <Text textAlign="center">No pending requests</Text>
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </Box>
  );
}
