import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Grid,
  Input,
  Select,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Switch,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Text,
  IconButton,
  Spinner,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, CopyIcon, AddIcon } from "@chakra-ui/icons";
import { FaPrint } from "react-icons/fa";
import { useForm } from "react-hook-form";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { generateSupplierPdf } from "../services/supplierPdf.service";

export default function Suppliers() {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const defaultValues = {
    supplier_name: "",
    supplier_type: "Coporate",
    sex: "",
    telephone: "",
    address_1: "",
    address_2: "",
    address_3: "",
    fax: "",
    email: "",
    website: "",
    contact_name: "",
    contact_telephone: "",
    current_balance: "",
    payment_terms: "",
    whatsapp: "",
    ig: "",
    facebook: "",
    next_of_kin: "",
    next_of_kin_telephone: "",
    image_url: "",
    enable: true,
  };

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues,
  });

  const supplierType = watch("supplier_type", "Coporate");

  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState("");

  const cancelRef = useRef();

  const loadSuppliers = async () => {
    const res = await api.get(
      `/suppliers?search=${search}&page=${page}&limit=10`,
    );
    setSuppliers(res.data.data);
    setTotal(res.data.total);
  };
  /*
  useEffect(() => {
    loadSuppliers();
  }, [search, page]);
*/

  useEffect(() => {
    if (!editingId) {
      reset(defaultValues);
    }

    loadSuppliers();
  }, [search, page]);

  const formatCurrency = (value) => {
    const number = parseFloat(value || 0);
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      const base64 = reader.result;
      setImagePreview(base64);
      setValue("image_url", base64);
    };

    reader.readAsDataURL(file);
  };

  /*=====================================
    SAVE / UPDATE
  =======================================*/
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        current_balance: parseFloat(
          data.current_balance?.toString().replace(/,/g, "") || 0,
        ),
      };

      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);

        toast({
          title: "Supplier updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        await api.post("/suppliers", payload);

        toast({
          title: "Supplier created successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      reset(defaultValues);
      setEditingId(null);

      setImagePreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      loadSuppliers();
    } catch (err) {
      if (err.response?.data?.message === " SUPPLIER_NAME_EXISTS") {
        setError("supplier_name", {
          type: "manual",
          message: "Supplier name already exists",
        });
      } else {
        toast({
          title: err.response?.data?.message || "Error saving supplier",
          status: "error",
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /*===================================
    EDIT
  =====================================*/
  const handleEdit = (supplier) => {
    setEditingId(supplier.id);
    setImagePreview(supplier.image_url || "");
    reset(supplier);
  };

  /*===================================
    CANCEL BUTTON
  =====================================*/
  const handleCancel = () => {
    reset(defaultValues);
    setEditingId(null);
    setImagePreview("");
  };

  /*====================================
    CLONE/COPY
  ======================================*/
  const handleClone = (supplier) => {
    const clone = { ...supplier };
    delete clone.id;
    clone.supplier_name = `${supplier.supplier_name} (Copy)`;

    reset(clone);
    setEditingId(null);
    setImagePreview(clone.image_url || "");
  };

  /*====================================
    DELETE
  ======================================*/
  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);

      await api.delete(`/suppliers/${deleteId}`);

      toast({
        title: "Supplier deleted successfully",
        status: "success",
        duration: 3000,
      });

      //AUTO CLEAR IF DELETING EDITED SUPPLIER
      if (editingId === deleteId) {
        reset(defaultValues);
        setEditingId(null);
      }

      loadSuppliers();
    } catch (err) {
      toast({
        title:
          err.response?.data?.message ||
          "Cannot delete supplier with transactions",
        status: "error",
      });
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  return (
    <Box p={6}>
      {/* ========== FORM ========== */}
      <Box bg="white" p={6} rounded="md" shadow="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid
            templateColumns={
              supplierType === "Individual" ? "2fr 1fr 1fr" : "2fr 2fr"
            }
            gap={4}
          >
            <FormControl isInvalid={errors.supplier_name} isRequired>
              <FormLabel>Supplier Name</FormLabel>
              <Input {...register("supplier_name", { required: true })} />
              <FormErrorMessage>Supplier name is required</FormErrorMessage>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Supplier Type</FormLabel>
              <Select {...register("supplier_type", { required: true })}>
                <option value="Coporate">Coporate</option>
                <option value="Individual">Individual</option>
              </Select>
            </FormControl>

            {supplierType === "Individual" && (
              <FormControl isInvalid={errors.sex} isRequired>
                <FormLabel>Sex</FormLabel>
                <Select {...register("sex", { required: true })}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Select>
                <FormErrorMessage>Sex is required</FormErrorMessage>
              </FormControl>
            )}
          </Grid>

          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl>
              <FormLabel>Address 1</FormLabel>
              <Input {...register("address_1")} />
            </FormControl>

            <FormControl>
              <FormLabel>Address 2</FormLabel>
              <Input {...register("address_2")} />
            </FormControl>
          </Grid>

          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl>
              <FormLabel>Address 3</FormLabel>
              <Input {...register("address_3")} />
            </FormControl>

            <FormControl isInvalid={errors.telephone} isRequired>
              <FormLabel>Telephone</FormLabel>
              <Input {...register("telephone", { required: true })} />
              <FormErrorMessage>Telephone required</FormErrorMessage>
            </FormControl>
          </Grid>

          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl>
              <FormLabel>Fax</FormLabel>
              <Input {...register("fax")} />
            </FormControl>

            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input type="email" {...register("email")} />
            </FormControl>
          </Grid>

          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl>
              <FormLabel>Website</FormLabel>
              <Input {...register("website")} />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Enable</FormLabel>
              <Switch {...register("enable")} />
            </FormControl>
          </Grid>

          {/* ====== COPORATE ONLY ======= */}
          {supplierType === "Coporate" && (
            <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
              <FormControl isRequired>
                <FormLabel>Contact Name</FormLabel>
                <Input {...register("contact_name", { required: true })} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Contact Telephone</FormLabel>
                <Input {...register("contact_telephone", { required: true })} />
              </FormControl>
            </Grid>
          )}

          {/* ====== CURRENT BALANCE ====== */}
          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl>
              <FormLabel>Current Balance</FormLabel>
              <Input
                type="text"
                {...register("current_balance")}
                onBlur={(e) =>
                  setValue("current_balance", formatCurrency(e.target.value))
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel>Payment Terms</FormLabel>
              <Input type="number" {...register("payment_terms")} />
            </FormControl>
          </Grid>

          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl>
              <FormLabel>Whatsapp</FormLabel>
              <Input {...register("whatsapp")} />
            </FormControl>

            <FormControl>
              <FormLabel>Instagram</FormLabel>
              <Input {...register("ig")} />
            </FormControl>
          </Grid>

          <Grid templateColumns="1fr 1fr" gap={4} mt={4} alignItems="start">
            <Box>
              <FormControl>
                <FormLabel>Facebook</FormLabel>
                <Input {...register("facebook")} />
              </FormControl>

              <FormControl mt={4}>
                <FormLabel>Next Of Kin</FormLabel>
                <Input {...register("next_of_kin")} />
              </FormControl>

              <FormControl mt={4}>
                <FormLabel>Next Of Kin Telephone</FormLabel>
                <Input {...register("next_of_kin_telephone")} />
              </FormControl>
            </Box>

            <Flex
              border="1px dashed"
              borderColor="gray.300"
              borderRadius="md"
              minH="220px"
              cursor="pointer"
              bg="gray.50"
              onClick={() => fileInputRef.current?.click()}
              _hover={{ borderColor: "blue.400", bg: "blue.50" }}
              align="center"
              justify="center"
              p={3}
              overflow="hidden"
            >
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImageSelect}
              />

              {imagePreview ? (
                <Flex direction="column" align="center" w="100%" gap={3}>
                  <Box
                    as="img"
                    src={imagePreview}
                    alt="Supplier"
                    maxW="100%"
                    maxH="200px"
                    objectFit="contain"
                  />

                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview("");
                      setValue("image_url", "");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Remove Image
                  </Button>
                </Flex>
              ) : (
                <Flex direction="column" align="center" color="gray.500">
                  <AddIcon mb={2} />
                  <Text fontSize="sm" textAlign="center">
                    Click to supplier ID
                  </Text>
                </Flex>
              )}
            </Flex>
          </Grid>

          <Flex mt={6} gap={3}>
            <Button
              colorScheme="blue"
              type="submit"
              isDisabled={loading}
              leftIcon={loading && <Spinner size="sm" />}
            >
              {editingId ? "Update Supplier" : "Save Supplier"}
            </Button>

            <Button
              variant="outline"
              onClick={handleCancel}
              isDisabled={loading}
            >
              Cancel
            </Button>
          </Flex>
        </form>
      </Box>

      {/* =============== SEARCH ================= */}
      <Flex mt={8} justify="space-between">
        <Input
          placeholder="Search by name, supplier type or telephone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          w="300px"
        />
        <Text>Total: {total}</Text>
      </Flex>

      {/* =========== TABLE =========== */}
      <Table mt={4}>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Address</Th>
            <Th>Type</Th>
            <Th>Telephone</Th>
            <Th>Enable</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>

        <Tbody>
          {suppliers.map((s) => (
            <Tr key={s.id}>
              <Td>{s.supplier_name}</Td>
              <Td>{s.address_1}</Td>
              <Td>{s.supplier_type}</Td>
              <Td>{s.telephone}</Td>
              <Td>{s.enable ? "Yes" : "No"}</Td>
              <Td>
                {hasPermission("can_edit") && (
                  <>
                    <IconButton
                      icon={<EditIcon />}
                      size="sm"
                      mr={2}
                      onClick={() => handleEdit(s)}
                    />
                    <IconButton
                      icon={<CopyIcon />}
                      size="sm"
                      mr={2}
                      onClick={() => handleClone(s)}
                    />
                  </>
                )}

                {hasPermission("can_delete") && (
                  <IconButton
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDelete(s.id)}
                  />
                )}

                {hasPermission("can_view") && (
                  <IconButton
                    icon={<FaPrint />}
                    size="sm"
                    ml={2}
                    colorScheme="blue"
                    variant="outline"
                    aria-label="Print Supplier"
                    onClick={() => generateSupplierPdf(s)}
                  />
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <AlertDialog
        isOpen={deleteId !== null}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteId(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Confirm Delete</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this supplier?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setDeleteId(null)}>
                Cancel
              </Button>

              <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={loading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* =========== PAGINATION =========== */}
      <Flex mt={4} gap={2}>
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </Button>

        <Button disabled={page * 10 >= total} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </Flex>
    </Box>
  );
}
