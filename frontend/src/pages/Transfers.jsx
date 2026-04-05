import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createTransfer,
  getNextTransferNo,
  getRecentTransfers,
  getTransferBranches,
  scanTransferProduct,
  searchTransferProducts,
} from "../services/transferService";

export default function Transfers() {
  const toast = useToast();
  const { user } = useAuth();

  const [branches, setBranches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [transferNo, setTransferNo] = useState("");
  const [page, setPage] = useState(1);
  const [recent, setRecent] = useState([]);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({
    transfer_date: new Date().toISOString().split("T")[0],
    from_branch_id: user?.branch_id || "",
    to_branch_id: "",
    transferred_by: "",
    checked_by: "",
    received_by: "",
  });

  const [items, setItems] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    loadBranches();
    loadRecent(1);
  }, []);

  useEffect(() => {
    if (form.from_branch_id) {
      loadTransferNo(form.from_branch_id);
    }
  }, [form.from_branch_id]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim() || !form.from_branch_id) {
        setResults([]);
        return;
      }

      const data = await searchTransferProducts(search, form.from_branch_id);

      setResults(data);
    }, 400);

    return () => clearTimeout(timer);
  }, [search, form.from_branch_id]);

  const loadBranches = async () => {
    const source = await getTransferBranches();
    setBranches(source);

    const enabled = await fetch("/api/branches/public/enabled").then((r) =>
      r.json(),
    );
    setAllBranches(enabled);
  };

  const loadTransferNo = async (branchId) => {
    const res = await getNextTransferNo(branchId);
    setTransferNo(res.transfer_no);
  };

  const loadRecent = async (pageNo) => {
    const res = await getRecentTransfers(pageNo);
    setRecent(res.data);
    setTotal(res.total);
  };

  const addProduct = (product) => {
    const existing = items.find((x) => x.product_id === product.product_id);

    if (existing) {
      const nextQty = existing.quantity + 1;

      if (nextQty > Number(existing.stock_quantity)) {
        toast({
          title: "Out of stock",
          status: "warning",
        });
        return;
      }

      setItems((prev) =>
        prev.map((x) =>
          x.product_id === product.product_id ? { ...x, quantity: nextQty } : x,
        ),
      );
      return;
    }

    if (Number(product.stock_quantity) <= 0) {
      toast({
        title: "Out of stock",
        status: "warning",
      });
      return;
    }

    setItems((prev) => [...prev, { ...product, quantity: 1 }]);

    setSearch("");
    setResults([]);
  };

  const handleBarcode = async (e) => {
    if (e.key !== "Enter") return;

    try {
      const product = await scanTransferProduct(barcode, form.from_branch_id);

      addProduct(product);
      setBarcode("");
    } catch {
      toast({
        title: "Product not found",
        status: "error",
      });
    }
  };

  const updateQty = (product_id, qty) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== product_id) return item;

        const newQty = Number(qty);

        if (newQty > Number(item.stock_quantity)) {
          toast({ title: "Quantity exceeds stock", status: "warning" });
          return item;
        }

        const remaining = Number(item.stock_quantity) - newQty;

        if (remaining <= Number(item.minimum_quantity)) {
          toast({
            title: `Low stock warning: ${item.product_name}`,
            description: `Remaining stock will be ${remaining}`,
            status: "warning",
          });
        }

        return { ...item, quantity: newQty };
      }),
    );
  };

  const submit = async () => {
    if (!items.length) {
      toast({ title: "Select at least one product", status: "warning" });
      return;
    }

    if (!form.transferred_by.trim()) {
      toast({
        title: "Transferred By is required",
        status: "warning",
      });
      return;
    }

    if (!form.checked_by.trim()) {
      toast({
        title: "Checked By is required",
        status: "warning",
      });
      return;
    }

    if (!form.received_by.trim()) {
      toast({
        title: "Received By is required",
        status: "warning",
      });
      return;
    }

    try {
      const res = await createTransfer({
        ...form,
        items,
      });

      toast({
        title: "Transfer posted",
        description: res.transfer_no,
        status: "success",
      });

      const resetForm = {
        transfer_date: new Date().toISOString().split("T")[0],
        from_branch_id: form.from_branch_id,
        to_branch_id: "",
        transferred_by: "",
        checked_by: "",
        received_by: "",
      };

      setForm(resetForm);
      setBarcode("");
      setSearch("");
      setResults([]);
      setItems([]);

      await loadTransferNo(form.from_branch_id);
      await loadRecent(page);
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Transfer failed",
        status: "error",
      });
    }
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>
        Stock Transfers
      </Heading>

      <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={4}>
        <Input
          type="date"
          max={new Date().toISOString().split("T")[0]}
          value={form.transfer_date}
          onChange={(e) => setForm({ ...form, transfer_date: e.target.value })}
        />

        <Input value={transferNo} isReadOnly />

        <Select
          value={form.from_branch_id}
          onChange={(e) => setForm({ ...form, from_branch_id: e.target.value })}
        >
          <option value="">Transfer From</option>
          {branches.map((b) => (
            <option key={b.branch_id} value={b.branch_id}>
              {b.branch_name}
            </option>
          ))}
        </Select>

        <Select
          value={form.to_branch_id}
          onChange={(e) => setForm({ ...form, to_branch_id: e.target.value })}
        >
          <option value="">Transfer To</option>
          {allBranches
            .filter((b) => String(b.branch_id) !== String(form.from_branch_id))
            .map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.branch_name}
              </option>
            ))}
        </Select>
      </Grid>

      <Grid templateColumns="1fr 1fr" gap={4} mb={4}>
        <Input
          placeholder="Scan Product Code"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleBarcode}
        />

        <Box position="relative">
          <Input
            placeholder="Search Product Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {results.length > 0 && (
            <Box
              position="absolute"
              w="100%"
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              zIndex={20}
              maxH="250px"
              overflowY="auto"
            >
              {results.map((p) => (
                <Box
                  key={p.product_id}
                  p={3}
                  cursor="pointer"
                  _hover={{ bg: "gray.100" }}
                  onClick={() => addProduct(p)}
                >
                  <Text fontWeight="bold">{p.product_name}</Text>
                  <Text fontSize="sm">Stock: {p.stock_quantity}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Grid>

      <Table mb={6}>
        <Thead>
          <Tr>
            <Th>Product Name</Th>
            <Th width="150px">Quantity</Th>
            <Th width="60px"></Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item) => (
            <Tr key={item.product_id}>
              <Td>{item.product_name}</Td>
              <Td>
                <Input
                  type="number"
                  min={1}
                  max={item.stock_quantity}
                  value={item.quantity}
                  onChange={(e) => updateQty(item.product_id, e.target.value)}
                />
              </Td>
              <Td>
                <IconButton
                  icon={<DeleteIcon />}
                  onClick={() =>
                    setItems((prev) =>
                      prev.filter((x) => x.product_id !== item.product_id),
                    )
                  }
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={4}>
        <Input
          placeholder="Transferred By"
          value={form.transferred_by}
          onChange={(e) => setForm({ ...form, transferred_by: e.target.value })}
        />

        <Input
          placeholder="Checked By"
          value={form.checked_by}
          onChange={(e) => setForm({ ...form, checked_by: e.target.value })}
        />

        <Input
          placeholder="Received By"
          value={form.received_by}
          onChange={(e) => setForm({ ...form, received_by: e.target.value })}
        />
      </Grid>

      <HStack mb={8}>
        <Button colorScheme="blue" onClick={submit}>
          Post Transfer
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setItems([]);
          }}
        >
          Cancel
        </Button>
      </HStack>

      <Heading size="md" mb={4}>
        Recent Transfers
      </Heading>

      <Table>
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Transfer No</Th>
            <Th>Transfer From</Th>
            <Th>Transfer To</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {recent.map((row) => (
            <Tr key={row.transfer_id}>
              <Td>{row.transfer_date}</Td>
              <Td>{row.transfer_no}</Td>
              <Td>{row.from_branch}</Td>
              <Td>{row.to_branch}</Td>
              <Td>{row.status}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <HStack mt={4}>
        <Button
          isDisabled={page === 1}
          onClick={() => {
            const p = page - 1;
            setPage(p);
            loadRecent(p);
          }}
        >
          Previous
        </Button>

        <Text>
          Page {page} of {Math.ceil(total / 10) || 1}
        </Text>

        <Button
          isDisabled={page >= Math.ceil(total / 10)}
          onClick={() => {
            const p = page + 1;
            setPage(p);
            loadRecent(p);
          }}
        >
          Next
        </Button>
      </HStack>
    </Box>
  );
}
