import { Box, Input, List, ListItem, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { searchCustomers } from "../../services/storageService";

export default function CustomerSearch({
  value,
  onSelect,
  isDisabled = false,
}) {
  const [query, setQuery] = useState(value?.fullname || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value?.fullname || "");
  }, [value]);

  useEffect(() => {
    if (isDisabled) return;

    const timer = setTimeout(async () => {
      const value = query?.trim();

      if (!value || value.length < 2) {
        setResults([]);
        setShowList(false);
        setHighlightedIndex(-1);
        return;
      }

      try {
        setLoading(true);

        const response = await searchCustomers(value);

        const rows = Array.isArray(response?.data)
          ? response.data
          : response?.data?.customers || [];

        setResults(rows);
        setShowList(true);
        setHighlightedIndex(rows.length ? 0 : -1);
      } catch (err) {
        console.error("Customer search failed:", err);
        setResults([]);
        setShowList(false);
        setHighlightedIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isDisabled]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowList(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSelect = (customer) => {
    setQuery(customer.fullname || "");
    setResults([]);
    setShowList(false);
    setHighlightedIndex(-1);

    if (onSelect) {
      onSelect(customer);
    }
  };

  const handleKeyDown = (e) => {
    if (!showList || !results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        handleSelect(results[highlightedIndex]);
      }
    }

    if (e.key === "Escape") {
      setShowList(false);
    }
  };

  return (
    <Box position="relative" ref={wrapperRef}>
      <Input
        placeholder="Search customer by fullname, phone number or email"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);

          if (!e.target.value.trim()) {
            setResults([]);
            setShowList(false);

            if (onSelect) {
              onSelect(null);
            }
          }
        }}
        onFocus={() => {
          if (results.length) {
            setShowList(true);
          }
        }}
        onKeyDown={handleKeyDown}
        isDisabled={isDisabled}
        bg={isDisabled ? "gray.100" : "white"}
      />

      {loading && (
        <Box
          position="absolute"
          top="50%"
          right="12px"
          transform="translateY(-50%)"
        >
          <Spinner size="sm" />
        </Box>
      )}

      {showList && results.length > 0 && (
        <List
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="lg"
          zIndex={1000}
          maxH="260px"
          overflowY="auto"
        >
          {results.map((customer, index) => (
            <ListItem
              key={customer.id}
              px={4}
              py={3}
              cursor="pointer"
              bg={index === highlightedIndex ? "blue.50" : "white"}
              _hover={{
                bg: "blue.50",
              }}
              borderBottom="1px solid"
              borderColor="gray.100"
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(customer);
              }}
            >
              <Text fontWeight="semibold">{customer.fullname}</Text>

              <Text fontSize="sm" color="gray.600">
                {customer.telephone || "No phone number"}
              </Text>

              {customer.email && (
                <Text fontSize="sm" color="gray.500">
                  {customer.email}
                </Text>
              )}

              {customer.branch_name && (
                <Text fontSize="xs" color="gray.400">
                  {customer.branch_name}
                </Text>
              )}
            </ListItem>
          ))}
        </List>
      )}

      {showList &&
        !loading &&
        query.trim().length >= 2 &&
        results.length === 0 && (
          <Box
            position="absolute"
            top="calc(100% + 4px)"
            left={0}
            right={0}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            boxShadow="md"
            p={3}
            zIndex={1000}
          >
            <Text fontSize="sm" color="gray.500">
              No matching customers found.
            </Text>
          </Box>
        )}
    </Box>
  );
}
