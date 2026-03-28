import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  HStack,
} from "@chakra-ui/react";

import { EditIcon, ViewIcon, DeleteIcon, DownloadIcon } from "@chakra-ui/icons";
import { FiPrinter } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

export default function ExistingGRNTable({
  data,
  onEdit,
  onView,
  onDelete,
  onPrint,
}) {
  const { hasPermission } = useAuth();
  const BASE_URL = import.meta.env.VITE_API_URL || "";

  const safeData = Array.isArray(data) ? data : data?.rows || data?.data || [];

  return (
    <Table size="sm" mt={6}>
      <Thead>
        <Tr>
          <Th>GRN</Th>
          <Th>Supplier</Th>
          <Th>Branch</Th>
          <Th>Date</Th>
          <Th>Total</Th>
          <Th>Status</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>

      <Tbody>
        {safeData.length === 0 ? (
          <Tr>
            <Td colSpan={7} textAlign="center">
              No GRNs found
            </Td>
          </Tr>
        ) : (
          safeData.map((row) => {
            const isApproved = row.status === "APPROVED";

            return (
              <Tr key={row.receive_id}>
                <Td>{row.grn_no}</Td>
                <Td>{row.supplier_name}</Td>
                <Td>{row.branch_name}</Td>
                <Td>{row.receive_date}</Td>
                <Td>{row.grand_total}</Td>
                <Td>{row.status}</Td>
                <Td>
                  <HStack>
                    {/* VIEW */}
                    {hasPermission("can_view") && (
                      <IconButton
                        size="sm"
                        icon={<ViewIcon />}
                        onClick={() => onView(row.receive_id)}
                      />
                    )}

                    {/* EDIT */}
                    {hasPermission("can_edit") && !isApproved && (
                      <IconButton
                        size="sm"
                        icon={<EditIcon />}
                        onClick={() => onEdit(row.receive_id, row.status)}
                      />
                    )}

                    {/* DELETE */}
                    {hasPermission("can_delete") && !isApproved && (
                      <IconButton
                        size="sm"
                        colorScheme="red"
                        icon={<DeleteIcon />}
                        onClick={() => onDelete(row.receive_id)}
                      />
                    )}

                    {/* PRINT */}
                    {hasPermission("can_view") && (
                      <IconButton
                        size="sm"
                        icon={<FiPrinter />}
                        onClick={() => onPrint(row.receive_id)}
                      />
                    )}

                    {/* DOWNLOAD */}
                    <IconButton
                      size="sm"
                      colorScheme="purple"
                      icon={<DownloadIcon />}
                      onClick={() =>
                        window.open(
                          `${BASE_URL}/receive-items/${row.receive_id}/excel`,
                          "_blank",
                        )
                      }
                    />
                  </HStack>
                </Td>
              </Tr>
            );
          })
        )}
      </Tbody>
    </Table>
  );
}
