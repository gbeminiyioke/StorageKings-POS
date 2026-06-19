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
  Checkbox,
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
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@chakra-ui/react";
import {
  ViewIcon,
  ViewOffIcon,
  EditIcon,
  DeleteIcon,
  CopyIcon,
  DownloadIcon,
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
    indemnity_agreement: null,
    warehouse_agreement: null,
    indemnity_agreement_locked: true,
    warehouse_agreement_locked: true,

    customer_id_image: null,
    alternate_id_image: null,
    signature_image: null,
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

  const [customerIdPreview, setCustomerIdPreview] = useState(null);
  const [alternateIdPreview, setAlternateIdPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  const [disableKycButton, setDisableKycButton] = useState(false);

  const [selectedKycId, setSelectedKycId] = useState(null);
  const [kycList, setKycList] = useState([]);
  const [isKycOpen, setIsKycOpen] = useState(false);

  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  const [kycApproval, setKycApproval] = useState({
    compliance_confirmed: false,
    kyc_verified_by: "",
    authorised_by: "",
    approved: true,
  });

  const [pendingPayload, setPendingPayload] = useState(null);

  const cancelRef = useRef();
  const indemnityRef = useRef(null);
  const warehouseRef = useRef(null);

  const loadCustomers = async () => {
    const res = await api.get(
      `/customers?search=${search}&page=${page}&limit=10`,
    );
    setCustomers(res.data.data);
    setTotal(res.data.total);
  };

  useEffect(() => {
    if (!editingId) {
      reset(defaultValues);
    }

    loadCustomers();
  }, [search, page]);

  const openKycModal = async () => {
    try {
      const res = await api.get("/customer-kyc/unconverted");
      setKycList(res.data);
      setIsKycOpen(true);
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Failed to load KYC records",
        status: "error",
      });
    }
  };

  const loadKyc = async (id) => {
    try {
      const res = await api.get(`/customer-kyc/${id}`);
      const kyc = res.data;

      setSelectedKycId(id);

      reset({
        ...defaultValues,

        fullname: kyc.full_name_company_name || "",
        email: kyc.email_address || "",
        customer_type: kyc.customer_type || "Individual",
        sex: kyc.sex || "",
        contact_name: kyc.contact_person || "",
        telephone: kyc.telephone_number || "",
        contact_telephone: kyc.alternate_telephone || "",
        address_1: kyc.residential_business_address || "",

        customer_id_image: kyc.customer_id_image,
        alternate_id_image: kyc.alternate_id_image,
        signature_image: kyc.client_signature,
        cac_document: kyc.cac_document,
      });

      const apiBase = (import.meta.env.VITE_API_URL || "").replace(
        /\/api\/?$/,
        "",
      );

      setCustomerIdPreview(
        kyc.customer_id_image
          ? `${apiBase}/${kyc.customer_id_image.replace(/\\/g, "/")}`
          : null,
      );

      setAlternateIdPreview(
        kyc.alternate_id_image
          ? `${apiBase}/${kyc.alternate_id_image.replace(/\\/g, "/")}`
          : null,
      );

      setSignaturePreview(
        kyc.client_signature
          ? `${apiBase}/${kyc.client_signature.replace(/\\/g, "/")}`
          : null,
      );
      /*
      if (kyc.cac_document) {
        setPdfPreview(`${apiBase}/${kyc.cac_document.replace(/\\/g, "/")}`);
      }
*/
      setIsKycOpen(false);

      toast({
        title: "KYC loaded successfully",
        status: "success",
      });
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Failed to load KYC",
        status: "error",
      });
    }
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value || 0);
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const clearAgreementFields = () => {
    reset(defaultValues);
    setEditingId(null);
    setValue("indemnity_agreement_locked", true);
    setValue("warehouse_agreement_locked", true);
    setValue("indemnity_agreement", null);
    setValue("warehouse_agreement", null);

    setCustomerIdPreview(null);
    setAlternateIdPreview(null);
    setSignaturePreview(null);
    setSelectedKycId(null);
    setDisableKycButton(false);

    if (indemnityRef.current) {
      indemnityRef.current.value = "";
    }

    if (warehouseRef.current) {
      warehouseRef.current.value = "";
    }
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
    SAVE HANDLER
  =======================================*/
  const saveCustomerFromKyc = async () => {
    try {
      setLoading(true);

      pendingPayload.append("kyc_approval", JSON.stringify(kycApproval));

      const res = await api.post("/customers", pendingPayload);

      toast({
        title: "Customer created successfully",
        status: "success",
      });

      setIsApprovalOpen(false);
      clearAgreementFields();
      loadCustomers();
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Save failed",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
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

      const payload = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          payload.append(key, value);
        }
      });

      payload.set(
        "current_balance",

        parseFloat(data.current_balance?.toString().replace(/,/g, "") || 0),
      );

      if (editingId) {
        payload.delete("password");
        payload.delete("confirmPassword");

        await api.put(`/customers/${editingId}`, payload);

        toast({
          title: "Customer updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        payload.append("kyc_id", selectedKycId);
        payload.append("from_kyc", !!selectedKycId);

        if (selectedKycId) {
          setPendingPayload(payload);
          setIsApprovalOpen(true);
          return;
        }

        await api.post("/customers", payload);

        toast({
          title: "Customer created successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      //reset(defaultValues);
      //setEditingId(null);
      clearAgreementFields();
      loadCustomers();
      setDisableKycButton(false);
      setSelectedKycId(null);
    } catch (err) {
      if (err.response?.data?.message === "CUSTOMER_NAME_EXISTS") {
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
    setDisableKycButton(true);

    //const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/api$/, "");

    const apiBase = (import.meta.env.VITE_API_URL || "").replace(
      /\/api\/?$/,
      "",
    );

    setCustomerIdPreview(
      customer.customer_id_image
        ? `${apiBase}/${customer.customer_id_image.replace(/\\/g, "/")}`
        : null,
    );

    setAlternateIdPreview(
      customer.alternate_id_image
        ? `${apiBase}/${customer.alternate_id_image.replace(/\\/g, "/")}`
        : null,
    );

    setSignaturePreview(
      customer.signature_image
        ? `${apiBase}/${customer.signature_image.replace(/\\/g, "/")}`
        : null,
    );

    reset({
      ...customer,

      indemnity_agreement: customer.indemnity_agreement,
      warehouse_agreement: customer.warehouse_agreement,
      password: "",
      confirmPassword: "",
    });
  };

  /*===================================
    CANCEL BUTTON
  =====================================*/
  const handleCancel = () => {
    //reset(defaultValues);
    //setEditingId(null);
    clearAgreementFields();
    setDisableKycButton(false);
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
    setDisableKycButton(true);
  };

  /*====================================
    DELETE
  ======================================*/
  const handleDelete = (id) => {
    //clearAgreementFields();
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

  const handleDownload = async (id, type) => {
    try {
      const response = await api.get(`/customers/${id}/download-${type}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({
        title: "Download failed",
        status: "error",
      });
    }
  };

  return (
    <Box p={{ base: 3, md: 6 }}>
      {/* ========== FORM ========== */}
      <Box bg="white" p={{ base: 4, md: 6 }} rounded="md" shadow="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid
            templateColumns={{
              base: "1fr",
              lg: customerType === "Individual" ? "2fr 1fr 1fr" : "2fr 2fr",
            }}
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

          <Grid
            templateColumns={{
              base: "1fr",
              lg: "2fr 1fr 1fr",
            }}
            gap={4}
          >
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

          <Grid
            templateColumns={{
              base: "1fr",
              md: "1fr 1fr",
            }}
            gap={4}
          >
            <FormControl>
              <FormLabel>Address 1</FormLabel>
              <Input {...register("address_1")} />
            </FormControl>

            <FormControl>
              <FormLabel>Address 2</FormLabel>
              <Input {...register("address_2")} />
            </FormControl>
          </Grid>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "1fr 1fr",
            }}
            gap={4}
          >
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

          <Grid
            templateColumns={{
              base: "1fr",
              md: "1fr 1fr",
            }}
            gap={4}
          >
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
            <Grid
              templateColumns={{
                base: "1fr",
                md: "1fr 1fr",
              }}
              gap={4}
            >
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
          <Grid
            templateColumns={{
              base: "1fr",
              md: "1fr 1fr",
            }}
            gap={4}
          >
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

          <Grid
            templateColumns={{
              base: "1fr",
              md: "1fr 1fr",
            }}
            gap={4}
          >
            <FormControl>
              <FormLabel>Whatsapp</FormLabel>
              <Input {...register("whatsapp")} />
            </FormControl>

            <FormControl>
              <FormLabel>Instagram</FormLabel>
              <Input {...register("ig")} />
            </FormControl>
          </Grid>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "1fr 1fr",
            }}
            gap={4}
          >
            <FormControl>
              <FormLabel>Facebook</FormLabel>
              <Input {...register("facebook")} />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Enable</FormLabel>
              <Switch {...register("enable")} />
            </FormControl>
          </Grid>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "1fr 1fr",
            }}
            gap={4}
          >
            <FormControl>
              <FormLabel>Indemnity Agreement (PDF)</FormLabel>

              <Flex direction="column" gap={2}>
                <Input
                  ref={indemnityRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setValue("indemnity_agreement", e.target.files[0])
                  }
                />

                {editingId &&
                  watch("indemnity_agreement") &&
                  typeof watch("indemnity_agreement") === "string" && (
                    <Flex align="center" gap={2}>
                      <Text fontSize="sm" color="gray.600">
                        Existing file:
                        {watch("indemnity_agreement").split("/").pop()}
                      </Text>

                      <Tooltip label="Download file">
                        <IconButton
                          size="sm"
                          icon={<DownloadIcon />}
                          colorScheme="blue"
                          onClick={() => handleDownload(editingId, "indemnity")}
                        />
                      </Tooltip>
                    </Flex>
                  )}
              </Flex>
            </FormControl>

            <FormControl>
              <FormLabel>Warehouse Agreement (PDF)</FormLabel>

              <Flex direction="column" gap={2}>
                <Input
                  ref={warehouseRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setValue("warehouse_agreement", e.target.files[0])
                  }
                />

                {editingId &&
                  watch("warehouse_agreement") &&
                  typeof watch("warehouse_agreement") === "string" && (
                    <Flex align="center" gap={2}>
                      <Text fontSize="sm" color="gray.600">
                        Existing file:
                        {watch("warehouse_agreement").split("/").pop()}
                      </Text>

                      <Tooltip label="Download file">
                        <IconButton
                          size="sm"
                          icon={<DownloadIcon />}
                          colorScheme="blue"
                          onClick={() => handleDownload(editingId, "warehouse")}
                        />
                      </Tooltip>
                    </Flex>
                  )}
              </Flex>
            </FormControl>
            {/*
            <FormControl mt={8}>
              <Checkbox {...register("indemnity_agreement_locked")}>
                Lock Indemnity Agreement
              </Checkbox>
            </FormControl>
*/}
          </Grid>

          {/*
          <Grid templateColumns="2fr 1fr" gap={4} mt={4}>

            <FormControl mt={8}>
              <Checkbox {...register("warehouse_agreement_locked")}>
                Lock Warehouse Agreement
              </Checkbox>
            </FormControl>

          </Grid>
*/}

          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2,1fr)",
              lg: "repeat(3,1fr)",
            }}
            gap={4}
          >
            {/* CUSTOMER ID */}
            <FormControl>
              <FormLabel>Customer ID</FormLabel>

              <Box
                border="2px dashed #CBD5E0"
                rounded="md"
                h="180px"
                cursor="pointer"
                overflow="hidden"
                position="relative"
                onClick={() =>
                  document.getElementById("customer_id_image").click()
                }
              >
                {customerIdPreview ? (
                  <img
                    src={customerIdPreview}
                    alt="Customer ID"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Flex h="100%" align="center" justify="center">
                    <Text>Select Customer ID</Text>
                  </Flex>
                )}
              </Box>

              <Input
                id="customer_id_image"
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];

                  if (file) {
                    setValue("customer_id_image", file);
                    setCustomerIdPreview(URL.createObjectURL(file));
                  }
                }}
              />

              {customerIdPreview && (
                <Button
                  mt={2}
                  size="sm"
                  colorScheme="red"
                  onClick={() => {
                    setCustomerIdPreview(null);
                    setValue("customer_id_image", null);
                  }}
                >
                  Remove Image
                </Button>
              )}
            </FormControl>

            {/* ALTERNATE ID */}
            <FormControl>
              <FormLabel>Alternate ID</FormLabel>

              <Box
                border="2px dashed #CBD5E0"
                rounded="md"
                h="180px"
                cursor="pointer"
                overflow="hidden"
                onClick={() =>
                  document.getElementById("alternate_id_image").click()
                }
              >
                {alternateIdPreview ? (
                  <img
                    src={alternateIdPreview}
                    alt="Alternate ID"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Flex h="100%" align="center" justify="center">
                    <Text>Select Alternate ID</Text>
                  </Flex>
                )}
              </Box>

              <Input
                id="alternate_id_image"
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];

                  if (file) {
                    setValue("alternate_id_image", file);
                    setAlternateIdPreview(URL.createObjectURL(file));
                  }
                }}
              />

              {alternateIdPreview && (
                <Button
                  mt={2}
                  size="sm"
                  colorScheme="red"
                  onClick={() => {
                    setAlternateIdPreview(null);
                    setValue("alternate_id_image", null);
                  }}
                >
                  Remove Image
                </Button>
              )}
            </FormControl>

            {/* SIGNATURE */}
            <FormControl>
              <FormLabel>Signature</FormLabel>

              <Box
                border="2px dashed #CBD5E0"
                rounded="md"
                h="180px"
                cursor="pointer"
                overflow="hidden"
                onClick={() =>
                  document.getElementById("signature_image").click()
                }
              >
                {signaturePreview ? (
                  <Flex
                    w="100%"
                    h="100%"
                    align="center"
                    justify="center"
                    bg="white"
                  >
                    <img
                      src={signaturePreview}
                      alt="Signature"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Flex>
                ) : (
                  <Flex h="100%" align="center" justify="center">
                    <Text>Select Signature</Text>
                  </Flex>
                )}
              </Box>

              <Input
                id="signature_image"
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];

                  if (file) {
                    setValue("signature_image", file);
                    setSignaturePreview(URL.createObjectURL(file));
                  }
                }}
              />

              {signaturePreview && (
                <Button
                  mt={2}
                  size="sm"
                  colorScheme="red"
                  onClick={() => {
                    setSignaturePreview(null);
                    setValue("signature_image", null);
                  }}
                >
                  Remove Image
                </Button>
              )}
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
              colorScheme="purple"
              onClick={openKycModal}
              isDisabled={disableKycButton}
            >
              Create from Customer KYC
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
      <Flex
        mt={8}
        justify="space-between"
        direction={{ base: "column", md: "row" }}
        gap={3}
      >
        <Input
          placeholder="Search by name, customer type or telephone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          w={{ base: "100%", md: "300px" }}
        />
        <Text>Total: {total}</Text>
      </Flex>

      {/* =========== TABLE =========== */}
      <Box overflowX="auto">
        <Table size="sm">
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
                      <Tooltip label="Edit Customer">
                        <IconButton
                          icon={<EditIcon />}
                          size="sm"
                          mr={2}
                          onClick={() => handleEdit(c)}
                        />
                      </Tooltip>

                      <Tooltip label="Clone Customer">
                        <IconButton
                          icon={<CopyIcon />}
                          size="sm"
                          mr={2}
                          onClick={() => handleClone(c)}
                        />
                      </Tooltip>
                    </>
                  )}

                  {hasPermission("can_delete") && (
                    <Tooltip label="Delete Customer">
                      <IconButton
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDelete(c.id)}
                      />
                    </Tooltip>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

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
      <Flex
        mt={4}
        gap={2}
        justify="center"
        direction={{ base: "column", md: "row" }}
      >
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </Button>

        <Button disabled={page * 10 >= total} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </Flex>

      <Modal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} size="5xl">
        <ModalOverlay />

        <ModalContent>
          <ModalHeader>Select Customer KYC</ModalHeader>

          <ModalCloseButton />

          <ModalBody>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Telephone</Th>
                </Tr>
              </Thead>

              <Tbody>
                {kycList.map((item) => (
                  <Tr
                    key={item.id}
                    cursor="pointer"
                    _hover={{
                      bg: "gray.100",
                    }}
                    onDoubleClick={() => loadKyc(item.id)}
                  >
                    <Td>{item.id}</Td>

                    <Td>{item.email_address}</Td>

                    <Td>{item.full_name_company_name}</Td>

                    <Td>{item.telephone_number}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ModalBody>

          <ModalFooter>
            <Button onClick={() => setIsKycOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isApprovalOpen} onClose={() => setIsApprovalOpen(false)}>
        <ModalOverlay />

        <ModalContent>
          <ModalHeader>KYC Approval</ModalHeader>

          <ModalCloseButton />

          <ModalBody>
            <Checkbox
              isChecked={kycApproval.compliance_confirmed}
              onChange={(e) =>
                setKycApproval({
                  ...kycApproval,
                  compliance_confirmed: e.target.checked,
                })
              }
            >
              Compliance Confirmed
            </Checkbox>

            <FormControl mt={4}>
              <FormLabel>KYC Verified By</FormLabel>

              <Input
                value={kycApproval.kyc_verified_by}
                onChange={(e) =>
                  setKycApproval({
                    ...kycApproval,
                    kyc_verified_by: e.target.value,
                  })
                }
              />
            </FormControl>

            <FormControl mt={4}>
              <FormLabel>Authorised By</FormLabel>

              <Input
                value={kycApproval.authorised_by}
                onChange={(e) =>
                  setKycApproval({
                    ...kycApproval,
                    authorised_by: e.target.value,
                  })
                }
              />
            </FormControl>

            <Checkbox
              mt={4}
              isChecked={kycApproval.approved}
              onChange={(e) =>
                setKycApproval({
                  ...kycApproval,
                  approved: e.target.checked,
                })
              }
            >
              Approved
            </Checkbox>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={() => setIsApprovalOpen(false)}>
              Cancel
            </Button>

            <Button
              colorScheme="blue"
              onClick={saveCustomerFromKyc}
              isLoading={loading}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
