import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Grid,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { AttachmentIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";

import CustomerSearch from "../../src/components/storage/CustomerSearch";
import ProductSearch from "../../src/components/storage/ProductSearch";
import StorageItemTable from "../../src/components/storage/StorageItemTable";
import SignatureUpload from "../../src/components/storage/SignatureUpload";
import RecentStorageList from "../../src/components/storage/RecentStorageList";

import {
  confirmStorageBarcode,
  createStorage,
  getNextStorageNo,
  getRecentStorages,
  getStorageDetails,
  getStorageItems,
  getStoragePdfUrl,
  getStorageSpaces,
  getUserBranches,
  searchProductByBarcode,
} from "../../src/services/storageService";

export default function StoragePage() {
  const toast = useToast();
  const attachmentInputRef = useRef(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [branches, setBranches] = useState([]);
  const [storageSpaces, setStorageSpaces] = useState([]);
  const [recentStorages, setRecentStorages] = useState([]);

  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [branchId, setBranchId] = useState("");
  const [storageNo, setStorageNo] = useState("");
  const [storageSpaceProductId, setStorageSpaceProductId] = useState("");

  const [scanValue, setScanValue] = useState("");
  const [items, setItems] = useState([]);

  const [receivedNotes, setReceivedNotes] = useState("");
  const [staffSignature, setStaffSignature] = useState("");
  const [customerSignature, setCustomerSignature] = useState("");

  const [printBeforeArrival, setPrintBeforeArrival] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState(false);
  const [editingStorageId, setEditingStorageId] = useState(null);

  const [attachmentFile, setAttachmentFile] = useState(null);

  const [storagePeriod, setStoragePeriod] = useState(0);
  const [dischargeDate, setDischargeDate] = useState("");
  const [maxVisits, setMaxVisits] = useState(3);
  const [currentVisits] = useState(0);

  const locked = confirmationMode;

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    try {
      const [branchRes, spaceRes, recentRes] = await Promise.all([
        getUserBranches(),
        getStorageSpaces(),
        getRecentStorages(),
      ]);

      setBranches(branchRes.data || []);
      setStorageSpaces(spaceRes.data || []);
      setRecentStorages(recentRes.data || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to load storage page",
        status: "error",
      });
    }
  };

  useEffect(() => {
    if (!receivedDate || !storagePeriod) {
      setDischargeDate("");
      return;
    }

    const d = new Date(receivedDate);
    d.setMonth(d.getMonth() + Number(storagePeriod));

    setDischargeDate(d.toISOString().slice(0, 10));
  }, [storagePeriod, receivedDate]);

  const handleBranchChange = async (value) => {
    setBranchId(value);

    if (!value) {
      setStorageNo("");
      return;
    }

    try {
      const response = await getNextStorageNo(value);
      setStorageNo(response.data.storage_no);
    } catch (err) {
      console.error(err);
    }
  };

  const addProduct = (product) => {
    const existing = items.find((x) => x.product_id === product.product_id);

    if (existing) {
      setItems((prev) =>
        prev.map((row) =>
          row.product_id === product.product_id
            ? {
                ...row,
                quantity: Number(row.quantity || 0) + 1,
              }
            : row,
        ),
      );
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        ...product,
        quantity: 1,
        condition: "Good",
        item_notes: "",
      },
    ]);
  };

  const handleBarcodeInput = async (e) => {
    if (e.key !== "Enter") return;

    const code = scanValue.trim();

    if (!code) return;

    try {
      if (confirmationMode && editingStorageId) {
        await confirmStorageBarcode(editingStorageId, code);

        const detailRes = await getStorageDetails(editingStorageId);

        const grouped = {};

        (detailRes.data.storage_items || [])
          .filter((item) => Number(item.received_quantity || 0) > 0)
          .forEach((item) => {
            const key = item.product_id;

            if (!grouped[key]) {
              grouped[key] = {
                ...item,
                quantity: (detailRes.data.storage_items || []).filter(
                  (x) => x.product_id === item.product_id,
                ).length,
                received: 1,
              };
            } else {
              grouped[key].received += 1;
            }
          });

        setItems(Object.values(grouped));

        toast({
          title: "Barcode confirmed",
          status: "success",
        });

        if (detailRes.data.status === "ACTIVE") {
          setConfirmationMode(false);

          toast({
            title: "All items received. Storage is now ACTIVE.",
            status: "success",
          });

          loadPage();
        }
      } else {
        const response = await searchProductByBarcode(code);
        addProduct(response.data);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: err?.response?.data?.message || "Unable to process barcode",
        status: "error",
      });
    }

    setScanValue("");
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast({
        title: "Only ZIP files are allowed",
        status: "warning",
      });

      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }

      return;
    }

    setAttachmentFile(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const resetPage = () => {
    setSelectedCustomer(null);
    setBranchId("");
    setStorageNo("");
    setStorageSpaceProductId("");
    setMaxVisits(0);
    setDischargeDate("");
    setStoragePeriod(0);
    setItems([]);
    setReceivedNotes("");
    setStaffSignature("");
    setCustomerSignature("");
    setAttachmentFile(null);
    setPrintBeforeArrival(false);
    setConfirmationMode(false);
    setEditingStorageId(null);
    setScanValue("");

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleLoadPrintedStorage = async (storage) => {
    try {
      const response = await getStorageDetails(storage.storage_id);
      const data = response.data;

      setEditingStorageId(data.storage_id);
      setConfirmationMode(true);

      setSelectedCustomer(data.customer);
      setBranchId(String(data.branch_id));
      setStorageNo(data.storage_no);
      setStorageSpaceProductId(
        data.storage_space_product_id
          ? String(data.storage_space_product_id)
          : "",
      );
      setReceivedDate(data.received_date?.slice(0, 10) || "");

      setReceivedNotes(data.received_notes || "");
      setStaffSignature(data.staff_signature || "");
      setCustomerSignature(data.customer_signature || "");
      setPrintBeforeArrival(false);

      setAttachmentFile(
        data.attachment_filename
          ? {
              name: data.attachment_filename,
              existing: true,
              path: data.attachment_path,
            }
          : null,
      );

      const groupedItems = {};

      (data.storage_items || [])
        .filter((item) => Number(item.received_quantity || 0) > 0)
        .forEach((item) => {
          const key = item.product_id;

          if (!groupedItems[key]) {
            groupedItems[key] = {
              ...item,
              quantity: (data.storage_items || []).filter(
                (x) => x.product_id === item.product_id,
              ).length,
              received: 1,
            };
          } else {
            groupedItems[key].received += 1;
          }
        });

      setItems(Object.values(groupedItems));

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to load storage",
        status: "error",
      });
    }
  };

  const saveButtonText = useMemo(
    () => (confirmationMode ? "Update Storage" : "Save Storage"),
    [confirmationMode],
  );

  const handleSave = async () => {
    try {
      const payload = {
        customer_id: selectedCustomer?.id,
        branch_id: branchId,
        storage_space_product_id: storageSpaceProductId || null,
        received_date: receivedDate,
        received_notes: receivedNotes,
        staff_signature: staffSignature,
        customer_signature: customerSignature,
        items,
        preprinted: printBeforeArrival,
        storage_period_months: storagePeriod,
        max_monthly_visits: maxVisits,
        attachment: attachmentFile,
      };

      await createStorage(payload);

      toast({
        title: confirmationMode
          ? "Storage updated successfully"
          : "Storage saved successfully",
        status: "success",
      });

      resetPage();
      loadPage();
    } catch (err) {
      console.error(err);
      toast({
        title: err?.response?.data?.message || "Failed to save storage",
        status: "error",
      });
    }
  };

  return (
    <Box p={6}>
      <Heading mb={6}>Storage</Heading>

      <VStack spacing={6} align="stretch">
        <Card>
          <CardHeader>
            <Heading size="md">Customer Details</Heading>
          </CardHeader>
          <CardBody>
            <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
              <CustomerSearch
                value={selectedCustomer}
                onSelect={setSelectedCustomer}
                isDisabled={locked}
              />

              <Box borderWidth="1px" borderRadius="lg" p={4}>
                {selectedCustomer ? (
                  <VStack align="start" spacing={2}>
                    <Text>
                      <strong>Full Name:</strong> {selectedCustomer.fullname}
                    </Text>
                    <Text>
                      <strong>Email:</strong> {selectedCustomer.email || "-"}
                    </Text>
                    <Text>
                      <strong>Telephone:</strong>{" "}
                      {selectedCustomer.telephone || "-"}
                    </Text>
                    <Text>
                      <strong>Branch:</strong>{" "}
                      {selectedCustomer.branch_name || "-"}
                    </Text>
                  </VStack>
                ) : (
                  <Text color="gray.500">No customer selected</Text>
                )}
              </Box>
            </Grid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">Storage Details</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
              <Box>
                <Text mb={1}>Received Date</Text>
                <Input
                  type="date"
                  value={receivedDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  isDisabled={locked}
                />
              </Box>

              <Box>
                <Text mb={1}>Branch</Text>
                <Select
                  value={branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  placeholder="Select Branch"
                  isDisabled={locked}
                >
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.branch_name}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Text mb={1}>Storage No</Text>
                <Input value={storageNo} isReadOnly />
              </Box>

              <Box>
                <Text mb={1}>Storage Space</Text>
                <Select
                  value={storageSpaceProductId}
                  onChange={(e) => setStorageSpaceProductId(e.target.value)}
                  placeholder="Select Storage Space"
                  isDisabled={locked}
                >
                  {storageSpaces.map((space) => (
                    <option key={space.product_id} value={space.product_id}>
                      {space.product_name}
                    </option>
                  ))}
                </Select>
              </Box>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
              <Box>
                <Text mb={1}>Storage Period (Months)</Text>
                <Input
                  type="number"
                  value={storagePeriod}
                  onChange={(e) => setStoragePeriod(e.target.value)}
                  isDisabled={confirmationMode}
                />
              </Box>

              <Box>
                <Text mb={1}>Discharge Date</Text>
                <Input value={dischargeDate} isReadOnly />
              </Box>

              <Box>
                <Text mb={1}>Max. Monthly Visits</Text>
                <Input value={maxVisits} isReadOnly />
              </Box>

              <Box>
                <Text mb={1}>Current Visits</Text>
                <Input value={currentVisits} isReadOnly />
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">Product Selection</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text mb={1}>
                    {confirmationMode
                      ? "Scan Printed Barcode"
                      : "Scan Product Code"}
                  </Text>
                  <Input
                    placeholder={
                      confirmationMode
                        ? "Scan pre-printed barcode"
                        : "Scan product barcode"
                    }
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    onKeyDown={handleBarcodeInput}
                    autoFocus
                  />
                </Box>

                {!confirmationMode && (
                  <Box>
                    <Text mb={1}>Search Product Name</Text>
                    <ProductSearch onSelect={addProduct} />
                  </Box>
                )}
              </SimpleGrid>

              <StorageItemTable
                items={items}
                setItems={setItems}
                confirmationMode={confirmationMode}
              />

              <Box borderWidth="1px" borderRadius="lg" p={4}>
                <Text mb={2} fontWeight="medium">
                  Attach ZIP File
                </Text>

                <Input
                  type="file"
                  accept=".zip"
                  onChange={handleAttachmentChange}
                />

                {attachmentFile && (
                  <HStack mt={3} spacing={3}>
                    <AttachmentIcon color="green.500" />

                    <Text fontSize="sm" color="green.600">
                      {attachmentFile.name}
                    </Text>

                    <Button
                      size="xs"
                      colorScheme="red"
                      variant="outline"
                      onClick={handleRemoveAttachment}
                    >
                      Remove File
                    </Button>
                  </HStack>
                )}
              </Box>

              {!confirmationMode && (
                <Checkbox
                  isChecked={printBeforeArrival}
                  onChange={(e) => setPrintBeforeArrival(e.target.checked)}
                >
                  Print labels before arrival
                </Checkbox>
              )}
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">Received Process</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={5} align="stretch">
              <Box>
                <Text mb={1}>Received Notes</Text>
                <Textarea
                  value={receivedNotes}
                  onChange={(e) => setReceivedNotes(e.target.value)}
                  placeholder="Enter notes"
                />
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <SignatureUpload
                  label="Staff Signature"
                  value={staffSignature}
                  onChange={setStaffSignature}
                />

                <SignatureUpload
                  label="Customer Signature"
                  value={customerSignature}
                  onChange={setCustomerSignature}
                />
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        <HStack justify="flex-end">
          <Button variant="outline" onClick={resetPage}>
            Cancel
          </Button>

          <Button colorScheme="blue" onClick={handleSave}>
            {saveButtonText}
          </Button>
        </HStack>

        <RecentStorageList
          storages={recentStorages}
          onLoadPrinted={handleLoadPrintedStorage}
          onPrint={(storage) => {
            window.open(getStoragePdfUrl(storage.storage_id), "_blank");
          }}
          onPrintBarcodes={async (storage) => {
            try {
              const response = await getStorageItems(storage.storage_id);
              const { printStorageLabels } =
                await import("../../src/utils/printStorageLabels");

              printStorageLabels({
                items: response.data.items || [],
                business_name: "Storage King Limited",
              });
            } catch (err) {
              console.error(err);
              toast({
                title: "Failed to print barcode labels",
                status: "error",
              });
            }
          }}
        />
      </VStack>
    </Box>
  );
}
