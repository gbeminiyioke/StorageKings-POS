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
import { emailStoragePdf } from "../../services/storageService";

export default function RecentStorageList({ storages, onPrint }) {
  const toast = useToast();

  const handleEmail = async (storageId) => {
    try {
      await emailStoragePdf(storageId);

      toast({
        title: "Storage receipt emailed successfully",
        status: "success",
      });
    } catch (err) {
      toast({
        title:
          err?.response?.data?.message ||
          "Customer email could not be sent, but the storage was saved successfully.",
        status: "warning",
        duration: 5000,
      });
    }
  };

  return (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>Received Date</Th>
          <Th>Branch</Th>
          <Th>Customer Name</Th>
          <Th>Status</Th>
          <Th width="90px">Actions</Th>
        </Tr>
      </Thead>

      <Tbody>
        {storages.length === 0 ? (
          <Tr>
            <Td colSpan={6}>
              <Text textAlign="center" color="gray.500">
                No storage records found in the last 30 days.
              </Text>
            </Td>
          </Tr>
        ) : (
          storages.map((storage) => (
            <Tr key={storage.storage_id}>
              <Td>{storage.received_date}</Td>
              <Td>{storage.branch_name}</Td>
              <Td>{storage.customer_name}</Td>
              <Td>{storage.status}</Td>
              <Td>
                <HStack spacing={2}>
                  <IconButton
                    size="sm"
                    icon={<FaPrint />}
                    aria-label="Print"
                    onClick={() => onPrint(storage)}
                  />

                  <IconButton
                    size="sm"
                    colorScheme="blue"
                    icon={<EmailIcon />}
                    aria-label="Email"
                    onClick={() => handleEmail(storage.storage_id)}
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
