import {
  Box,
  Button,
  Input,
  Grid,
  Text,
  useToast,
  FormControl,
  FormLabel,
  useStatStyles,
  Select,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";

import ReceiveHeader from "../components/receive/ReceiveHeader";
import ReceiveItemsTable from "../components/receive/ReceiveItemsTable";
import ReceiveTotals from "../components/receive/ReceiveTotals";
import ExistingGRNTable from "../components/receive/ExistingGRNTable";
import { useAuth } from "../context/AuthContext";

import {
  createGRN,
  getBranches,
  getSuppliers,
  getSupplierBalance,
} from "../services/receiveService";
import api from "../api/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

//console.log("API URL:", import.meta.env.VITE_API_URL);

export default function ReceiveItems() {
  const toast = useToast();
  const barcodeRef = useRef();

  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const [mode, setMode] = useState("CREATE"); //CREATE | EDIT | VIEW
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [listSearch, setListSearch] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const { permissions } = useAuth();

  const [staff, setStaff] = useState({
    received_by: "",
    checked_by: "",
    storekeeper: "",
  });

  const defaultHeader = {
    invoice_no: "",
    branch_id: "",
    supplier_id: "",
    date: new Date().toISOString().split("T")[0],
    subtotal: 0,
    discount: 0,
    tax: 0,
    other: 0,
    grand_total: 0,
    amount_paid: 0,
    outstanding: 0,
    supplier_balance: 0,
    grn: "",
  };

  /*=========================================
    DEBOUNCE LOGIC (300ms)
  ===========================================*/
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText); //fires after 300ms
    }, 300);
    return () => {
      clearTimeout(handler); //cancel previous timer
    };
  }, [searchText]);

  /*=========================================
    LOAD GRN LIST
  ===========================================*/
  const loadGRNList = async () => {
    try {
      setListLoading(true);

      const res = await api.get("/receive-items/list", {
        params: {
          q: listSearch,
          startDate: dateFilter.start,
          endDate: dateFilter.end,
          status: statusFilter,
          page,
          limit: 10,
        },
      });

      setGrnList(res.data);
      setPages(res.data.pages);
    } finally {
      setListLoading(false);
    }
  };

  /*=========================================
    API SEARCH (fires once after debounce)
  ===========================================*/
  useEffect(() => {
    const searchProducts = async () => {
      if (debouncedSearch.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      try {
        const res = await api.get("/products/search", {
          params: { q: debouncedSearch },
        });

        setSearchResults(res.data.data || []);
        setShowDropdown(true);
        setHighlightIndex(0);
      } catch (err) {
        console.error("Search error", err);
      }
    };

    searchProducts();
  }, [debouncedSearch]);

  const addProductToTable = (product) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.product_id === product.product_id,
      );

      if (existing) {
        return prev.map((item) =>
          item.product_id === product.product_id
            ? {
                ...item,
                qty: item.qty + 1,
                line_total: (item.qty + 1) * item.cost_price,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          row_id: crypto.randomUUID(),
          product_id: product.product_id,
          product_code: product.product_code,
          product_name: product.product_name,
          unit: product.unit || "pcs",
          cost_price: product.cost_price,
          qty: 1,
          discount: 0,
          tax: 0,
          line_total: product.cost_price,
        },
      ];
    });

    setSearchText("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const [header, setHeader] = useState({
    invoice_no: "",
    branch_id: "",
    supplier_id: "",
    date: new Date().toISOString().split("T")[0],
    subtotal: 0,
    discount: 0,
    tax: 0,
    other: 0,
    grand_total: 0,
    amount_paid: 0,
    outstanding: 0,
  });

  useEffect(() => {
    computeTotals(items);
  }, [items, header.other, header.amount_paid]);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        save(false);
      }

      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        save(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, header]);

  useEffect(() => {
    loadInitial();
    loadGRNList();
  }, [page, statusFilter]);

  const loadInitial = async () => {
    const b = await getBranches();
    const s = await getSuppliers();
    //const g = await getGRNList();

    setBranches(b.data);
    setSuppliers(s.data.data);
    //setGrnList(g.data);
  };

  useEffect(() => {
    if (!header.supplier_id) return;

    const loadBalance = async () => {
      const res = await getSupplierBalance(header.supplier_id);

      setHeader((prev) => ({
        ...prev,
        supplier_balance: res.data.balance,
      }));
    };
    loadBalance();
  }, [header.supplier_id]);

  useEffect(() => {
    if (!header.branch_id) return;

    const loadGRN = async () => {
      const res = await api.get(`/branches/${header.branch_id}/next-grn`);

      setHeader((prev) => ({
        ...prev,
        grn: res.data.grn,
      }));
    };

    loadGRN();
  }, [header.branch_id]);

  useEffect(() => {
    if (items.length === 0) {
      setItems([
        {
          row_id: crypto.randomUUID(),
          product_id: "",
          product_name: "",
          unit: "",
          qty: 1,
          cost_price: 0,
          discount: 0,
          tax: 0,
          line_total: 0,
        },
      ]);
    }
  }, []);

  const updateItem = (i, field, value) => {
    const copy = [...items];
    copy[i][field] = Number(value);

    if (["qty", "cost_price", "discount", "tax"].includes(field)) {
      copy[i][field] = Number(value || 0);
    } else {
      copy[i][field] = value;
    }

    const qty = Number(copy[i].qty || 0);
    const cost = Number(copy[i].cost_price || 0);
    const discount = Number(copy[i].discount || 0);
    const tax = Number(copy[i].tax || 0);

    copy[i].line_total = qty * cost - discount + tax;

    setItems(copy);

    //computeTotals(copy);
  };

  const computeTotals = (rows) => {
    const subtotal = rows.reduce((a, b) => a + Number(b.line_total || 0), 0);

    const grand = subtotal + Number(header.other || 0);

    setHeader((prev) => ({
      ...prev,
      subtotal,
      grand_total: grand,
      outstanding: grand - Number(prev.amount_paid || 0),
    }));
  };

  const validateBeforeSave = () => {
    if (!header.invoice_no) return toast({ title: "Invoice number required" });

    if (!header.branch_id)
      return toast({ title: "Branch is required", status: "error" });

    if (!header.supplier_id)
      return toast({ title: "Supplier required", status: "error" });

    if (new Date(header.date) > new Date()) {
      return toast({
        title: "Invalid Date",
        description: "Receive date cannot be in the future",
        status: "error",
      });
    }

    if (!staff.received_by || !staff.checked_by || !staff.storekeeper)
      return toast({
        title: "Received By, Checked By and Storekeeper are required",
        status: "error",
      });

    const validItems = items.filter((i) => i.product_id);

    if (validItems.length === 0) {
      return toast({
        title: "Add at least one valid product",
        status: "error",
      });
    }
    if (items.length === 0)
      return toast({ title: "No products added", status: "error" });

    return true;
  };

  const normalizeItem = (item) => ({
    product_id: item.product_id || "",
    product_name: item.product_name || "",
    unit: item.unit || "pcs",
    qty: item.qty ?? 1,
    cost_price: item.cost_price ?? 0,
    discount: item.discount ?? 0,
    tax: item.tax ?? 0,
    line_total: item.line_total ?? 0,
    stock_quantity: item.stock_quantity ?? 0,
    minimum_quantity: item.minimum_quantity ?? 0,
    selling_price: item.selling_price ?? 0,
    last_supplier_price: item.last_supplier_price ?? 0,
  });

  const save = async (post) => {
    if (!validateBeforeSave()) return;

    if (!post) {
      if (
        !window.confirm(
          "This will save a draft. Branch stock balances will not be updated.",
        )
      )
        return;
    }

    if (post && Number(header.amount_paid) === 0) {
      if (
        !window.confirm(
          "No payment entered. This will be recorded as a credit purchase. Continue?",
        )
      )
        return;
    }

    try {
      setLoading(true);

      const res = await createGRN({
        header,
        items,
        staff,
        post,
      });

      setReport(res.data.report || null);

      await loadGRNList();

      toast({
        title: "GRN Saved",
        description: res.data.grn,
        status: "success",
      });

      /*===========================================
        EMAIL CONFIRMATION
      =============================================*/
      if (post && res.data.supplier_email) {
        const send = window.confirm("Supplier has an email, send GRN now?");

        if (send) {
          await api.post(`/receive-items/${res.data.receive_id}/send-email`);
        }
      }

      /*===========================================
        AUTO PRINT
      =============================================*/
      if (post) {
        const url = `${BASE_URL}/receive-items/${res.data.receive_id}/printpdf`;
        window.open(url, "_blank");
      }

      //setItems([]);
      resetForm();
    } catch (err) {
      toast({
        title: "Error",
        description: "GRN failed",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id, status) => {
    try {
      if (status === "APPROVED") {
        if (
          !window.confirm(
            "This will reverse stock and supplier balance.Continue?",
          )
        )
          return;

        await api.post(`/receive-items/${id}/reverse`);
      }

      const res = await api.get(`receive-items/${id}`);

      setHeader({
        ...defaultHeader,
        ...res.data.header,
      });

      setItems(res.data.items.map(normalizeItem));

      setStaff({
        received_by: res.data.header.received_by || "",
        checked_by: res.data.header.checked_by || "",
        storekeeper: res.data.header.storekeeper || "",
      });

      setMode("EDIT");
      setSelectedId(id);

      await loadGRNList();
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed",
        status: "error",
      });
    }
  };

  const handleView = async (id) => {
    const res = await api.get(`/receive-items/${id}`);
    setHeader({
      ...defaultHeader,
      ...res.data.header,
    });

    setItems(res.data.items.map(normalizeItem));

    setStaff({
      received_by: res.data.header.received_by || "",
      checked_by: res.data.header.checked_by || "",
      storekeeper: res.data.header.storekeeper || "",
    });

    setMode("VIEW");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await api.delete(`/receive-items/${id}`);
    loadGRNList();
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < searchResults.length - 1 ? i + 1 : i));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : 0));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const product = searchResults[highlightIndex];
      if (product) addProductToTable(product);
    }
  };

  const handlePrint = async (id) => {
    window.open(`${BASE_URL}/receive-items/${id}/printpdf`, "_blank");
  };

  const handleRowKey = (e, index) => {
    if (e.key === "Delete") {
      const copy = [...items];
      copy.splice(index, 1);
      setItems(copy);
    }
  };

  const fetchProductByBarcode = async (barcode) => {
    if (!barcode) return;

    try {
      const res = await api.get(`/products/barcode/${barcode}`, {
        params: { branch_id: header.branch_id },
      });

      const product = res.data;
      setItems((prev) => {
        const existing = prev.find(
          (item) => item.product_id === product.product_id,
        );

        if (existing) {
          return prev.map((item) =>
            item.product_id === product.product_id
              ? {
                  ...item,
                  qty: item.qty + 1,
                  line_total: (item.qty + 1) * item.cost_price,
                }
              : item,
          );
        }

        return [
          ...prev,
          {
            product_id: product.product_id,
            product_code: product.product_code,
            product_name: product.product_name,
            unit: product.unit,
            qty: 1,
            cost_price: product.cost_price,
            discount: 0,
            tax: 0,
            line_total: product.cost_price,

            stock_quantity: product.stock_quantity || 0,
            minimum_quantity: product.minimum_quantity || 0,
            selling_price: product.selling_price || 0,
            last_supplier_price: product.last_supplier_price || 0,
          },
        ];
      });

      barcodeRef.current.focus();

      if (product.stock_quantity <= product.minimum_quantity) {
        toast({
          title: "Low Stock warning",
          description: `${product.product_name} is below minimum stock`,
          status: "warning",
        });
      }
    } catch (err) {
      toast({
        title: "Product not found",
        status: "error",
      });
    }
  };

  const updateGRN = async (post) => {
    if (!selectedId) {
      toast({
        title: "No GRN selected",
        status: "error",
      });
      return;
    }

    if (!validateBeforeSave()) return;

    if (post && Number(header.amount_paid) === 0) {
      if (
        !window.confirm(
          "No payment entered. This will be recorded as a credit purchase. Continue?",
        )
      )
        return;
    }

    try {
      setLoading(true);

      const payload = {
        header,
        items: items.filter((i) => i.product_id),
        staff,
        post,
      };

      console.log("UPDATE PAYLOAD:", payload);

      const res = await api.put(`/receive-items/${selectedId}`, payload);

      toast({
        title: post ? "GRN Posted Successfully" : "GRN Updated",
        description: res.data.grn,
        status: "success",
      });

      /*=======================================
        AUTO PRINT AFTER POST
      =========================================*/
      if (post) {
        const url = `${BASE_URL}/receive-items/${selectedId}/printpdf`;
        window.open(url, "_blank");
      }

      resetForm();
      await loadGRNList();
    } catch (err) {
      console.error("UPDATE ERROR:", err);
      console.error("RESPONSE:", err?.response);

      toast({
        title: "Update failed",
        description: err.response?.data.message || err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setHeader({
      invoice_no: "",
      branch_id: "",
      supplier_id: "",
      date: new Date().toISOString().split("T")[0],
      subtotal: 0,
      discount: 0,
      tax: 0,
      other: 0,
      grand_total: 0,
      amount_paid: 0,
      outstanding: 0,
    });

    setItems([
      {
        product_id: "",
        product_name: "",
        unit: "",
        qty: 1,
        cost_price: 0,
        discount: 0,
        tax: 0,
        line_total: 0,
      },
    ]);

    setStaff({
      received_by: "",
      checked_by: "",
      storekeeper: "",
    });

    setMode("CREATE");
    setSelectedId(null);
    setReport(null);
  };

  return (
    <Box p={6}>
      {/*==== MODE INDICATOR ==== */}
      {mode !== "CREATE" && (
        <Box
          mb={3}
          p={2}
          borderRadius="md"
          bg={mode === "EDIT" ? "yellow.100" : "blue.100"}
        >
          <Text fontWeight="bold">
            {mode === "EDIT" ? `EDIT MODE -GRN #${selectedId}` : "VIEW MODE"}
          </Text>
        </Box>
      )}

      <ReceiveHeader
        header={header}
        setHeader={setHeader}
        branches={branches}
        suppliers={suppliers}
        isView={mode === "VIEW"}
      />

      <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={3}>
        <FormControl gridColumn="span 1">
          <FormLabel>Product Barcode</FormLabel>

          <Input
            ref={barcodeRef}
            autoFocus
            placeholder="Scan product barcode..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchProductByBarcode(e.target.value);
                e.target.value = "";
                e.target.focus();
              }
            }}
          />
        </FormControl>

        <FormControl gridColumn="span 3" position="relative">
          <FormLabel>Search Product Name</FormLabel>
          <Input
            placeholder="Search product name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {showDropdown && searchResults.length > 0 && (
            <Box
              position="absolute"
              bg="white"
              border="1px solid #ddd"
              borderRadius="md"
              width="100%"
              maxH="250px"
              overflow="auto"
              zIndex="999"
            >
              {searchResults.map((p, index) => (
                <Box
                  key={p.product_id}
                  px={3}
                  py={2}
                  cursor="pointer"
                  bg={index === highlightIndex ? "blue.50" : "white"}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => addProductToTable(p)}
                >
                  <Text fontWeight="medium">{p.product_name}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {p.product_code} - {p.cost_price}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </FormControl>
      </Grid>

      <ReceiveItemsTable
        items={items}
        setItems={setItems}
        updateItem={updateItem}
        handleRowKey={handleRowKey}
        isView={mode === "VIEW"}
      />

      <ReceiveTotals
        header={header}
        setHeader={setHeader}
        isView={mode === "VIEW"}
      />

      {/*  STAFF GRID */}
      <Grid templateColumns="repeat(3, 1fr)" gap={4} mt={4}>
        <FormControl>
          <FormLabel>Received By</FormLabel>
          <Input
            value={staff.received_by}
            isDisabled={mode === "VIEW"}
            onChange={(e) =>
              setStaff({ ...staff, received_by: e.target.value })
            }
          />
        </FormControl>

        <FormControl>
          <FormLabel>Checked By</FormLabel>
          <Input
            value={staff.checked_by || ""}
            isDisabled={mode === "VIEW"}
            onChange={(e) => setStaff({ ...staff, checked_by: e.target.value })}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Storekeeper</FormLabel>
          <Input
            value={staff.storekeeper || ""}
            isDisabled={mode === "VIEW"}
            onChange={(e) =>
              setStaff({ ...staff, storekeeper: e.target.value })
            }
          />
        </FormControl>
      </Grid>

      <Box mt={4}>
        {mode === "EDIT" ? (
          <>
            <Button
              colorScheme="orange"
              isLoading={loading}
              onClick={() => updateGRN(false)}
            >
              Save Changes
            </Button>

            <Button
              ml={3}
              colorScheme="green"
              isLoading={loading}
              isDisabled={!selectedId}
              onClick={() => updateGRN(true)}
            >
              Save Changes & Post
            </Button>
          </>
        ) : (
          <>
            <Button
              colorScheme="blue"
              isDisabled={mode === "VIEW"}
              isLoading={loading}
              onClick={() => save(false)}
            >
              Save Draft
            </Button>

            <Button
              ml={3}
              colorScheme="green"
              isDisabled={mode === "VIEW"}
              isLoading={loading}
              onClick={() => save(true)}
            >
              Save & Post
            </Button>
          </>
        )}

        {/* CANCEL */}
        <Button
          ml={3}
          colorScheme="red"
          variant="outline"
          onClick={() => {
            setLoading(false);
            resetForm();
            loadGRNList();
          }}
        >
          Cancel
        </Button>
      </Box>

      {/*========================================
        DISPLAY PURCHASE REPORT
      ===========================================*/}
      {report && (
        <Box mt={6} p={4} border="1px solid #ddd" borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Purchase Report
          </Text>

          <Text>
            <b>GRN:</b>
            {report.header.grn_no}
          </Text>
          <Text>
            <b>Supplier:</b>
            {report.header.supplier_name}
          </Text>
          <Text>
            <b>Branch:</b>
            {report.header.branch_name}
          </Text>
          <Text>
            <b>Date:</b>
            {report.header.receive_date}
          </Text>
          <Text>
            <b>Total:</b>
            {report.header.grand_total}
          </Text>

          <Box mt={3}>
            {report.items.map((item, i) => (
              <Text key={i}>
                {item.product_name} - {item.quantity} * {item.cost_price}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* SEARCH BAR */}
      <Grid templateColumns="repeat(6, 1fr)" gap={3} mt={6}>
        <Input
          placeholder="Search supplier/ branch / GRN"
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
        />

        <Input
          type="date"
          value={dateFilter.start}
          onChange={(e) =>
            setDateFilter({ ...dateFilter, start: e.target.value })
          }
        />

        <Input
          type="date"
          value={dateFilter.end}
          onChange={(e) =>
            setDateFilter({ ...dateFilter, end: e.target.value })
          }
        />

        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REVERSED">Reversed</option>
        </Select>

        <Button
          colorScheme="gray"
          variant="outline"
          onClick={() => {
            setListSearch("");
            setDateFilter({ start: "", end: "" });
            setStatusFilter("ALL");
            setPage(1);
            loadGRNList();
          }}
        >
          Cancel
        </Button>

        <Button onClick={loadGRNList}>Search</Button>
      </Grid>

      {listLoading ? (
        <Text mt={4}>Loading GRNs...</Text>
      ) : (
        <ExistingGRNTable
          data={grnList}
          permissions={permissions}
          onEdit={(id, status) => handleEdit(id, status)}
          onView={handleView}
          onDelete={handleDelete}
          onPrint={handlePrint}
        />
      )}

      <Box mt={4} display="flex" gap={2}>
        <Button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          isDisabled={page === 1}
        >
          Prev
        </Button>

        <Text>
          Page {page} of {pages}
        </Text>

        <Button
          onClick={() => setPage((p) => Math.min(p + 1, pages))}
          isDisabled={page === pages}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}
