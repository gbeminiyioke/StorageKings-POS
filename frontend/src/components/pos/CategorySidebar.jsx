import { VStack, Button, Text, Spinner, Center } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import api from "../../api/api";

export default function CategorySidebar({ selected, setSelected }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ===============================
     FETCH CATEGORIES FROM BACKEND
  =============================== */
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);

      const res = await api.get("/products/categories");

      const data = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.categories || [];

      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories", err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     LOADING STATE
  =============================== */
  if (loading) {
    return (
      <Center h="100%">
        <Spinner />
      </Center>
    );
  }

  /* ===============================
     CATEGORY LIST
  =============================== */
  return (
    <VStack bg="gray.50" p={3} align="stretch" h="100%">
      <Text fontWeight="bold">Categories</Text>

      {/* ALWAYS include ALL */}
      <Button
        variant={selected === "All" ? "solid" : "ghost"}
        onClick={() => setSelected("All")}
      >
        All
      </Button>

      {categories.map((cat) => (
        <Button
          key={cat.category_id}
          variant={selected === cat.category_name ? "solid" : "ghost"}
          onClick={() => setSelected(cat.category_name)}
        >
          {cat.category_name}
        </Button>
      ))}
    </VStack>
  );
}
