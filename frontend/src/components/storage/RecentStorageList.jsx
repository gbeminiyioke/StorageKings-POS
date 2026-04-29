import {
  Box,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  Badge,
  VStack,
  Button,
} from "@chakra-ui/react";
import {
  FaBarcode,
  FaEnvelope,
  FaFilePdf,
  FaSearch,
  FaDownload,
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import {
  emailStoragePdf,
  getStorageItems,
} from "../../services/storageService";

export default function RecentStorageList({
  storages = [],
  onPrint,
  onPrintBarcodes,
  onLoadPrinted,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sendingId, setSendingId] = useState(null);

  const pageSize = 10;

  const filteredStorages = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return storages;

    return storages.filter((storage) => {
      return (
        storage.customer_name?.toLowerCase().includes(term) ||
        storage.branch_name?.toLowerCase().includes(term) ||
        storage.storage_no?.toLowerCase().includes(term)
      );
    });
  }, [search, storages]);

  const totalPages = Math.max(1, Math.ceil(filteredStorages.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedStorages = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStorages.slice(start, start + pageSize);
  }, [filteredStorages, page]);

  const handleEmail = async (storage) => {
    try {
      if (!storage.email) {
        alert("This customer does not have an email address.");
        return;
      }

      setSendingId(storage.storage_id);

      await emailStoragePdf(storage.storage_id);

      alert("Storage form emailed successfully.");
    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
          "Unable to send the storage form by email.",
      );
    } finally {
      setSendingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || "").toUpperCase()) {
      case "ACTIVE":
        return "green";
      case "PRINTED":
        return "orange";
      case "COMPLETED":
        return "blue";
      default:
        return "gray";
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <InputGroup maxW="420px">
        <InputLeftElement pointerEvents="none">
          <FaSearch color="#718096" />
        </InputLeftElement>

        <Input
          placeholder="Search by branch, customer or storage no"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </InputGroup>

      <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
        <Table size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>Received Date</Th>
              <Th>Storage No</Th>
              <Th>Branch</Th>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th textAlign="center" width="220px">
                Actions
              </Th>
            </Tr>
          </Thead>

          <Tbody>
            {paginatedStorages.length === 0 ? (
              <Tr>
                <Td colSpan={6}>
                  <Text py={6} textAlign="center" color="gray.500">
                    No storage records found.
                  </Text>
                </Td>
              </Tr>
            ) : (
              paginatedStorages.map((storage) => (
                <Tr key={storage.storage_id}>
                  <Td>
                    {storage.received_date
                      ? new Date(storage.received_date).toLocaleDateString()
                      : "-"}
                  </Td>

                  <Td fontWeight="semibold">{storage.storage_no}</Td>

                  <Td>{storage.branch_name}</Td>

                  <Td>{storage.customer_name}</Td>

                  <Td>
                    <Badge colorScheme={getStatusColor(storage.status)}>
                      {storage.status}
                    </Badge>
                  </Td>

                  <Td>
                    <HStack justify="center" spacing={2}>
                      {storage.status === "PRINTED" && (
                        <Tooltip label="Load Printed Storage">
                          <IconButton
                            size="sm"
                            colorScheme="orange"
                            icon={<FaDownload />}
                            aria-label="Load Printed Storage"
                            onClick={() => onLoadPrinted?.(storage)}
                          />
                        </Tooltip>
                      )}

                      <Tooltip label="View / Print Storage Form">
                        <IconButton
                          size="sm"
                          colorScheme="blue"
                          icon={<FaFilePdf />}
                          aria-label="View Storage Form"
                          onClick={() => onPrint?.(storage)}
                        />
                      </Tooltip>

                      <Tooltip label="Print Barcode Labels">
                        <IconButton
                          size="sm"
                          colorScheme="purple"
                          icon={<FaBarcode />}
                          aria-label="Print Barcode Labels"
                          onClick={() => onPrintBarcodes?.(storage)}
                        />
                      </Tooltip>

                      <Tooltip label="Email Storage Form">
                        <IconButton
                          size="sm"
                          colorScheme="green"
                          icon={<FaEnvelope />}
                          aria-label="Email Storage Form"
                          isLoading={sendingId === storage.storage_id}
                          onClick={() => handleEmail(storage)}
                        />
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      {totalPages > 1 && (
        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.600">
            Showing {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, filteredStorages.length)} of{" "}
            {filteredStorages.length}
          </Text>

          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              isDisabled={page === 1}
            >
              Previous
            </Button>

            <Text fontSize="sm">
              Page {page} of {totalPages}
            </Text>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              isDisabled={page === totalPages}
            >
              Next
            </Button>
          </HStack>
        </HStack>
      )}
    </VStack>
  );
}
