import {
  Box,
  Input,
  List,
  ListItem,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { searchProducts } from "../../services/storageService";

export default function ProductSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await searchProducts(query);
        setResults(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Box position="relative" w="100%">
      <Input
        placeholder="Search Product Name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <Box position="absolute" top="10px" right="10px">
          <Spinner size="sm" />
        </Box>
      )}

      {results.length > 0 && (
        <List
          position="absolute"
          top="42px"
          left={0}
          right={0}
          zIndex={20}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          maxH="250px"
          overflowY="auto"
          shadow="lg"
        >
          {results.map((product) => (
            <ListItem
              key={product.product_id}
              px={3}
              py={2}
              cursor="pointer"
              _hover={{ bg: "gray.100" }}
              onClick={() => {
                onSelect(product);
                setQuery("");
                setResults([]);
              }}
            >
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold">{product.product_name}</Text>
                <Text fontSize="sm" color="gray.500">
                  {product.category_name}
                </Text>
              </VStack>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
