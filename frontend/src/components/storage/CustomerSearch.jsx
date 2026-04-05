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
import { searchCustomers } from "../../services/storageService";

export default function CustomerSearch({ value, onSelect }) {
  const [query, setQuery] = useState(value?.fullname || "");
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
        const res = await searchCustomers(query);
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
        placeholder="Search customer name or telephone"
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
          {results.map((customer) => (
            <ListItem
              key={customer.id}
              px={3}
              py={2}
              cursor="pointer"
              _hover={{ bg: "gray.100" }}
              onClick={() => {
                onSelect(customer);
                setQuery(customer.fullname);
                setResults([]);
              }}
            >
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold">{customer.fullname}</Text>
                <Text fontSize="sm" color="gray.500">
                  {customer.telephone}
                </Text>
                {customer.email && (
                  <Text fontSize="xs" color="gray.400">
                    {customer.email}
                  </Text>
                )}
              </VStack>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
