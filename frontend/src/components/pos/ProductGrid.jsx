import { useEffect, useMemo, useState } from "react";
import {
  Input,
  SimpleGrid,
  Box,
  Text,
  Spinner,
  VStack,
  List,
  ListItem,
} from "@chakra-ui/react";
import api from "../../api/api";
import { usePOS } from "../../context/POSContext";

export default function ProductGrid({ search, setSearch, category }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");

  const { addToCart } = usePOS();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const res = await api.get("/products/pos");

      const data = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.products || [];

      console.log("POS PRODUCTS:", data);

      setProducts(data);
    } catch (err) {
      console.error("Failed to load products", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Barcode / product code exact match
  useEffect(() => {
    if (!codeSearch.trim()) return;

    const matched = products.find(
      (p) =>
        String(p.product_code || "").toLowerCase() ===
        codeSearch.trim().toLowerCase(),
    );

    if (matched) {
      addToCart({
        ...matched,
        selling_price: Number(matched.selling_price || 0),
      });

      setCodeSearch("");
    }
  }, [codeSearch, products, addToCart]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCode =
        !codeSearch ||
        String(p.product_code || "")
          .toLowerCase()
          .includes(codeSearch.toLowerCase());

      const matchesName =
        !search ||
        String(p.product_name || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        !category ||
        category === "All" ||
        String(p.category_name || "")
          .trim()
          .toLowerCase() === String(category).trim().toLowerCase();

      return matchesCode && matchesName && matchesCategory;
    });
  }, [products, codeSearch, search, category]);

  if (loading) {
    return <Spinner />;
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Box bg="white" p={4} borderRadius="md" shadow="sm">
        <Text fontSize="sm" mb={1}>
          Search Product Code
        </Text>

        <Input
          placeholder="Scan or type barcode / product code"
          value={codeSearch}
          onChange={(e) => setCodeSearch(e.target.value)}
          mb={3}
        />

        <Text fontSize="sm" mb={1}>
          Search Product Name
        </Text>

        <Input
          placeholder="Type product name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search.trim() && filteredProducts.length > 0 && (
          <List
            mt={2}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            maxH="180px"
            overflowY="auto"
            bg="white"
          >
            {filteredProducts.slice(0, 10).map((product) => (
              <ListItem
                key={product.product_id}
                px={3}
                py={2}
                cursor="pointer"
                _hover={{ bg: "gray.100" }}
                onClick={() => {
                  addToCart({
                    ...product,
                    selling_price: Number(product.selling_price || 0),
                  });

                  setSearch("");
                }}
              >
                {product.product_name} ({product.product_code})
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <SimpleGrid columns={[1, 2, 3]} spacing={3}>
        {filteredProducts.map((product) => (
          <Box
            key={product.product_id}
            p={3}
            bg="white"
            borderRadius="md"
            shadow="sm"
            cursor="pointer"
            transition="0.2s"
            _hover={{
              shadow: "md",
              transform: "translateY(-2px)",
            }}
            onClick={() =>
              addToCart({
                ...product,
                selling_price: Number(product.selling_price || 0),
              })
            }
          >
            <Text fontWeight="bold">{product.product_name}</Text>

            <Text fontSize="sm" color="gray.500">
              {product.product_code}
            </Text>

            {product.category_name && (
              <Text fontSize="xs" color="blue.500" mt={1}>
                {product.category_name}
              </Text>
            )}

            <Text mt={2} color="green.600" fontWeight="bold">
              ₦ {Number(product.selling_price || 0).toFixed(2)}
            </Text>

            {product.monitor_stock && (
              <Text fontSize="xs" color="orange.500" mt={1}>
                Stock: {product.stock_quantity}
              </Text>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  );
}
