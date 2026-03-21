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

import {
  EditIcon,
  ViewIcon,
  DeleteIcon,
  PrintIcon,
  DownloadIcon,
} from "@chakra-ui/icons";

export default function ExistingGRNTable({
  data,
  permissions,
  onEdit,
  onView,
  onDelete,
  onPrint,
}) {
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
        {data.map((row) => {
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
                  {permissions?.can_view && (
                    <IconButton
                      size="sm"
                      icon={<ViewIcon />}
                      onClick={() => onView(row.receive_id)}
                    />
                  )}

                  {/* EDIT */}
                  {permissions?.can_edit && !isApproved && (
                    <IconButton
                      size="sm"
                      icon={<EditIcon />}
                      onClick={() => onEdit(row.receive_id, row.status)}
                    />
                  )}

                  {/* DELETE */}
                  {permissions?.can_delete && !isApproved && (
                    <IconButton
                      size="sm"
                      colorScheme="red"
                      icon={<DeleteIcon />}
                      onClick={() => onDelete(row.receive_id)}
                    />
                  )}

                  {/* PRINT */}
                  {permissions?.can_view && !isApproved && (
                    <IconButton
                      size="sm"
                      icon={<PrintIcon />}
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
                        `http://localhost:5000/api/receive-items/${row.receive_id}/excel`,
                      )
                    }
                  />
                </HStack>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
