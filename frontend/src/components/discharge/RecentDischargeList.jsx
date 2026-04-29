import {
  HStack,
  IconButton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  Tooltip,
} from "@chakra-ui/react";
import { EmailIcon, WarningIcon } from "@chakra-ui/icons";
import { FaPrint } from "react-icons/fa";
import { useState } from "react";
import {
  emailDischargePdf,
  reverseDischarge,
} from "../../services/dischargeService";

export default function RecentDischargeList({ discharges, onPrint }) {
  const toast = useToast();
  const [loadingId, setLoadingId] = useState(null);
  const [reversingId, setReversingId] = useState(null);

  const handleEmail = async (id) => {
    try {
      setLoadingId(id);

      await emailDischargePdf(id);

      toast({
        title: "Discharge emailed successfully",
        status: "success",
      });
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to email PDF",
        status: "error",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleReverse = async (id, reversed) => {
    if (reversed) {
      toast({
        title: "Already reversed",
        status: "warning",
      });
      return;
    }

    const reason = prompt("Enter reversal reason:");
    if (!reason) return;

    try {
      setReversingId(id);

      await reverseDischarge(id, reason);

      toast({
        title: "Discharge reversed successfully",
        status: "success",
      });

      window.location.reload();
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to reverse",
        status: "error",
      });
    } finally {
      setReversingId(null);
    }
  };

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Date</Th>
          <Th>Branch</Th>
          <Th>Customer</Th>
          <Th>Status</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>

      <Tbody>
        {discharges.map((row) => (
          <Tr key={row.discharge_id}>
            <Td>{row.discharge_date?.slice(0, 10)}</Td>
            <Td>{row.branch_name}</Td>
            <Td>{row.customer_name}</Td>
            <Td>
              {row.reversed ? (
                <Text color="red.500">Reversed</Text>
              ) : (
                row.storage_status
              )}
            </Td>

            <Td>
              <HStack>
                <Tooltip label="Print">
                  <IconButton
                    size="sm"
                    icon={<FaPrint />}
                    onClick={() => onPrint(row)}
                  />
                </Tooltip>

                <Tooltip label="Send Email">
                  <IconButton
                    size="sm"
                    colorScheme="blue"
                    icon={<EmailIcon />}
                    onClick={() => handleEmail(row.discharge_id)}
                    isLoading={loadingId === row.discharge_id}
                  />
                </Tooltip>

                <Tooltip label="Reverse Discharge">
                  <IconButton
                    size="sm"
                    colorScheme="red"
                    icon={<WarningIcon />}
                    onClick={() =>
                      handleReverse(row.discharge_id, row.reversed)
                    }
                    isDisabled={row.reversed}
                    isLoading={reversingId === row.discharge_id}
                  />
                </Tooltip>
              </HStack>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
