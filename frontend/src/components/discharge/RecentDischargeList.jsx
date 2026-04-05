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
} from "@chakra-ui/react";
import { EmailIcon } from "@chakra-ui/icons";
import { FaPrint } from "react-icons/fa";
import { emailDischargePdf } from "../../services/dischargeService";

export default function RecentDischargeList({ discharges, onPrint }) {
  const toast = useToast();

  const handleEmail = async (id) => {
    try {
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
    }
  };

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Discharge Date</Th>
          <Th>Branch</Th>
          <Th>Customer Name</Th>
          <Th>Storage Status</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>

      <Tbody>
        {discharges.length === 0 ? (
          <Tr>
            <Td colSpan={5}>
              <Text textAlign="center" color="gray.500">
                No discharges found in the last 30 days.
              </Text>
            </Td>
          </Tr>
        ) : (
          discharges.map((row) => (
            <Tr key={row.discharge_id}>
              <Td>{row.discharge_date?.slice(0, 10)}</Td>
              <Td>{row.branch_name}</Td>
              <Td>{row.customer_name}</Td>
              <Td>{row.storage_status}</Td>
              <Td>
                <HStack>
                  <IconButton
                    size="sm"
                    icon={<FaPrint />}
                    onClick={() => onPrint(row)}
                    aria-label="Print"
                  />

                  <IconButton
                    size="sm"
                    colorScheme="blue"
                    icon={<EmailIcon />}
                    onClick={() => handleEmail(row.discharge_id)}
                    aria-label="Email"
                  />
                </HStack>
              </Td>
            </Tr>
          ))
        )}
      </Tbody>
    </Table>
  );
}
