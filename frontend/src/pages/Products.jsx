import {
  Box,
  Grid,
  Input,
  Button,
  FormControl,
  FormLabel,
  Switch,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Flex,
  Image,
  HStack,
  useToast,
  NumberInput,
  NumberInputField,
  Spinner,
  VStack,
  Icon,
} from "@chakra-ui/react";
import { useForm, useFieldArray } from "react-hook-form";
import { useEffect, useState } from "react";
import api from "../api/api";
import Barcode from "react-barcode";
import {
  EditIcon,
  DeleteIcon,
  CopyIcon,
  AddIcon,
  MinusIcon,
} from "@chakra-ui/icons";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = "http://localhost:5000";

export default function Products() {
  const { user } = useAuth();
  const permissions = user?.permissions || {};
  const toast = useToast();

  const { register, handleSubmit, reset, watch, setValue, control } = useForm({
    defaultValues: {
      product_code: "",
      product_name: "",
      pos_name: "",
      category: "",
      unit: "",
      cost_price: "",
      selling_price: "",
      minimum_quantity: "",
      stock_quantity: 0,
      monitor_stock: true,
      can_be_sold: true,
      packages: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "packages",
  });

  const productCode = watch("product_code");
  const productName = watch("product_name");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, search]);

  const loadProducts = async () => {
    try {
      setTableLoading(true);
      const res = await api.get("/products", { params: { page, search } });

      const parsed = res.data.data.map((p) => ({
        ...p,
        packages:
          typeof p.packages === "string"
            ? JSON.parse(p.packages)
            : p.packages || [],
      }));

      setProducts(parsed);
      setTotal(res.data.total);
    } finally {
      setTableLoading(false);
    }
  };

  const loadCategories = async () => {
    const res = await api.get("/products/categories");
    setCategories(res.data);
  };

  useEffect(() => {
    setValue("pos_name", productName?.substring(0, 20) || "");
  }, [productName]);

  const clearForm = () => {
    reset({
      product_code: "",
      product_name: "",
      pos_name: "",
      category: "",
      unit: "",
      cost_price: "",
      selling_price: "",
      minimum_quantity: "",
      stock_quantity: 0,
      monitor_stock: true,
      can_be_sold: true,
      packages: [],
    });
    replace([]);
    setProductImage(null);
    setPreviewImage(null);
    setIsEdit(false);
    setEditingId(null);
  };

  const handleEdit = async (id) => {
    const res = await api.get(`/products/${id}`);
    const product = res.data;

    reset({
      ...product,
      category: product.category_name || "",
      monitor_stock: !!product.monitor_stock,
      can_be_sold: !!product.can_be_sold,
    });

    replace(
      typeof product.packages === "string"
        ? JSON.parse(product.packages)
        : product.packages || [],
    );

    setPreviewImage(
      product.image_url ? `${BACKEND_URL}${product.image_url}` : null,
    );

    setIsEdit(true);
    setEditingId(id);
  };

  const handleClone = async (id) => {
    const res = await api.get(`/products/${id}`);
    const product = res.data;

    reset({
      ...product,
      product_code: "",
      product_name: product.product_name + " (Copy)",
      category: product.category_name || "",
      monitor_stock: !!product.monitor_stock,
      can_be_sold: !!product.can_be_sold,
    });

    replace(
      typeof product.packages === "string"
        ? JSON.parse(product.packages)
        : product.packages || [],
    );

    setPreviewImage(
      product.image_url ? `${BACKEND_URL}${product.image_url}` : null,
    );

    setIsEdit(false);
    setEditingId(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProductImage(file);

    const imageUrl = URL.createObjectURL(file);
    setPreviewImage(imageUrl);

    const img = new window.Image();
    img.src = imageUrl;
    img.onload = () => {
      const maxWidth = 300;
      const scale = Math.min(maxWidth / img.naturalWidth, 1);

      setImageDimensions({
        width: img.naturalWidth * scale,
        height: img.naturalHeight * scale,
      });
    };
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();

      Object.keys(data).forEach((key) => {
        if (key !== "packages") {
          formData.append(key, data[key]);
        }
      });

      formData.append("packages", JSON.stringify(data.packages || []));
      if (productImage) formData.append("image", productImage);

      if (isEdit) {
        await api.put(`/products/${editingId}`, formData);
        toast({ title: "Product updated", status: "success" });
      } else {
        await api.post("/products", formData);
        toast({ title: "Product created", status: "success" });
      }

      toast({ title: "Product saved", status: "success" });

      clearForm();
      loadProducts();
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Save failed",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 10) || 1;

  return (
    <Box p={6}>
      <Text fontSize="xl" mb={4} fontWeight="bold">
        Product Details
      </Text>

      {/* ================= FORM ================= */}
      <Grid templateColumns="repeat(3,1fr)" gap={6} mb={6}>
        <FormControl>
          <FormLabel>Product Code</FormLabel>
          <Input {...register("product_code")} isDisabled={isEdit} />
          {productCode && <Barcode value={productCode} />}
        </FormControl>

        <FormControl>
          <FormLabel>Product Image</FormLabel>

          {/* HIDDEN FILE INPUT */}
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            display={"none"}
            id="product-image-upload"
          />

          {/* CLICKABLE IMAGE PLACE HOLDER */}
          <Box
            as="label"
            htmlFor="product-image-upload"
            cursor="pointer"
            border="2px dashed"
            borderColor="gray.300"
            borderRadius="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            bg="gray.50"
            position="relative"
            _hover={{ borderColor: "blue.400", bg: "gray.100" }}
            transition="0.2s"
            width={imageDimensions ? imageDimensions.width : "200px"}
            height={imageDimensions ? imageDimensions.height : "170px"}
          >
            {previewImage ? (
              <Image
                src={previewImage}
                objectFit="contain"
                width="100%"
                height="100%"
              />
            ) : (
              <VStack spacing={2} color="gray.500">
                <Icon as={AddIcon} boxSize={6} />
                <Text fontSize="sm">Click to upload image</Text>
              </VStack>
            )}
          </Box>

          {previewImage && (
            <Button
              size="xs"
              mt={2}
              colorScheme="red"
              variant="ghost"
              onClick={() => {
                setProductImage(null);
                setPreviewImage(null);
              }}
            >
              Remove Image
            </Button>
          )}
        </FormControl>

        <FormControl>
          <FormLabel>Product Name</FormLabel>
          <Input {...register("product_name")} />
        </FormControl>

        <FormControl>
          <FormLabel>POS Name</FormLabel>
          <Input {...register("pos_name")} />
        </FormControl>

        <FormControl>
          <FormLabel>Category</FormLabel>
          <Input list="category-list" {...register("category")} />
          <datalist id="category-list">
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_name} />
            ))}
          </datalist>
        </FormControl>

        <FormControl>
          <FormLabel>Unit</FormLabel>
          <Input {...register("unit")} />
        </FormControl>

        <FormControl>
          <FormLabel>Cost Price</FormLabel>
          <NumberInput>
            <NumberInputField {...register("cost_price")} />
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel>Selling Price</FormLabel>
          <NumberInput>
            <NumberInputField {...register("selling_price")} />
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel>Minimum Quantity</FormLabel>
          <Input type="number" {...register("minimum_quantity")} />
        </FormControl>

        <FormControl>
          <FormLabel>Stock Quantity</FormLabel>
          <Input type="number" {...register("stock_quantity")} />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Monitor Stock</FormLabel>
          <Switch {...register("monitor_stock")} />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Can Be Sold</FormLabel>
          <Switch {...register("can_be_sold")} />
        </FormControl>
      </Grid>

      {/* ================= PACKAGES ================= */}
      <Box mb={6}>
        <Text fontWeight="bold" mb={2}>
          Packages
        </Text>

        {fields.map((pkg, idx) => (
          <HStack key={pkg.id} mb={2}>
            <Input
              placeholder="Description"
              {...register(`packages.${idx}.description`)}
            />
            <Input
              type="number"
              placeholder="Unit Qty"
              {...register(`packages.${idx}.unit_quantity`)}
            />
            <Input
              type="number"
              placeholder="Selling Price"
              {...register(`packages.${idx}.selling_price`)}
            />
            <IconButton
              icon={<MinusIcon />}
              size="sm"
              onClick={() => remove(idx)}
            />
          </HStack>
        ))}

        <Button
          size="sm"
          leftIcon={<AddIcon />}
          onClick={() =>
            append({
              description: "",
              unit_quantity: "",
              selling_price: "",
            })
          }
        >
          Add Package
        </Button>
      </Box>

      <HStack mb={10}>
        <Button
          colorScheme={isEdit ? "orange" : "blue"}
          onClick={handleSubmit(onSubmit)}
          isLoading={loading}
        >
          {isEdit ? "Update Product" : "Save Product"}
        </Button>

        <Button variant="outline" onClick={clearForm}>
          Cancel
        </Button>
      </HStack>

      {/* ================= PRODUCT LIST ================= */}
      <Input
        placeholder="Search..."
        mb={4}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {tableLoading ? (
        <Flex justify="center" p={10}>
          <Spinner />
        </Flex>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Selling</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((p) => (
              <Tr key={p.product_id}>
                <Td>{p.product_code}</Td>
                <Td>
                  <Flex align="center" gap={2}>
                    {p.image_url && (
                      <Image
                        src={`${BACKEND_URL}${p.image_url}`}
                        boxSize="50px"
                        objectFit="cover"
                        borderRadius="md"
                      />
                    )}
                    {p.product_name}
                  </Flex>
                </Td>
                <Td>{p.category_name}</Td>
                <Td>{p.selling_price}</Td>
                <Td>
                  <Flex gap={2}>
                    <IconButton
                      icon={<EditIcon />}
                      size="sm"
                      onClick={() => handleEdit(p.product_id)}
                    />
                    <IconButton
                      icon={<CopyIcon />}
                      size="sm"
                      onClick={() => handleClone(p.product_id)}
                    />
                    <IconButton
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      onClick={() =>
                        api
                          .delete(`/products/${p.product_id}`)
                          .then(loadProducts)
                      }
                    />
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}
