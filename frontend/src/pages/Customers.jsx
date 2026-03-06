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
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import {
  ViewIcon,
  ViewOffIcon,
  EditIcon,
  DeleteIcon,
  CopyIcon,
} from "@chakra-ui/icons";
import { useForm } from "react-hook-form";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function Customers() {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const defaultValues = {
    fullname: "",
    customer_type: "Coporate",
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
    enable: true,
    password: "",
    confirmPassword: "",
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

  const customerType = watch("customer_type", "Coporate");

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [capsLockConfirm, setCapsLockConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const cancelRef = useRef();

  const loadCustomers = async () => {
    const res = await api.get(
      `/customers?search=${search}&page=${page}&limit=10`,
    );
    setCustomers(res.data.data);
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

    loadCustomers();
  }, [search, page]);

  const formatCurrency = (value) => {
    const number = parseFloat(value || 0);
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  /*===================================
    VAIDATION
  =====================================*/
  const validateForm = (data) => {
    if (!editingId) {
      if (!data.password) return "Password is required";
      if (data.password !== data.confirmPassword)
        return "Passwords do not match";
    }

    return null;
  };

  /*=====================================
    SAVE / UPDATE
  =======================================*/
  const onSubmit = async (data) => {
    const error = validateForm(data);
    if (error) {
      toast({ title: error, status: "error" });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...data,
        current_balance: parseFloat(
          data.current_balance?.toString().replace(/,/g, "") || 0,
        ),
      };

      if (editingId) {
        delete payload.password;
        delete payload.confirmPassword;
        await api.put(`/customers/${editingId}`, payload);

        toast({
          title: "Customer updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        await api.post("/customers", payload);

        toast({
          title: "Customer created successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      reset(defaultValues);
      setEditingId(null);
      loadCustomers();
    } catch (err) {
      if (err.response?.data?.message === " CUSTOMER_NAME_EXISTS") {
        setError("fullname", {
          type: "manual",
          message: "Customer name already exists",
        });
      }

      if (err.response?.data?.message === "EMAIL_EXISTS") {
        setError("email", {
          type: "manual",
          message: "Email already exists",
        });
        return;
      }

      toast({
        title: err.response?.data?.message || "Error saving customer",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  /*===================================
    EDIT
  =====================================*/
  const handleEdit = (customer) => {
    setEditingId(customer.id);
    reset({
      ...customer,
      password: "",
      confirmPassword: "",
    });
  };

  /*===================================
    CANCEL BUTTON
  =====================================*/
  const handleCancel = () => {
    reset(defaultValues);
    setEditingId(null);
  };

  /*====================================
    CLONE/COPY
  ======================================*/
  const handleClone = (customer) => {
    const clone = { ...customer };
    delete clone.id;
    clone.fullname = `${customer.fullname} (Copy)`;

    clone.password = "";
    clone.confirmPassword = "";

    reset(clone);
    setEditingId(null);
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

      await api.delete(`/customers/${deleteId}`);

      toast({
        title: "Customer deleted successfully",
        status: "success",
        duration: 3000,
      });

      //AUTO CLEAR IF DELETING EDITED CUSTOMER
      if (editingId === deleteId) {
        reset(defaultValues);
        setEditingId(null);
      }

      loadCustomers();
    } catch (err) {
      toast({
        title:
          err.response?.data?.message ||
          "Cannot delete customer with transactions",
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
              customerType === "Individual" ? "2fr 1fr 1fr" : "2fr 2fr"
            }
            gap={4}
          >
            <FormControl isInvalid={errors.fullname} isRequired>
              <FormLabel>Customer Name</FormLabel>
              <Input {...register("fullname", { required: true })} />
              <FormErrorMessage>Customer name is required</FormErrorMessage>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Customer Type</FormLabel>
              <Select {...register("customer_type", { required: true })}>
                <option value="Coporate">Coporate</option>
                <option value="Individual">Individual</option>
              </Select>
            </FormControl>

            {customerType === "Individual" && (
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

          <Grid templateColumns="2fr 1fr 1fr" gap={4} mt={4}>
            <FormControl isInvalid={errors.email} isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" {...register("email")} />
              <FormErrorMessage>
                {errors.email && errors.email.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  isDisabled={!!editingId}
                  {...register("password")}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>
              {capsLock && <Text color="red.500"> CapsLock is ON</Text>}
            </FormControl>

            <FormControl>
              <FormLabel>Confirm Password</FormLabel>
              <InputGroup>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  isDisabled={!!editingId}
                  {...register("confirmPassword")}
                  onKeyUp={(e) =>
                    setCapsLockConfirm(e.getModifierState("CapsLock"))
                  }
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                </InputRightElement>
              </InputGroup>
              {capsLockConfirm && (
                <Text color="red.500" fontSize="sm">
                  CapsLock is ON
                </Text>
              )}
            </FormControl>
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
              <FormLabel>Website</FormLabel>
              <Input {...register("website")} />
            </FormControl>
          </Grid>

          {/* ====== COPORATE ONLY ======= */}
          {customerType === "Coporate" && (
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
                isDisabled={editingId !== null}
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

          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl>
              <FormLabel>Facebook</FormLabel>
              <Input {...register("facebook")} />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Enable</FormLabel>
              <Switch {...register("enable")} />
            </FormControl>
          </Grid>

          <Flex mt={6} gap={3}>
            <Button
              colorScheme="blue"
              type="submit"
              isDisabled={loading}
              leftIcon={loading && <Spinner size="sm" />}
            >
              {editingId ? "Update Customer" : "Save Customer"}
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
          placeholder="Search by name, customer type or telephone"
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
          {customers.map((c) => (
            <Tr key={c.id}>
              <Td>{c.fullname}</Td>
              <Td>{c.address_1}</Td>
              <Td>{c.customer_type}</Td>
              <Td>{c.telephone}</Td>
              <Td>{c.enable ? "Yes" : "No"}</Td>
              <Td>
                {hasPermission("can_edit") && (
                  <>
                    <IconButton
                      icon={<EditIcon />}
                      size="sm"
                      mr={2}
                      onClick={() => handleEdit(c)}
                    />
                    <IconButton
                      icon={<CopyIcon />}
                      size="sm"
                      mr={2}
                      onClick={() => handleClone(c)}
                    />
                  </>
                )}

                {hasPermission("can_delete") && (
                  <IconButton
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDelete(c.id)}
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
              Are you sure you want to delete this customer?
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
