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
import SignatureUpload from "../components/storage/SignatureUpload";
import DischargeItemTable from "../components/discharge/DischargeItemTable";
import RecentDischargeList from "../components/discharge/RecentDischargeList";
import {
  getNextDischargeNo,
  getRecentDischarges,
  getStorageItems,
  getStorageNos,
  getUserBranches,
  saveDischarge,
  scanItem,
} from "../services/dischargeService";

export default function DischargePage() {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const [customer, setCustomer] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [dischargeNo, setDischargeNo] = useState("");

  const [storageNos, setStorageNos] = useState([]);
  const [storageId, setStorageId] = useState("");
  const [storageSpace, setStorageSpace] = useState("");

  const [condition, setCondition] = useState("Good");
  const [items, setItems] = useState([]);
  const [recent, setRecent] = useState([]);

  const [notes, setNotes] = useState("");
  const [staffSignature, setStaffSignature] = useState(null);
  const [customerSignature, setCustomerSignature] = useState(null);

  const [scanCode, setScanCode] = useState("");
  const [isScanMode, setIsScanMode] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    try {
      const [branchRes, recentRes] = await Promise.all([
        getUserBranches(),
        getRecentDischarges(),
      ]);
      setBranches(branchRes.data || []);
      setRecent(recentRes.data || []);
    } catch {
      toast({ title: "Failed to load page", status: "error" });
    }
  };

  // =========================
  // SCAN HANDLER
  // =========================
  const handleScan = async (code) => {
    if (!code) return;

    try {
      const res = await scanItem(code.trim());
      const data = res.data;

      // prevent mixing storage
      if (isScanMode && storageId && data.storage_id !== storageId) {
        toast({
          title: "Cannot mix items from different storage",
          status: "error",
        });
        return;
      }

      // prevent duplicate item
      const exists = items.some(
        (i) => i.storage_item_id === data.storage_item_id,
      );

      if (exists) {
        toast({ title: "Item already scanned", status: "warning" });
        setScanCode("");
        return;
      }

      setIsScanMode(true);

      // set customer
      setCustomer({
        id: data.customer_id,
        fullname: data.fullname,
        email: data.email,
        telephone: data.telephone,
      });

      // branch
      setBranchId(data.branch_id);
      const numberRes = await getNextDischargeNo(data.branch_id);
      setDischargeNo(numberRes.data.discharge_no);

      // storage
      setStorageId(data.storage_id);
      setStorageSpace(data.storage_space_name || "");

      // ensure storage is available (for display)
      setStorageNos([
        {
          storage_id: data.storage_id,
          storage_no: data.storage_no,
          storage_space_name: data.storage_space_name,
        },
      ]);

      // load full storage items (important for received_date)
      setItems((prev) => {
        const exists = prev.find(
          (i) => i.storage_item_id === data.storage_item_id,
        );

        if (exists) {
          toast({
            title: "Item already scanned",
            status: "warning",
          });
          return prev;
        }

        return [
          ...prev,
          {
            ...data,
            selected: true,
            discharge_quantity: data.remaining_quantity,
          },
        ];
      });

      setScanCode("");
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Scan failed",
        status: "error",
      });
    }
  };

  // =========================
  // MANUAL FLOW
  // =========================
  const handleBranch = async (value) => {
    setBranchId(value);
    setStorageId("");
    setItems([]);

    if (!value) return;

    const numberRes = await getNextDischargeNo(value);
    setDischargeNo(numberRes.data.discharge_no);

    if (customer?.id) {
      const storageRes = await getStorageNos(customer.id, value);
      setStorageNos(storageRes.data || []);
    }
  };

  const handleCustomer = async (selected) => {
    setCustomer(selected);

    if (branchId) {
      const storageRes = await getStorageNos(selected.id, branchId);
      setStorageNos(storageRes.data || []);
    }
  };

  const handleStorage = async (value) => {
    setStorageId(value);

    const selectedStorage = storageNos.find(
      (x) => String(x.storage_id) === String(value),
    );

    setStorageSpace(selectedStorage?.storage_space_name || "");

    const res = await getStorageItems(value);

    setItems(
      (res.data || []).map((item) => ({
        ...item,
        selected: true,
        discharge_quantity: item.remaining_quantity,
      })),
    );
  };

  // =========================
  // RESET
  // =========================
  const resetPage = () => {
    setCustomer(null);
    setBranchId("");
    setDischargeNo("");
    setStorageNos([]);
    setStorageId("");
    setStorageSpace("");
    setItems([]);
    setNotes("");
    setStaffSignature(null);
    setCustomerSignature(null);
    setScanCode("");
    setIsScanMode(false);
  };

  // =========================
  // SAVE
  // =========================
  const handleSave = async () => {
    try {
      if (!customer || !branchId || !storageId) {
        toast({
          title: "Please complete required fields",
          status: "warning",
        });
        return;
      }

      if (!items.some((i) => i.selected && i.discharge_quantity > 0)) {
        toast({
          title: "No valid items selected",
          status: "warning",
        });
        return;
      }

      const payload = {
        customer_id: customer.id,
        branch_id: branchId,
        storage_id: storageId,
        discharge_date: today,
        discharge_notes: notes,
        condition,
        staff_signature: staffSignature,
        customer_signature: customerSignature,
        items,
      };

      const res = await saveDischarge(payload);

      toast({
        title: "Discharge saved successfully",
        description: res.data.discharge_no,
        status: "success",
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/discharge/${res.data.discharge_id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const blob = await response.blob();
      window.open(URL.createObjectURL(blob), "_blank");

      resetPage();
      loadPage();
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to save discharge",
        status: "error",
      });
    }
  };

  return (
    <Box p={6}>
      <Heading mb={6}>Item Discharge</Heading>

      <VStack spacing={6} align="stretch">
        {/* CUSTOMER */}
        <Card>
          <CardHeader>
            <Heading size="md">Customer Details</Heading>
          </CardHeader>

          <CardBody>
            <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
              <CustomerSearch
                value={customer}
                onSelect={handleCustomer}
                isDisabled={isScanMode}
              />

              <Box borderWidth="1px" borderRadius="lg" p={4}>
                {customer ? (
                  <VStack align="start">
                    <Text>
                      <b>Name:</b> {customer.fullname}
                    </Text>
                    <Text>
                      <b>Email:</b> {customer.email || "-"}
                    </Text>
                    <Text>
                      <b>Phone:</b> {customer.telephone || "-"}
                    </Text>
                  </VStack>
                ) : (
                  <Text color="gray.500">Select a customer</Text>
                )}
              </Box>
            </Grid>
          </CardBody>
        </Card>

        {/* STORED ITEMS */}
        <Card>
          <CardHeader>
            <Heading size="md">Stored Items</Heading>
          </CardHeader>

          <CardBody>
            <Box mb={4}>
              <Text mb={1}>Scan Stored Product Code</Text>
              <Input
                value={scanCode}
                placeholder="Scan barcode and press Enter"
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleScan(scanCode);
                }}
              />
            </Box>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 6 }} spacing={4} mb={6}>
              <Box>
                <Text mb={1}>Discharge Date</Text>
                <Input type="date" value={today} isReadOnly />
              </Box>

              <Box>
                <Text mb={1}>Branch</Text>
                <Select value={branchId} isDisabled={isScanMode}>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.branch_name}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Text mb={1}>Discharge No</Text>
                <Input value={dischargeNo} isReadOnly />
              </Box>

              <Box>
                <Text mb={1}>Storage No</Text>
                {isScanMode ? (
                  <Input
                    value={
                      storageNos.find((s) => s.storage_id == storageId)
                        ?.storage_no || ""
                    }
                    isReadOnly
                  />
                ) : (
                  <Select
                    value={storageId}
                    onChange={(e) => handleStorage(e.target.value)}
                  >
                    <option value="">Select Storage No</option>
                    {storageNos.map((s) => (
                      <option key={s.storage_id} value={s.storage_id}>
                        {s.storage_no}
                      </option>
                    ))}
                  </Select>
                )}
              </Box>

              <Box>
                <Text mb={1}>Storage Space</Text>
                <Input value={storageSpace} isReadOnly />
              </Box>

              <Box>
                <Text mb={1}>Condition</Text>
                <Select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Broken">Broken</option>
                </Select>
              </Box>
            </SimpleGrid>

            <DischargeItemTable items={items} setItems={setItems} />
          </CardBody>
        </Card>

        {/* PROCESS */}
        <Card>
          <CardHeader>
            <Heading size="md">Discharge Process</Heading>
          </CardHeader>

          <CardBody>
            <VStack spacing={5}>
              <Textarea
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

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

        <HStack justify="flex-end">
          <Button variant="outline" onClick={resetPage}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save
          </Button>
        </HStack>

        <Card>
          <CardHeader>
            <Heading size="md">Recent Discharges</Heading>
          </CardHeader>

          <CardBody>
            <RecentDischargeList
              discharges={recent}
              onPrint={async (row) => {
                const res = await fetch(
                  `${import.meta.env.VITE_API_URL}/discharge/${row.discharge_id}/pdf`,
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                  },
                );
                const blob = await res.blob();
                window.open(URL.createObjectURL(blob), "_blank");
              }}
            />
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
