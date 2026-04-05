import {
  IconButton,
  Image,
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
import { DeleteIcon } from "@chakra-ui/icons";

const placeholderImage = "/placeholder.png";

export default function StorageItemTable({ items, setItems }) {
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const removeItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  return (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th>Image</Th>
          <Th>Item Name</Th>
          <Th width="120px">Quantity</Th>
          <Th width="180px">Condition</Th>
          <Th width="60px"></Th>
        </Tr>
      </Thead>

      <Tbody>
        {items.map((item, index) => (
          <Tr key={`${item.product_id}-${index}`}>
            <Td>
              <Image
                src={
                  item.image_url
                    ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${item.image_url}`
                    : placeholderImage
                }
                fallbackSrc={placeholderImage}
                boxSize="50px"
                objectFit="cover"
                borderRadius="md"
              />
            </Td>

            <Td>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold">{item.product_name}</Text>
                <Text fontSize="sm" color="gray.500">
                  {item.category_name}
                </Text>
              </VStack>
            </Td>

            <Td>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, "quantity", Number(e.target.value))
                }
              />
            </Td>

            <Td>
              <Select
                value={item.condition}
                onChange={(e) => updateItem(index, "condition", e.target.value)}
              >
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Damaged">Damaged</option>
                <option value="Broken">Broken</option>
                <option value="Non Tested">Non Tested</option>
              </Select>
            </Td>

            <Td>
              <IconButton
                icon={<DeleteIcon />}
                colorScheme="red"
                variant="ghost"
                onClick={() => removeItem(index)}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
