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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Products() {
  const { user } = useAuth();
  const permissions = user?.permissions || {};
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm({
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
      storage: false,
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

  const [skuExists, setSkuExists] = useState(false);
  const [checkingSku, setCheckingSku] = useState(false);

  const [branches, setBranches] = useState([]);
  const [branchData, setBranchData] = useState([]);
  const storage = watch("storage");
  const canBeSold = watch("can_be_sold");
  const monitorStock = watch("monitor_stock");
  const sellingPrice = watch("selling_price");
  const costPrice = watch("cost_price");
  const minimumQty = watch("minimum_quantity");

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, search]);

  const loadBranches = async () => {
    const res = await api.get("/branches/public/enabled");
    setBranches(res.data);

    const defaultData = res.data.map((b) => ({
      branch_id: b.branch_id,
      branch_name: b.branch_name,
      selling_price: 0,
      quantity: 0,
      reserved_quantity: 0,
    }));

    setBranchData(defaultData);
  };

  const resetBranchData = () => {
    const resetdata = branches.map((b) => ({
      branch_id: b.branch_id,
      branch_name: b.branch_name,
      selling_price: Number(sellingPrice || 0),
      quantity: 0,
      reserved_quantity: 0,
    }));

    setBranchData(resetdata);
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (storage) {
      setValue("category", "Storage");
    } else {
      setValue("category", "");
    }
  }, [storage]);

  useEffect(() => {
    const total = branchData.reduce(
      (sum, b) => sum + Number(b.quantity || 0),
      0,
    );
    setValue("stock_quantity", total);
  }, [branchData]);

  useEffect(() => {
    setBranchData((prev) =>
      prev.map((b) => ({
        ...b,
        selling_price: Number(sellingPrice || 0),
      })),
    );
  }, [sellingPrice]);

  useEffect(() => {
    if (branches.length) {
      resetBranchData();
    }
  }, [branches]);

  useEffect(() => {
    if (!productCode) {
      setSkuExists(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingSku(true);

        const res = await api.get("/products/check-sku", {
          params: { product_code: productCode, editingId },
        });

        setSkuExists(res.data.exists);
      } catch {
        setSkuExists(false);
      } finally {
        setCheckingSku(false);
      }
    }, 500); //debounce typing

    return () => clearTimeout(timer);
  }, [productCode]);

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
      minimum_quantity: 0,
      stock_quantity: 0,
      monitor_stock: true,
      can_be_sold: true,
      storage: false,
      packages: [],
    });
    replace([]);
    setProductImage(null);
    setPreviewImage(null);
    setIsEdit(false);
    setEditingId(null);

    setProductImage(null);
    setPreviewImage(null);
    setIsEdit(false);
    setEditingId(null);

    setValue("storage", false);
    setValue("monitor_stock", true);
    setValue("can_be_sold", true);

    resetBranchData();
  };

  const handleEdit = async (id) => {
    const res = await api.get(`/products/${id}`);
    const product = res.data;

    const branchRes = await api.get(`/products/${id}/branches`);

    const merged = branches.map((b) => {
      const found = branchRes.data.find((x) => x.branch_id === b.branch_id);

      return (
        found || {
          branch_id: b.branch_id,
          branch_name: b.branch_name,
          selling_price: Number(product.selling_price || 0),
          quantity: 0,
          reserved_quantity: 0,
        }
      );
    });

    setBranchData(merged);

    reset({
      ...product,
      category: product.category_name || "",
      monitor_stock: !!product.monitor_stock,
      can_be_sold: !!product.can_be_sold,
      storage: !!product.storage,
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
      storage: !!product.storage,
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

    setImageDimensions(null);
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
    if (skuExists && !isEdit) {
      toast({
        title: "Duplicate SKU detected",
        status: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      Object.keys(data).forEach((key) => {
        if (key !== "packages") {
          formData.append(key, data[key]);
        }
      });

      formData.append("packages", JSON.stringify(data.packages || []));
      formData.append("branchData", JSON.stringify(branchData));
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
      resetBranchData();
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
        <FormControl isInvalid={skuExists}>
          <FormLabel>Product Code</FormLabel>
          <Input {...register("product_code")} isDisabled={isEdit} />
          {productCode && <Barcode value={productCode} />}

          {checkingSku && (
            <Text fontSize="xs" color="gray.500">
              Checking SKU...
            </Text>
          )}

          {skuExists && (
            <Text color="red.500" fontSize="sm">
              This SKU already exists
            </Text>
          )}
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
          <Input
            maxLength={20}
            {...register("pos_name", {
              required: "POS Name is required",
              maxLength: {
                value: 20,
                message: "POS Name cannot exceed 20 characters",
              },
            })}
          />
          {errors.pos_name && (
            <Text color="red.500" fontSize="sm">
              {errors.pos_name.message}
            </Text>
          )}
        </FormControl>

        <FormControl>
          <FormLabel>Category</FormLabel>
          <Input
            list="category-list"
            {...register("category")}
            isDisabled={storage}
          />
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
          <NumberInput
            value={costPrice || ""}
            onChange={(val) => setValue("cost_price", val)}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel>Selling Price</FormLabel>
          <NumberInput
            value={sellingPrice || ""}
            onChange={(val) => setValue("selling_price", val)}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel>Minimum Quantity</FormLabel>
          <NumberInput
            min={0}
            value={minimumQty || ""}
            onChange={(val) => setValue("minimum_quantity", val)}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
      </Grid>

      <Grid templateColumns="repeat(4, 1fr)" gap={6} mb={6}>
        <FormControl>
          <FormLabel>Stock Quantity</FormLabel>
          <Input type="number" {...register("stock_quantity")} isDisabled />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Monitor Stock</FormLabel>
          <Switch
            isChecked={!!monitorStock}
            onChange={(e) => setValue("monitor_stock", e.target.checked)}
          />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Can Be Sold</FormLabel>
          <Switch
            isChecked={!!canBeSold}
            onChange={(e) => setValue("can_be_sold", e.target.checked)}
          />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Storage</FormLabel>
          <Switch
            isChecked={!!storage}
            onChange={(e) => setValue("storage", e.target.checked)}
          />
        </FormControl>
      </Grid>

      {/* BRANCH PRODUCT DETAILS */}
      <Box mt={6}>
        <Text fontWeight="bold" mb={3}>
          Branch Product Details
        </Text>

        {/* HEADER ROW */}
        <Flex mb={2} gap={3} fontWeight="bold">
          <Text w="150px">Branch</Text>
          <Text flex="1">Selling Price</Text>
          <Text flex="1">Quantity</Text>
          <Text flex="1">Reserved Qty</Text>
        </Flex>

        {branches.map((branch, idx) => (
          <Flex key={branch.branch_id} mb={2} gap={3} align="center">
            <Text w="150px">{branch.branch_name}</Text>

            <NumberInput
              value={branchData[idx]?.selling_price ?? 0}
              onChange={(val) => {
                const updated = [...branchData];
                updated[idx].selling_price = Number(val);
                setBranchData(updated);
              }}
            >
              <NumberInputField placeholder="Selling Price" />
            </NumberInput>

            <NumberInput
              value={branchData[idx]?.quantity ?? 0}
              onChange={(val) => {
                const updated = [...branchData];
                updated[idx].quantity = Number(val);
                setBranchData(updated);
              }}
            >
              <NumberInputField placeholder="Quantity" />
            </NumberInput>

            <NumberInput
              value={branchData[idx]?.reserved_quantity ?? 0}
              isDisabled
            >
              <NumberInputField />
            </NumberInput>
          </Flex>
        ))}
      </Box>

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
      <Flex mb={4} justify="space-between" align="center" wrap="wrap" gap={3}>
        <Input
          placeholder="Search products..."
          w={{ base: "180px", md: "220px", lg: "240px" }}
          size="sm"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <Text fontWeight="bold" fontSize="md">
          Total Products: {total}
        </Text>
      </Flex>

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
      <Flex mt={6} justify="center" align="center" gap={4}>
        <Button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          isDisabled={page === 1}
        >
          Prev
        </Button>

        <Text>
          Page {page} of {totalPages}
        </Text>

        <Button
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          isDisabled={page === totalPages}
        >
          Next
        </Button>
      </Flex>
    </Box>
  );
}
