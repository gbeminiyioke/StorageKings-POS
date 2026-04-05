import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
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
import { useEffect, useState } from "react";
import CustomerSearch from "../components/storage/CustomerSearch";
import ProductSearch from "../components/storage/ProductSearch";
import StorageItemTable from "../components/storage/StorageItemTable";
import SignatureUpload from "../components/storage/SignatureUpload";
import RecentStorageList from "../components/storage/RecentStorageList";

import {
  getNextStorageNo,
  getRecentStorages,
  getStorageSpaces,
  getUserBranches,
  saveStorage,
  getProductByBarcode,
} from "../services/storageService";
import { printStorageLabels } from "../utils/printStorageLabels";

export default function StoragePage() {
  const toast = useToast();

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [branches, setBranches] = useState([]);
  const [storageSpaces, setStorageSpaces] = useState([]);
  const [recentStorages, setRecentStorages] = useState([]);

  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [branchId, setBranchId] = useState("");
  const [storageNo, setStorageNo] = useState("");
  const [storageSpaceId, setStorageSpaceId] = useState("");

  const [scanCode, setScanCode] = useState("");
  const [items, setItems] = useState([]);

  const [receivedNotes, setReceivedNotes] = useState("");
  const [staffSignature, setStaffSignature] = useState(null);
  const [customerSignature, setCustomerSignature] = useState(null);

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

  const handleBranchChange = async (value) => {
    setBranchId(value);

    if (!value) {
      setStorageNo("");
      return;
    }

    try {
      const res = await getNextStorageNo(value);
      setStorageNo(res.data.storage_no);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to generate storage number",
        status: "error",
      });
    }
  };

  const addProduct = (product) => {
    const exists = items.some((item) => item.product_id === product.product_id);

    if (exists) {
      toast({
        title: "Product already added",
        status: "warning",
      });
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        ...product,
        quantity: 1,
        condition: "Good",
      },
    ]);
  };

  const handleBarcodeScan = async (e) => {
    if (e.key !== "Enter") return;

    if (!scanCode.trim()) return;

    try {
      const res = await getProductByBarcode(scanCode.trim());
      addProduct(res.data);
      setScanCode("");
    } catch (err) {
      console.error(err);
      toast({
        title: err?.response?.data?.message || "Product not found",
        status: "error",
      });
    }
  };

  const resetPage = () => {
    setSelectedCustomer(null);
    setBranchId("");
    setStorageNo("");
    setStorageSpaceId("");
    setItems([]);
    setReceivedNotes("");
    setStaffSignature(null);
    setCustomerSignature(null);
    setScanCode("");
    setReceivedDate(new Date().toISOString().slice(0, 10));
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Please select a customer",
        status: "warning",
      });
      return;
    }

    if (!branchId) {
      toast({
        title: "Please select a branch",
        status: "warning",
      });
      return;
    }

    if (!items.length) {
      toast({
        title: "Please add at least one item",
        status: "warning",
      });
      return;
    }

    try {
      const payload = {
        customer_id: selectedCustomer.id,
        branch_id: branchId,
        storage_space_product_id: storageSpaceId || null,
        received_date: receivedDate,
        received_notes: receivedNotes,
        staff_signature: staffSignature,
        customer_signature: customerSignature,
        items,
      };

      const res = await saveStorage(payload);

      toast({
        title: "Storage saved successfully",
        description: res.data.storage_no,
        status: "success",
      });

      const shouldPrint = window.confirm(
        "Storage saved successfully. Would you like to print barcode labels?",
      );

      if (shouldPrint) {
        printStorageLabels({
          storage_no: res.data.storage_no,
          items,
          business_name: "Storage King Limited",
        });
      }

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
      <Heading mb={6}>Storage Receipt</Heading>

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
              />

              <Box borderWidth="1px" borderRadius="lg" p={4} minH="110px">
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
                  <Text color="gray.500">
                    Select a customer to view their details.
                  </Text>
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
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <Box>
                <Text mb={1}>Received Date</Text>
                <Input
                  type="date"
                  value={receivedDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setReceivedDate(e.target.value)}
                />
              </Box>

              <Box>
                <Text mb={1}>Branch</Text>
                <Select
                  placeholder="Select Branch"
                  value={branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
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
                  placeholder="Select Storage Space"
                  value={storageSpaceId}
                  onChange={(e) => setStorageSpaceId(e.target.value)}
                >
                  {storageSpaces.map((space) => (
                    <option key={space.product_id} value={space.product_id}>
                      {space.product_name}
                    </option>
                  ))}
                </Select>
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
                  <Text mb={1}>Scan Product Code</Text>
                  <Input
                    placeholder="Scan or enter product code"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    onKeyDown={handleBarcodeScan}
                  />
                </Box>

                <Box>
                  <Text mb={1}>Search Product Name</Text>
                  <ProductSearch onSelect={addProduct} />
                </Box>
              </SimpleGrid>

              <StorageItemTable items={items} setItems={setItems} />
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
                  rows={4}
                  value={receivedNotes}
                  onChange={(e) => setReceivedNotes(e.target.value)}
                  placeholder="Enter notes about the received items"
                />
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
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

        <HStack justify="flex-end" spacing={4}>
          <Button variant="outline" onClick={resetPage}>
            Cancel
          </Button>

          <Button colorScheme="blue" onClick={handleSave}>
            Save
          </Button>
        </HStack>

        <Card>
          <CardHeader>
            <Heading size="md">Storages in the Last 30 Days</Heading>
          </CardHeader>

          <CardBody>
            <RecentStorageList
              storages={recentStorages}
              onPrint={async (storage) => {
                try {
                  const token = localStorage.getItem("token");

                  const response = await fetch(
                    `${
                      import.meta.env.VITE_API_URL ||
                      "http://localhost:5000/api"
                    }/storage/${storage.storage_id}/pdf`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    },
                  );

                  if (!response.ok) {
                    throw new Error("Failed to load PDF");
                  }

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  window.open(url, "_blank");
                } catch (err) {
                  console.error(err);
                  toast({
                    title: "Failed to open storage PDF",
                    status: "error",
                  });
                }
              }}
              onPrintBarcodes={async (storage) => {
                try {
                  const token = localStorage.getItem("token");

                  const response = await fetch(
                    `${
                      import.meta.env.VITE_API_URL ||
                      "http://localhost:5000/api"
                    }/storage/${storage.storage_id}/items`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    },
                  );

                  if (!response.ok) {
                    throw new Error("Failed to load storage items");
                  }

                  const data = await response.json();

                  printStorageLabels({
                    storage_no: storage.storage_no,
                    items: data.items || [],
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
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
