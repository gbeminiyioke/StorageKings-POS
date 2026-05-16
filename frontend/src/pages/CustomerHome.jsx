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
  Tooltip,
  HStack,
} from "@chakra-ui/react";
import {
  FiAlignJustify,
  FiDownload,
  FiBookOpen,
  FiTrash2,
} from "react-icons/fi";
import { DownloadIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import api from "../api/api";
//import { formToJSON } from "axios";

export default function CustomerHome() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);

  const [storedItems, setStoredItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [profile, setProfile] = useState({});
  const [notifications, setNotifications] = useState([]);

  const [expandedStorage, setExpandedStorage] = useState(null);
  const [storageDetails, setStorageDetails] = useState({});

  const [saving, setSaving] = useState(false);

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState("");

  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [visitForm, setVisitForm] = useState({
    fullname: "",
    telephone: "",
    visit_date: "",
    visitors_name: "",
    visitors_telephone: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await api.get("/customers/portal/summary");

      setStoredItems(res.data.storedItems || []);
      setTransactions(res.data.transactions || []);
      setNotifications(res.data.notifications || []);
      setProfile(res.data.profile || {});
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

      await api.put("/customers/portal/profile", profile);

      toast({
        title: "Profile updated successfully",
        status: "success",
      });
    } catch (err) {
      toast({
        title: "Failed to update profile",
        status: "error",
      });
    } finally {
      setSaving(false);
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
      await api.post("/customers/portal/request-visit", {
        storage_id: selectedStorage.storage_id,
        visit_date: visitForm.visit_date,
        visitors_name: visitForm.visitors_name,
        visitors_telephone: visitForm.visitors_telephone,
        fullname: visitForm.fullname,
        telephone: visitForm.telephone,
      });

      toast({
        title: "Visit request submitted successfully",
        status: "success",
      });

      setVisitModalOpen(false);
      loadData();
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Failed to submit request",
        status: "error",
      });
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

  return (
    <Box p={6}>
      <Tabs variant="enclosed">
        <TabList>
          <Tab>My Stored Items</Tab>
          <Tab>Transactions</Tab>
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
                        {item.current_visits || 0}/
                        {item.max_monthly_visits || 0}
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
                                  window.open(
                                    `${import.meta.env.VITE_API_URL}/api/customers/portal/storage/${item.storage_id}/view-form`,
                                    "_blank",
                                  );
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

                  {n.notification_type === "VISIT_REJECTED" && (
                    <Tooltip label="Delete notification">
                      <IconButton
                        icon={<FiTrash2 />}
                        colorScheme="red"
                        onClick={() => deleteNotification(n.notification_id)}
                      />
                    </Tooltip>
                  )}
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

          {/* =====================================
              PROFILE
          ===================================== */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Input
                placeholder="Fullname"
                value={profile.fullname || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    fullname: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Email"
                value={profile.email || ""}
                isReadOnly
              />

              <Input
                placeholder="Telephone"
                value={profile.telephone || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    telephone: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Whatsapp"
                value={profile.whatsapp || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    whatsapp: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Instagram"
                value={profile.ig || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    ig: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Facebook"
                value={profile.facebook || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    facebook: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Address 1"
                value={profile.address_1 || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address_1: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Address 2"
                value={profile.address_2 || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address_2: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Address 3"
                value={profile.address_3 || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address_3: e.target.value,
                  })
                }
              />

              <Button
                colorScheme="blue"
                onClick={updateProfile}
                isLoading={saving}
              >
                Update Profile
              </Button>
            </VStack>
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
    </Box>
  );
}
