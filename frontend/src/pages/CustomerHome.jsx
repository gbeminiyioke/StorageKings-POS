import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Text,
  Button,
  Collapse,
  IconButton,
  Flex,
  VStack,
  Input,
  useToast,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Tooltip,
  HStack,
  FormControl,
  FormLabel,
  Spacer,
  Alert,
  AlertIcon,
  useDisclosure,
  Grid,
  GridItem,
  Select,
  Image,
} from "@chakra-ui/react";
import {
  FiAlignJustify,
  FiDownload,
  FiBookOpen,
  FiTrash2,
  FiLogOut,
  FiCheckCircle,
} from "react-icons/fi";
import { DownloadIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function CustomerHome() {
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [storedItems, setStoredItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [profile, setProfile] = useState({});
  const [notifications, setNotifications] = useState([]);

  const [expandedStorage, setExpandedStorage] = useState(null);
  const [storageDetails, setStorageDetails] = useState({});

  const [saving, setSaving] = useState(false);
  const [visitSubmitting, setVisitSubmitting] = useState(false);

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState("");

  const [overdueInvoices, setOverdueInvoices] = useState([]);

  const {
    isOpen: isInvoiceOpen,
    onOpen: onInvoiceOpen,
    onClose: onInvoiceClose,
  } = useDisclosure();

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [visitForm, setVisitForm] = useState({
    fullname: "",
    telephone: "",
    visit_date: "",
    visitors_name: "",
    visitors_telephone: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [customerImagePreview, setCustomerImagePreview] = useState("");
  const [indemnityFileName, setIndemnityFileName] = useState("");
  const [warehouseFileName, setWarehouseFileName] = useState("");

  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    loadData();

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/", {
        replace: true,
      });
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await api.get("/customers/portal/summary");

      setStoredItems(res.data.storedItems || []);
      setTransactions(res.data.transactions || []);
      setNotifications(res.data.notifications || []);
      setProfile(res.data.profile || {});
      setOverdueInvoices(res.data.overdueInvoices || []);
    } catch (err) {
      toast({
        title: "Failed to load portal",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.get("/inventory/customer/notifications");

      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStorage = async (storageId) => {
    if (expandedStorage === storageId) {
      setExpandedStorage(null);
      return;
    }

    setExpandedStorage(storageId);

    if (!storageDetails[storageId]) {
      const res = await api.get(`/customers/portal/storage/${storageId}/items`);

      setStorageDetails((prev) => ({
        ...prev,
        [storageId]: res.data,
      }));
    }
  };

  const handleDownload = async (storageId) => {
    const yes = window.confirm(
      "Do you want to download the attachment zip file?",
    );

    if (!yes) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const response = await api.get(
        `/customers/portal/storage/${storageId}/download`,
        {
          responseType: "blob",

          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );

              setDownloadProgress(percent);
            }
          },
        },
      );

      /* ==================================
       GET FILE NAME
    ================================== */
      let filename = "attachment.zip";

      const disposition = response.headers["content-disposition"];

      if (disposition) {
        const match = disposition.match(/filename="?(.+)"?/);

        if (match?.[1]) {
          filename = match[1];
        }
      }

      setDownloadFileName(filename);

      /* ==================================
       DOWNLOAD FILE
    ================================== */
      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Download completed",
        status: "success",
      });
    } catch (err) {
      console.error(err);

      toast({
        title: err.response?.data?.message || "Failed to download attachment",
        status: "error",
      });
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    }
  };

  const updateProfile = async () => {
    try {
      setSaving(true);

      const formData = new FormData();

      Object.keys(profile).forEach((key) => {
        if (profile[key] !== undefined && profile[key] !== null) {
          formData.append(key, profile[key]);
        }
      });

      await api.put("/customers/portal/profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "Profile updated successfully",
        status: "success",
      });

      setEditMode(false);
      setTabIndex(3);
      loadData();
    } catch (err) {
      toast({
        title: "Failed to update profile",
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    try {
      /* =========================
       CLEAR AUTH DATA
    ========================= */

      localStorage.removeItem("token");
      localStorage.removeItem("loginType");
      localStorage.removeItem("roleId");
      localStorage.removeItem("roleName");
      localStorage.removeItem("permissions");
      localStorage.removeItem("defaultPage");
      localStorage.removeItem("name");

      sessionStorage.clear();

      /* =========================
       PREVENT BACK NAVIGATION
    ========================= */

      window.history.pushState(null, "", window.location.href);

      window.onpopstate = function () {
        window.history.go(1);
      };

      /* =========================
       REDIRECT
    ========================= */

      navigate("/login", {
        replace: true,
      });
    } catch (err) {
      console.error(err);

      toast({
        title: "Logout failed",
        status: "error",
      });
    }
  };

  if (loading) {
    return (
      <Flex justify="center" py={20}>
        <Spinner size="xl" />
      </Flex>
    );
  }

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const submitVisitRequest = async () => {
    try {
      setVisitSubmitting(true);

      if (
        !visitForm.fullname ||
        !visitForm.telephone ||
        !visitForm.visit_date ||
        !visitForm.visitors_name ||
        !visitForm.visitors_telephone
      ) {
        toast({
          title: "All fields are required",
          status: "error",
        });

        setVisitSubmitting(false);

        return;
      }

      await api.post("/customers/portal/request-visit", {
        storage_id: selectedStorage.storage_id,
        fullname: visitForm.fullname,
        telephone: visitForm.telephone,
        visit_date: visitForm.visit_date,
        visitors_name: visitForm.visitors_name,
        visitors_telephone: visitForm.visitors_telephone,
      });

      toast({
        title: "Visit request submitted successfully",
        status: "success",
      });

      setVisitModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);

      toast({
        title: err.response?.data?.message || "Failed to submit request",
        status: "error",
      });
    } finally {
      setVisitSubmitting(false);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.put(`/customers/portal/notifications/${id}/delete`);

      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));

      toast({
        title: "Notification removed",
        status: "success",
      });
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Failed to remove notification",

        status: "error",
      });
    }
  };

  const handleViewStorageForm = async (storageId) => {
    try {
      const response = await api.get(
        `/customers/portal/storage/${storageId}/view-form`,
        {
          responseType: "blob",
        },
      );

      const file = new Blob([response.data], {
        type: "application/pdf",
      });

      const fileURL = URL.createObjectURL(file);

      window.open(fileURL, "_blank");
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Failed to open storage form",
        status: "error",
      });
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.put(`/customers/portal/notifications/${notificationId}/read`);

      /* =========================
       UPDATE LOCAL STATE
    ========================== */

      setNotifications((prev) =>
        prev.map((item) =>
          item.notification_id === notificationId
            ? {
                ...item,
                is_read: true,
              }
            : item,
        ),
      );

      toast({
        title: "Notification marked as read",
        status: "success",
      });
    } catch (err) {
      console.error(err);

      toast({
        title: err.response?.data?.message || "Failed to update notification",
        status: "error",
      });
    }
  };

  return (
    <Box p={6}>
      {/* =========================
        HEADER
    ========================== */}
      <Flex mb={6} align="center">
        <Text fontSize="2xl" fontWeight="bold">
          Customer Portal
        </Text>

        <Spacer />

        <Button
          leftIcon={<FiLogOut />}
          colorScheme="blue"
          variant="outline"
          size="sm"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Flex>

      {overdueInvoices.length > 0 && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          You have <strong>{overdueInvoices.length}</strong> overdue invoice(s).
        </Alert>
      )}
      {/*
      <Box mb={6}>
        {overdueInvoices.map((invoice) => (
          <Box
            key={invoice.invoice_no}
            p={3}
            borderWidth="1px"
            borderRadius="md"
            mb={2}
          >
            <Text fontWeight="bold">{invoice.invoice_no}</Text>

            <Text>
              Balance: ₦{Number(invoice.balance_due).toLocaleString()}
            </Text>

            <Text>Due: {formatDate(invoice.due_date)}</Text>
          </Box>
        ))}
      </Box>
*/}
      <Tabs variant="enclosed" index={tabIndex} onChange={setTabIndex}>
        <TabList>
          <Tab>My Stored Items</Tab>
          <Tab>Transactions</Tab>
          <Tab>Overdue Invoices</Tab>
          <Tab>Profile</Tab>
        </TabList>

        <TabPanels>
          {/* =====================================
              STORED ITEMS
          ===================================== */}
          <TabPanel>
            <Table size="sm" variant="striped">
              <Thead>
                <Tr>
                  <Th></Th>
                  <Th>Storage No</Th>
                  <Th>Branch</Th>
                  <Th>Storage Space</Th>
                  <Th>Received Date</Th>
                  <Th>Status</Th>
                  <Th>No of Items</Th>
                  <Th>Discharge Date</Th>
                  <Th>Expiry Countdown</Th>
                  <Th>Visits</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>

              <Tbody>
                {storedItems.map((item) => (
                  <React.Fragment key={item.storage_id}>
                    <Tr>
                      <Td>
                        <IconButton
                          size="sm"
                          icon={
                            expandedStorage === item.storage_id ? (
                              <ChevronUpIcon />
                            ) : (
                              <ChevronDownIcon />
                            )
                          }
                          onClick={() => toggleStorage(item.storage_id)}
                        />
                      </Td>
                      <Td fontWeight="bold">{item.storage_no}</Td>
                      <Td>{item.branch_name}</Td>
                      <Td>{item.storage_space}</Td>
                      <Td>{formatDate(item.received_date)}</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            item.status === "ACTIVE" ? "green" : "red"
                          }
                        >
                          {item.status}
                        </Badge>
                      </Td>
                      <Td>{item.total_items}</Td>
                      <Td>{formatDate(item.discharge_date)}</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            Number(item.days_remaining) < 7
                              ? "red"
                              : Number(item.days_remaining) < 30
                                ? "orange"
                                : "green"
                          }
                        >
                          {item.days_remaining} days
                        </Badge>
                      </Td>
                      <Td>
                        <VStack spacing={1} align="start">
                          <Text>
                            {item.current_visits || 0}/
                            {item.max_monthly_visits || 0}
                          </Text>

                          {item.quota_exhausted && (
                            <Badge colorScheme="red">Quota Exhausted</Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          {/*==========================
                            REQUEST VISIT
                          ============================= */}
                          <Tooltip label="Request Visit to Storage Unit">
                            <span>
                              <IconButton
                                size="sm"
                                icon={<FiAlignJustify />}
                                colorScheme="orange"
                                isDisabled={
                                  Number(item.current_visits || 0) >=
                                    Number(item.max_monthly_visits || 0) ||
                                  item.has_pending_visit_request
                                }
                                onClick={() => {
                                  /* ============================
                                  CHECK STORAGE EXPIRY
                                  ============================ */

                                  if (
                                    item.discharge_date &&
                                    new Date(item.discharge_date) < new Date()
                                  ) {
                                    toast({
                                      title: "Storage has expired",
                                      status: "error",
                                    });

                                    return;
                                  }

                                  setSelectedStorage(item);
                                  setVisitForm({
                                    fullname: profile.fullname || "",
                                    telephone: profile.telephone || "",
                                    visit_date: "",
                                    visitors_name: "",
                                    visitors_telephone: "",
                                  });
                                  setVisitModalOpen(true);
                                }}
                              />
                            </span>
                          </Tooltip>

                          {/*==========================
                            DOWNLOAD ZIP
                          ============================= */}
                          <Tooltip label="Download zipped file">
                            <span>
                              <IconButton
                                size="sm"
                                icon={<FiDownload />}
                                colorScheme="blue"
                                isDisabled={!item.attachment_path}
                                onClick={() => handleDownload(item.storage_id)}
                              />
                            </span>
                          </Tooltip>

                          {/*==========================
                            VIEW STORAGE FORM
                          ============================= */}
                          <Tooltip label="View storage form">
                            <span>
                              <IconButton
                                size="sm"
                                icon={<FiBookOpen />}
                                colorScheme="green"
                                isDisabled={["PRINTED", "REJECTED"].includes(
                                  String(item.status).toUpperCase(),
                                )}
                                onClick={() => {
                                  handleViewStorageForm(item.storage_id);
                                }}
                              />
                            </span>
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>

                    <Tr>
                      <Td colSpan={10} p={0}>
                        <Collapse in={expandedStorage === item.storage_id}>
                          <Box p={4} bg="gray.50">
                            <Table size="sm" variant="simple">
                              <Thead>
                                <Tr>
                                  <Th>Item Name</Th>
                                  <Th>Condition</Th>
                                  <Th>Received Qty</Th>
                                  <Th>Discharged Qty</Th>
                                  <Th>Remaining Qty</Th>
                                  <Th>Generated Barcode</Th>
                                </Tr>
                              </Thead>

                              <Tbody>
                                {(storageDetails[item.storage_id] || []).map(
                                  (detail) => (
                                    <Tr key={detail.storage_item_id}>
                                      <Td>{detail.product_name}</Td>
                                      <Td>{detail.condition}</Td>
                                      <Td>{detail.quantity}</Td>
                                      <Td>{detail.retrieved_quantity}</Td>
                                      <Td>{detail.remaining_quantity}</Td>
                                      <Td fontFamily="mono">
                                        {detail.generated_barcode}
                                      </Td>
                                    </Tr>
                                  ),
                                )}
                              </Tbody>
                            </Table>
                          </Box>
                        </Collapse>
                      </Td>
                    </Tr>
                  </React.Fragment>
                ))}
              </Tbody>
            </Table>

            <Box mt={10}>
              <Text fontWeight="bold" fontSize="lg" mb={4}>
                Notifications
              </Text>

              {notifications.map((n) => (
                <Flex
                  key={n.notification_id}
                  p={4}
                  borderWidth="1px"
                  borderRadius="md"
                  bg={n.is_read ? "gray.50" : "blue.50"}
                  opacity={n.is_read ? 0.8 : 1}
                  mb={3}
                  justify="space-between"
                  align="center"
                >
                  <Box>
                    <Text fontWeight="medium">{n.message}</Text>
                    <Text fontSize="sm" color="gray.500">
                      {formatDate(n.created_at)}
                    </Text>
                  </Box>

                  <HStack spacing={2}>
                    {/* =========================
                    MARK AS READ
                    ========================== */}
                    {!n.is_read && (
                      <Tooltip label="Mark as Read">
                        <IconButton
                          icon={<FiCheckCircle />}
                          colorScheme="green"
                          size="sm"
                          onClick={() =>
                            markNotificationAsRead(n.notification_id)
                          }
                        />
                      </Tooltip>
                    )}

                    {/* =========================
                    DELETE REJECTED
                    ========================== */}
                    {n.notification_type === "VISIT_REJECTED" && (
                      <Tooltip label="Delete notification">
                        <IconButton
                          icon={<FiTrash2 />}
                          colorScheme="red"
                          size="sm"
                          onClick={() => deleteNotification(n.notification_id)}
                        />
                      </Tooltip>
                    )}
                  </HStack>
                </Flex>
              ))}
            </Box>
          </TabPanel>

          {/* =====================================
              TRANSACTIONS
          ===================================== */}
          <TabPanel>
            <Table size="sm" variant="striped">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Reference</Th>
                  <Th>Branch</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>

              <Tbody>
                {transactions.map((txn, index) => (
                  <Tr key={index}>
                    <Td>{new Date(txn.created_at).toLocaleString()}</Td>
                    <Td>
                      <Badge colorScheme="blue">{txn.transaction_type}</Badge>
                    </Td>
                    <Td>{txn.reference_no}</Td>
                    <Td>{txn.branch_name}</Td>
                    <Td>₦{Number(txn.amount).toLocaleString()}</Td>
                    <Td>{txn.status}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>

          {/*======================================
            OVERDUE INVOICES
          ======================================*/}
          <TabPanel>
            {overdueInvoices.length === 0 ? (
              <Text>No overdue invoices</Text>
            ) : (
              <Table size="sm" variant="striped">
                <Thead>
                  <Tr>
                    <Th>Invoice No</Th>
                    <Th>Balance Due</Th>
                    <Th>Due Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {overdueInvoices.map((invoice) => (
                    <Tr key={invoice.sale_id}>
                      <Td>{invoice.invoice_no}</Td>
                      <Td>₦{Number(invoice.balance_due).toLocaleString()}</Td>
                      <Td>{formatDate(invoice.due_date)}</Td>
                      <Td>
                        <HStack>
                          {/* ===================
                          VIEW
                          ==================== */}
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={() => {
                              setSelectedInvoice(invoice);

                              onInvoiceOpen();
                            }}
                          >
                            View Invoice
                          </Button>

                          {/* ===================                    DOWNLOAD
                          ==================== */}
                          <IconButton
                            size="sm"
                            colorScheme="green"
                            icon={<FiDownload />}
                            onClick={async () => {
                              try {
                                const res = await api.get(
                                  `/pos/invoice-pdf/${invoice.sale_id}`,
                                  {
                                    responseType: "blob",
                                  },
                                );

                                const url = window.URL.createObjectURL(
                                  new Blob([res.data]),
                                );

                                const link = document.createElement("a");
                                link.href = url;
                                link.setAttribute(
                                  "download",
                                  `${invoice.invoice_no}.pdf`,
                                );
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              } catch (err) {
                                console.error(err);

                                toast({
                                  title: "Download failed",
                                  status: "error",
                                });
                              }
                            }}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </TabPanel>

          {/* =====================================
              PROFILE
          ===================================== */}
          <TabPanel>
            <Box maxW="1200px" mx="auto">
              <Grid
                templateColumns="
        repeat(2, 1fr)
      "
                gap={6}
              >
                {/* =========================
                CUSTOMER NAME
                ========================== */}

                <GridItem>
                  <FormControl isRequired>
                    <FormLabel>Customer Name</FormLabel>

                    <Input value={profile.fullname || ""} isReadOnly />
                  </FormControl>
                </GridItem>

                {/* =========================
                EMAIL
                ========================== */}

                <GridItem>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>

                    <Input value={profile.email || ""} isReadOnly />
                  </FormControl>
                </GridItem>

                {/* =========================
                CUSTOMER TYPE
                ========================== */}

                <GridItem>
                  <FormControl isRequired>
                    <FormLabel>Customer Type</FormLabel>

                    <HStack>
                      <Select
                        value={profile.customer_type || ""}
                        isDisabled={!editMode}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            customer_type: e.target.value,
                          })
                        }
                      >
                        <option value="">Select</option>

                        <option value="Individual">Individual</option>

                        <option value="Coporate">Coporate</option>
                      </Select>

                      {profile.customer_type === "Individual" && (
                        <Select
                          value={profile.sex || ""}
                          isDisabled={!editMode}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              sex: e.target.value,
                            })
                          }
                        >
                          <option value="">Sex</option>

                          <option value="Male">Male</option>

                          <option value="Female">Female</option>
                        </Select>
                      )}
                    </HStack>
                  </FormControl>
                </GridItem>

                {/* =========================
                TELEPHONE
                ========================== */}

                <GridItem>
                  <FormControl isRequired>
                    <FormLabel>Telephone</FormLabel>

                    <Input
                      value={profile.telephone || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          telephone: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>

                {/* =========================
                ADDRESS 1
                ========================== */}

                <GridItem>
                  <FormControl>
                    <FormLabel>Address 1</FormLabel>

                    <Input
                      value={profile.address_1 || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address_1: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>

                {/* =========================
                ADDRESS 2
                ========================== */}
                <GridItem>
                  <FormControl>
                    <FormLabel>Address 2</FormLabel>

                    <Input
                      value={profile.address_2 || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address_2: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>

                {/* =========================
                ADDRESS 3
                ========================== */}
                <GridItem>
                  <FormControl>
                    <FormLabel>Address 3</FormLabel>

                    <Input
                      value={profile.address_3 || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address_3: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>

                {/* CURRENT BALANCE */}
                <GridItem>
                  <FormControl>
                    <FormLabel>Current Balance</FormLabel>

                    <Input value={profile.current_balance || 0} isReadOnly />
                  </FormControl>
                </GridItem>

                {/* =========================
                FAX
                ========================== */}
                <GridItem>
                  <FormControl>
                    <FormLabel>Fax</FormLabel>

                    <Input
                      value={profile.fax || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          fax: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>

                {/* =========================
                WEBSITE
                ========================== */}
                <GridItem>
                  <FormControl>
                    <FormLabel>Website</FormLabel>

                    <Input
                      value={profile.website || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          website: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>

                {/* =========================
                WHATSAPP
                ========================== */}
                <GridItem>
                  <FormControl>
                    <FormLabel>Whatsapp</FormLabel>

                    <Input
                      value={profile.whatsapp || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          whatsapp: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>

                {/* =========================
                INSTAGRAM
                ========================== */}
                <GridItem>
                  <FormControl>
                    <FormLabel>Instagram</FormLabel>

                    <Input
                      value={profile.ig || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          ig: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>

                {/* =========================
                FACEBOOK
                ========================== */}
                <GridItem>
                  <FormControl>
                    <FormLabel>Facebook</FormLabel>

                    <Input
                      value={profile.facebook || ""}
                      isReadOnly={!editMode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          facebook: e.target.value,
                        })
                      }
                    />
                  </FormControl>
                </GridItem>
              </Grid>

              {/* =========================
              CURRENT BALANCE
              ========================== */}
              {/*
              <Box mt={6}>
                <FormControl>
                  <FormLabel>Current Balance</FormLabel>

                  <Input value={profile.current_balance || 0} isReadOnly />
                </FormControl>
              </Box>
*/}
              {/* =========================
              AGREEMENTS
              ========================== */}

              <Grid
                mt={8}
                templateColumns="
        repeat(2, 1fr)
      "
                gap={6}
              >
                {/* =====================
                INDEMNITY
                ====================== */}

                <GridItem>
                  <FormControl>
                    <FormLabel>Indemnity Agreement</FormLabel>

                    <HStack>
                      <Input
                        value={
                          indemnityFileName ||
                          profile.indemnity_agreement?.split("/").pop() ||
                          ""
                        }
                        isReadOnly
                      />

                      <Button
                        as="label"
                        htmlFor="indemnity"
                        isDisabled={
                          !editMode || profile.indemnity_agreement_locked
                        }
                      >
                        Select
                      </Button>

                      {profile.indemnity_agreement && (
                        <IconButton
                          size="sm"
                          isDisabled={!editMode}
                          colorScheme="blue"
                          icon={<FiDownload />}
                          onClick={() => {
                            window.open(
                              `${import.meta.env.VITE_API_URL}/customers/${profile.id}/download-indemnity?token=${localStorage.getItem("token")}`,
                              "_blank",
                            );
                          }}
                        />
                      )}

                      {profile.indemnity_agreement &&
                        editMode &&
                        !profile.indemnity_agreement_locked && (
                          <IconButton
                            size="sm"
                            colorScheme="red"
                            icon={<FiTrash2 />}
                            onClick={() => {
                              setProfile({
                                ...profile,

                                indemnity_agreement: null,

                                remove_indemnity_agreement: true,
                              });

                              setIndemnityFileName("");
                            }}
                          />
                        )}

                      <Input
                        id="indemnity"
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];

                          if (file) {
                            setIndemnityFileName(file.name);

                            setProfile({
                              ...profile,
                              indemnity_agreement_file: file,
                            });
                          }
                        }}
                      />
                    </HStack>
                  </FormControl>
                </GridItem>

                {/* Repeat same pattern for warehouse agreement */}
                {/*========================================
                  WAREHOUSE
                ===========================================*/}
                <GridItem>
                  <FormControl>
                    <FormLabel>Warehouse Agreement</FormLabel>

                    <HStack>
                      <Input
                        value={
                          indemnityFileName ||
                          profile.warehouse_agreement?.split("/").pop() ||
                          ""
                        }
                        isReadOnly
                      />

                      <Button
                        as="label"
                        htmlFor="warehouse"
                        isDisabled={
                          !editMode || profile.warehouse_agreement_locked
                        }
                      >
                        Select
                      </Button>

                      {profile.warehouse_agreement && (
                        <IconButton
                          size="sm"
                          isDisabled={!editMode}
                          colorScheme="blue"
                          icon={<FiDownload />}
                          onClick={() => {
                            window.open(
                              `${import.meta.env.VITE_API_URL}/customers/${profile.id}/download-warehouse?token=${localStorage.getItem("token")}`,
                              "_blank",
                            );
                          }}
                        />
                      )}

                      {profile.warehouse_agreement &&
                        editMode &&
                        !profile.warehouse_agreement_locked && (
                          <IconButton
                            size="sm"
                            colorScheme="red"
                            icon={<FiTrash2 />}
                            onClick={() => {
                              setProfile({
                                ...profile,

                                warehouse_agreement: null,

                                remove_warehouse_agreement: true,
                              });

                              setWarehouseFileName("");
                            }}
                          />
                        )}

                      <Input
                        id="warehouse"
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];

                          if (file) {
                            setWarehouseFileName(file.name);

                            setProfile({
                              ...profile,
                              warehouse_agreement_file: file,
                            });
                          }
                        }}
                      />
                    </HStack>
                  </FormControl>
                </GridItem>
              </Grid>

              {/* =========================
              CUSTOMER ID IMAGE
              ========================== */}
              <Box mt={8}>
                <FormLabel>Customer ID</FormLabel>

                <Input
                  id="customer-id-upload"
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={!editMode}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCustomerImagePreview(URL.createObjectURL(file));
                    setProfile({
                      ...profile,
                      customer_id_image: file,
                    });
                  }}
                />

                <Box
                  w="300px"
                  h="220px"
                  borderWidth="2px"
                  borderStyle="dashed"
                  borderColor="gray.300"
                  borderRadius="lg"
                  overflow="hidden"
                  cursor={editMode ? "pointer" : "default"}
                  position="relative"
                  onClick={() => {
                    if (!editMode) return;

                    document.getElementById("customer-id-upload")?.click();
                  }}
                  _hover={
                    editMode
                      ? {
                          borderColor: "blue.400",
                        }
                      : {}
                  }
                >
                  {customerImagePreview || profile.customer_id_image ? (
                    <Image
                      src={
                        customerImagePreview ||
                        `${import.meta.env.VITE_API_URL}/${profile.customer_id_image}`
                      }
                      w="100%"
                      h="100%"
                      objectFit="contain"
                      bg="gray.100"
                    />
                  ) : (
                    <Flex
                      h="100%"
                      align="center"
                      justify="center"
                      direction="column"
                      color="gray.500"
                    >
                      <Text fontSize="lg">Click to Upload ID</Text>

                      <Text fontSize="sm">JPG / PNG</Text>
                    </Flex>
                  )}

                  {editMode && (
                    <Box
                      position="absolute"
                      bottom="0"
                      w="100%"
                      bg="rgba(0,0,0,0.5)"
                      color="white"
                      py={2}
                      textAlign="center"
                      fontSize="sm"
                    >
                      Click to Change Image
                    </Box>
                  )}
                </Box>
              </Box>

              {/* =========================
              BUTTONS
              ========================== */}

              <HStack mt={10}>
                {!editMode ? (
                  <Button colorScheme="blue" onClick={() => setEditMode(true)}>
                    Edit Details
                  </Button>
                ) : (
                  <>
                    <Button
                      colorScheme="green"
                      isLoading={saving}
                      onClick={updateProfile}
                    >
                      Update Details
                    </Button>

                    <Button
                      onClick={async () => {
                        setEditMode(false);
                        await loadData();
                        setTabIndex(3);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </HStack>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal
        isOpen={isDownloading}
        onClose={() => {}}
        closeOnOverlayClick={false}
        isCentered
      >
        <ModalOverlay />

        <ModalContent>
          <ModalHeader>Downloading Attachment</ModalHeader>

          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm">
                {downloadFileName || "Preparing download..."}
              </Text>

              <Progress
                value={downloadProgress}
                size="lg"
                borderRadius="md"
                hasStripe
                isAnimated
              />

              <Text textAlign="center" fontWeight="bold">
                {downloadProgress}%
              </Text>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Text fontSize="sm" color="gray.500">
              Please wait...
            </Text>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/*==============================================
        VISIT REQUEST MODAL
      =================================================*/}
      <Modal
        isOpen={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        isCentered
      >
        <ModalOverlay />

        <ModalContent>
          <ModalHeader>Request Storage Visit</ModalHeader>

          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Storage No.</FormLabel>

                <Input
                  value={selectedStorage?.storage_no || ""}
                  isReadOnly
                  placeholder="Storage No"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Branch</FormLabel>

                <Input
                  value={selectedStorage?.branch_name || ""}
                  isReadOnly
                  placeholder="Branch"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Storage</FormLabel>

                <Input
                  value={selectedStorage?.storage_space || ""}
                  isReadOnly
                />
              </FormControl>

              <FormControl>
                <FormLabel>Customer Name</FormLabel>

                <Input
                  value={visitForm.fullname}
                  isReadOnly
                  onChange={(e) =>
                    setVisitForm({
                      ...visitForm,
                      fullname: e.target.value,
                    })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Telephone</FormLabel>

                <Input
                  value={visitForm.telephone}
                  isReadOnly
                  onChange={(e) =>
                    setVisitForm({
                      ...visitForm,
                      telephone: e.target.value,
                    })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Visit Date</FormLabel>

                <Input
                  type="date"
                  value={visitForm.visit_date}
                  onChange={(e) =>
                    setVisitForm({
                      ...visitForm,
                      visit_date: e.target.value,
                    })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Visitor's Name</FormLabel>

                <Input
                  value={visitForm.visitors_name}
                  onChange={(e) =>
                    setVisitForm({
                      ...visitForm,
                      visitors_name: e.target.value,
                    })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Visitor's Telephone</FormLabel>

                <Input
                  placeholder="Visitor's Telephone"
                  value={visitForm.visitors_telephone}
                  onChange={(e) =>
                    setVisitForm({
                      ...visitForm,
                      visitors_telephone: e.target.value,
                    })
                  }
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={() => setVisitModalOpen(false)}>
              Cancel
            </Button>

            <Button
              colorScheme="blue"
              onClick={submitVisitRequest}
              isLoading={visitSubmitting}
            >
              Save Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/*=====================================
        INVOICE MODAL
      ========================================*/}
      <Modal isOpen={isInvoiceOpen} onClose={onInvoiceClose} size="6xl">
        <ModalOverlay />

        <ModalContent h="90vh">
          <ModalHeader>Invoice Preview</ModalHeader>

          <ModalCloseButton />

          <ModalBody p={0}>
            {selectedInvoice && (
              <iframe
                title="Invoice PDF"
                src={`${import.meta.env.VITE_API_URL}/pos/invoice-pdf/${selectedInvoice.sale_id}?token=${localStorage.getItem("token")}`}
                width="100%"
                height="100%"
                style={{
                  border: "none",
                }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
