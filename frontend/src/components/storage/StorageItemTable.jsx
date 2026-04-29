import {
  Box,
  HStack,
  IconButton,
  Image,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { FaTrash } from "react-icons/fa";

const PLACEHOLDER_IMAGE = "/placeholder.png";

const CONDITIONS = ["Good", "Fair", "Damaged", "Broken", "Non Tested"];

export default function StorageItemTable({
  items = [],
  setItems,
  confirmationMode = false,
}) {
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: field === "quantity" ? Number(value || 0) : value,
      };

      return updated;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return PLACEHOLDER_IMAGE;

    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://") ||
      imageUrl.startsWith("data:")
    ) {
      return imageUrl;
    }

    const apiBase =
      import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ||
      "http://localhost:5000";

    if (imageUrl.startsWith("/")) {
      return `${apiBase}${imageUrl}`;
    }

    return `${apiBase}/${imageUrl}`;
  };

  if (!items.length) {
    return (
      <Box
        borderWidth="1px"
        borderRadius="lg"
        py={10}
        textAlign="center"
        color="gray.500"
      >
        No items selected.
      </Box>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
      <Table size="sm">
        <Thead bg="gray.50">
          <Tr>
            <Th width="80px">Image</Th>
            <Th minW="260px">Item Name</Th>

            {confirmationMode ? (
              <>
                <Th width="100px">Quantity</Th>
                <Th width="100px">Received</Th>
              </>
            ) : (
              <Th width="120px">Quantity</Th>
            )}

            <Th width="160px">Condition</Th>
            <Th minW="220px">Item Notes</Th>
            <Th width="60px"></Th>
          </Tr>
        </Thead>

        <Tbody>
          {items.map((item, index) => (
            <Tr key={item.generated_barcode || `${item.product_id}-${index}`}>
              <Td>
                <Image
                  src={resolveImageUrl(item.image_url)}
                  fallbackSrc={PLACEHOLDER_IMAGE}
                  boxSize="54px"
                  objectFit="cover"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="gray.50"
                />
              </Td>

              <Td>
                <HStack align="start">
                  <Box>
                    <Text fontWeight="semibold">{item.product_name}</Text>

                    <Text fontSize="sm" color="gray.600">
                      {item.category_name || "-"}
                    </Text>

                    {item.generated_barcode && (
                      <Text
                        fontSize="xs"
                        color="blue.600"
                        mt={1}
                        wordBreak="break-all"
                      >
                        {item.generated_barcode}
                      </Text>
                    )}
                  </Box>
                </HStack>
              </Td>

              {confirmationMode ? (
                <>
                  <Td>
                    <Text>{item.quantity}</Text>
                  </Td>

                  <Td>
                    <Text
                      fontWeight="bold"
                      color={
                        Number(item.received || 0) >= Number(item.quantity || 0)
                          ? "green.600"
                          : "orange.600"
                      }
                    >
                      {item.received || 1}
                    </Text>
                  </Td>
                </>
              ) : (
                <Td>
                  <Input
                    size="sm"
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                  />
                </Td>
              )}

              <Td>
                <Select
                  size="sm"
                  value={item.condition || "Good"}
                  onChange={(e) =>
                    updateItem(index, "condition", e.target.value)
                  }
                  isDisabled={confirmationMode}
                >
                  {CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </Select>
              </Td>

              <Td>
                <Textarea
                  size="sm"
                  rows={2}
                  resize="vertical"
                  placeholder="Optional item notes"
                  value={item.item_notes || ""}
                  onChange={(e) =>
                    updateItem(index, "item_notes", e.target.value)
                  }
                  isDisabled={confirmationMode}
                />
              </Td>

              <Td textAlign="center">
                <IconButton
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  icon={<FaTrash />}
                  aria-label="Remove item"
                  onClick={() => removeItem(index)}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
