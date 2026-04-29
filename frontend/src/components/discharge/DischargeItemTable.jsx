import {
  Checkbox,
  Input,
  Select,
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
  // =========================
  //SAFE UPDATE
  // =========================
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // =========================
  //QUANTITY HANDLER
  // =========================
  const handleQuantityChange = (index, rawValue) => {
    const item = items[index];

    let value = Number(rawValue);

    if (isNaN(value)) value = 0;

    value = Math.max(0, Math.min(value, Number(item.remaining_quantity)));

    updateItem(index, "discharge_quantity", value);

    //Auto select logic
    if (value === 0) {
      updateItem(index, "selected", false);
    } else {
      updateItem(index, "selected", true);
    }
  };

  // =========================
  //SELECT HANDLER
  // =========================
  const handleSelectChange = (index, checked) => {
    const item = items[index];

    updateItem(index, "selected", checked);

    if (checked) {
      updateItem(
        index,
        "discharge_quantity",
        item.discharge_quantity > 0
          ? item.discharge_quantity
          : item.remaining_quantity,
      );
    } else {
      updateItem(index, "discharge_quantity", 0);
    }
  };

  // =========================
  //BULK SELECT
  // =========================
  const allSelected = items.length > 0 && items.every((item) => item.selected);

  const someSelected = items.some((item) => item.selected) && !allSelected;

  const handleBulkSelect = (checked) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: checked,
        discharge_quantity: checked ? item.remaining_quantity : 0,
      })),
    );
  };

  // =========================
  //CONDITION UPDATE
  // =========================
  const handleConditionChange = (index, value) => {
    updateItem(index, "condition", value);
  };

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>
            <Checkbox
              isChecked={allSelected}
              isIndeterminate={someSelected}
              onChange={(e) => handleBulkSelect(e.target.checked)}
            />
          </Th>
          <Th>Item</Th>
          <Th>Date Received</Th>
          <Th>Condition</Th>
          <Th isNumeric>Qty Received</Th>
          <Th isNumeric>Qty Remaining</Th>
          <Th isNumeric>Discharge</Th>
        </Tr>
      </Thead>

      <Tbody>
        {items.map((item, index) => (
          <Tr key={item.storage_item_id}>
            {/* SELECT */}
            <Td>
              <Checkbox
                isChecked={!!item.selected}
                onChange={(e) => handleSelectChange(index, e.target.checked)}
              />
            </Td>

            {/* ITEM */}
            <Td>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold">{item.product_name}</Text>
                <Text fontSize="xs" color="gray.500">
                  {item.category_name}
                </Text>
              </VStack>
            </Td>

            {/* DATE */}
            <Td>{item.received_date?.slice(0, 10)}</Td>

            {/* CONDITION (INLINE EDIT) */}
            <Td>
              <Select
                size="sm"
                value={item.condition || "Good"}
                onChange={(e) => handleConditionChange(index, e.target.value)}
              >
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Damaged">Damaged</option>
                <option value="Broken">Broken</option>
                <option value="Non Tested">Non Tested</option>
              </Select>
            </Td>

            {/* RECEIVED */}
            <Td isNumeric>{item.received_quantity}</Td>

            {/* REMAINING */}
            <Td isNumeric>{item.remaining_quantity}</Td>

            {/* DISCHARGE */}
            <Td width="130px">
              <Input
                type="number"
                size="sm"
                min={0}
                max={item.remaining_quantity}
                isDisabled={!item.selected}
                value={item.discharge_quantity ?? 0}
                onChange={(e) => handleQuantityChange(index, e.target.value)}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
