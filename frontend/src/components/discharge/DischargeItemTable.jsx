import {
  Checkbox,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";

export default function DischargeItemTable({ items, setItems }) {
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Select</Th>
          <Th>Item</Th>
          <Th>Date Received</Th>
          <Th>Condition</Th>
          <Th>Quantity</Th>
          <Th>Qty Remaining</Th>
          <Th>Discharge</Th>
        </Tr>
      </Thead>

      <Tbody>
        {items.map((item, index) => (
          <Tr key={item.storage_item_id}>
            <Td>
              <Checkbox
                isChecked={item.selected}
                onChange={(e) =>
                  updateItem(index, "selected", e.target.checked)
                }
              />
            </Td>

            <Td>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold">{item.product_name}</Text>
                <Text fontSize="xs" color="gray.500">
                  {item.category_name}
                </Text>
              </VStack>
            </Td>

            <Td>{item.received_date?.slice(0, 10)}</Td>
            <Td>{item.condition}</Td>
            <Td>{item.received_quantity}</Td>
            <Td>{item.remaining_quantity}</Td>

            <Td width="120px">
              <Input
                type="number"
                min={0}
                max={item.remaining_quantity}
                isDisabled={!item.selected}
                value={item.discharge_quantity}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  updateItem(
                    index,
                    "discharge_quantity",
                    value > item.remaining_quantity
                      ? item.remaining_quantity
                      : value,
                  );
                }}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
