import {
  Box,
  Heading,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Button,
  HStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  getRecentDischarges,
  approveDischarge,
  rejectDischarge,
} from "../services/dischargeService";
import { useAuth } from "../context/AuthContext";

export default function ApprovalDashboard() {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [data, setData] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getRecentDischarges();
      setData(res.data || []);
    } catch {
      toast({ title: "Failed to load data", status: "error" });
    }
  };

  const filtered = data.filter(
    (d) => d.approval_status === filter && !d.reversed,
  );

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleApprove = async (id) => {
    try {
      await approveDischarge(id);
      toast({ title: "Approved", status: "success" });
      loadData();
    } catch (err) {
      toast({ title: err.message, status: "error" });
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectDischarge(id);
      toast({ title: "Rejected", status: "info" });
      loadData();
    } catch (err) {
      toast({ title: err.message, status: "error" });
    }
  };

  const handleBulkApprove = async () => {
    try {
      for (const id of selected) {
        await approveDischarge(id);
      }

      toast({
        title: "Bulk approval completed",
        status: "success",
      });

      setSelected([]);
      loadData();
    } catch (err) {
      toast({ title: err.message, status: "error" });
    }
  };

  return (
    <Box p={6}>
      <Heading mb={4}>Approval Dashboard</Heading>

      <HStack mb={4} spacing={4}>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          width="200px"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PENDING_REVERSAL">Pending Reversal</option>
        </Select>

        {filter === "PENDING" && hasPermission("can_approve") && (
          <Button
            colorScheme="green"
            onClick={handleBulkApprove}
            isDisabled={!selected.length}
          >
            Bulk Approve
          </Button>
        )}
      </HStack>

      <Table size="sm">
        <Thead>
          <Tr>
            {filter === "PENDING" && <Th></Th>}
            <Th>Date</Th>
            <Th>Discharge No</Th>
            <Th>Customer</Th>
            <Th>Branch</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>

        <Tbody>
          {filtered.map((row) => (
            <Tr key={row.discharge_id}>
              {filter === "PENDING" && (
                <Td>
                  <Checkbox
                    isChecked={selected.includes(row.discharge_id)}
                    onChange={() => toggleSelect(row.discharge_id)}
                  />
                </Td>
              )}

              <Td>{row.discharge_date?.slice(0, 10)}</Td>
              <Td>{row.discharge_no}</Td>
              <Td>{row.customer_name}</Td>
              <Td>{row.branch_name}</Td>
              <Td>{row.approval_status}</Td>

              <Td>
                <HStack>
                  {filter === "PENDING" && hasPermission("can_approve") && (
                    <>
                      <Button
                        size="xs"
                        colorScheme="green"
                        onClick={() => handleApprove(row.discharge_id)}
                      >
                        Approve
                      </Button>

                      <Button
                        size="xs"
                        colorScheme="orange"
                        onClick={() => handleReject(row.discharge_id)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
