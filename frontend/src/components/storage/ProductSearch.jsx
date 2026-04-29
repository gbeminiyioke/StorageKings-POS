import {
  Box,
  HStack,
  Image,
  Input,
  List,
  ListItem,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { searchProducts } from "../../services/storageService";

const PLACEHOLDER_IMAGE = "/placeholder.png";

export default function ProductSearch({ onSelect, isDisabled = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isDisabled) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setShowResults(false);
        return;
      }

      try {
        setLoading(true);

        const response = await searchProducts(query.trim());

        setResults(response.data || []);
        setShowResults(true);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error("Product search failed:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isDisabled]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSelect = (product) => {
    onSelect(product);

    setQuery("");
    setResults([]);
    setShowResults(false);
    setHighlightedIndex(-1);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (isDisabled || !showResults || !results.length) {
      return;
    }

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

      if (highlightedIndex >= 0) {
        handleSelect(results[highlightedIndex]);
      } else if (results.length === 1) {
        handleSelect(results[0]);
      }
    }

    if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  return (
    <Box position="relative" ref={wrapperRef}>
      <Input
        ref={inputRef}
        placeholder="Search product by name or product code"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (!isDisabled && results.length) {
            setShowResults(true);
          }
        }}
        onKeyDown={handleKeyDown}
        isDisabled={isDisabled}
        bg={isDisabled ? "gray.100" : "white"}
      />

      {loading && !isDisabled && (
        <Box position="absolute" top="12px" right="12px">
          <Spinner size="sm" />
        </Box>
      )}

      {showResults && !isDisabled && results.length > 0 && (
        <List
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={2}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="lg"
          maxH="320px"
          overflowY="auto"
          zIndex={1000}
        >
          {results.map((product, index) => (
            <ListItem
              key={product.product_id}
              px={3}
              py={3}
              cursor="pointer"
              bg={index === highlightedIndex ? "blue.50" : "white"}
              _hover={{ bg: "blue.50" }}
              borderBottom="1px solid"
              borderColor="gray.100"
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={() => handleSelect(product)}
            >
              <HStack spacing={3} align="start">
                <Image
                  src={product.image_url || PLACEHOLDER_IMAGE}
                  fallbackSrc={PLACEHOLDER_IMAGE}
                  boxSize="48px"
                  objectFit="cover"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="gray.50"
                />

                <VStack align="start" spacing={0} flex={1}>
                  <Text fontWeight="semibold">{product.product_name}</Text>

                  <Text fontSize="sm" color="gray.600">
                    {product.category_name || "No category"}
                  </Text>

                  <Text fontSize="xs" color="gray.500">
                    Product Code: {product.product_code || "-"}
                  </Text>
                </VStack>
              </HStack>
            </ListItem>
          ))}
        </List>
      )}

      {showResults &&
        !loading &&
        !isDisabled &&
        query.trim() &&
        results.length === 0 && (
          <Box
            position="absolute"
            top="100%"
            left={0}
            right={0}
            mt={2}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            boxShadow="md"
            px={4}
            py={3}
            zIndex={1000}
          >
            <Text color="gray.500" fontSize="sm">
              No matching products found.
            </Text>
          </Box>
        )}
    </Box>
  );
}
