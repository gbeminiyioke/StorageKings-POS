import {
  Box,
  Heading,
  Select,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Button,
  HStack,
  Input,
  Spinner,
  Text,
  Alert,
  AlertIcon,
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure,
} from "@chakra-ui/react";

import { useEffect, useState, Fragment } from "react";
import api from "../api/api";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function InventoryDashboard() {
  const [metrics, setMetrics] = useState({});
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [branchPerf, setBranchPerf] = useState([]);
  const [branches, setBranches] = useState([]);

  const [branch, setBranch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // REPORTS
  const [reportType, setReportType] = useState("");
  const [reportData, setReportData] = useState([]);

  // MODAL
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedRow, setSelectedRow] = useState(null);

  const [tabIndex, setTabIndex] = useState(0);

  const [movementPage, setMovementPage] = useState(1);
  const [movementTotalPages, setMovementTotalPages] = useState(1);

  const [movementBranch, setMovementBranch] = useState("");
  const [movementProduct, setMovementProduct] = useState("");

  const [products, setProducts] = useState([]);

  const [storagePage, setStoragePage] = useState(1);
  const [storageTotalPages, setStorageTotalPages] = useState(1);
  const [storageCustomer, setStorageCustomer] = useState("");
  const [storageType, setStorageType] = useState("");
  const [storageStatus, setStorageStatus] = useState("");
  const [storageItems, setStorageItems] = useState([]);
  const [selectedStorage, setSelectedStorage] = useState(null);

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {
    loadBranches();
    loadProducts();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [branch, fromDate, toDate]);

  // =========================
  // NEW: SAFE NUMBER PARSER (FIX NaN)
  // =========================
  const toNumber = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const loadBranches = async () => {
    const res = await api.get("/discharge/branches");
    setBranches(res.data || []);
  };

  const loadProducts = async () => {
    try {
      const res = await api.get("/products");

      console.log("PRODUCTS RESPONSE:", res.data);

      // ✅ SAFE ARRAY EXTRACTION
      if (Array.isArray(res.data)) {
        setProducts(res.data);
      } else if (Array.isArray(res.data.data)) {
        setProducts(res.data.data);
      } else if (Array.isArray(res.data.products)) {
        setProducts(res.data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error(err);
      setProducts([]);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const params = {
        branch_id: branch || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };

      const [m, t, db, p] = await Promise.all([
        api.get("/inventory/metrics", { params }),
        api.get("/inventory/storage-trends", { params }),
        api.get("/inventory/storage-distribution", { params }),
        api.get("/inventory/branch-performance"),
      ]);

      setMetrics(m.data || {});
      setTrends(t.data || []);
      setBranchPerf(p.data || []);
      //FIX: ensure count is number
      setDistribution(
        (db.data || []).map((d) => ({
          ...d,
          count: Number(d.count),
        })),
      );
    } catch (err) {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD REPORT
  // =========================
  const loadReport = async (type, page = 1) => {
    try {
      setLoading(true);
      setError("");

      // =========================
      // KEEP USER ON REPORTS TAB
      // =========================
      setTabIndex(1);

      // =========================
      // SET REPORT TYPE
      // =========================
      setReportType(type);

      // =========================
      // BASE PARAMS
      // =========================
      const params = {};

      // =====================================================
      // STOCK MOVEMENTS REPORT
      // =====================================================
      if (type === "movements") {
        params.page = page;
        params.limit = 15;

        // FILTERS
        if (movementBranch) {
          params.branch_id = movementBranch;
        }

        if (movementProduct) {
          params.product_id = movementProduct;
        }

        if (fromDate) {
          params.from = fromDate;
        }

        if (toDate) {
          params.to = toDate;
        }
      }

      // =====================================================
      // STORAGE REPORT
      // =====================================================
      if (type === "customer-storage") {
        params.page = page;
        params.limit = 15;

        // BRANCH FILTER
        if (movementBranch) {
          params.branch_id = movementBranch;
        }

        // CUSTOMER FILTER
        if (storageCustomer) {
          params.customer_name = storageCustomer;
        }

        // STORAGE STATUS
        if (storageStatus) {
          params.status = storageStatus;
        }

        // DATE RANGE
        if (fromDate) {
          params.from = fromDate;
        }

        if (toDate) {
          params.to = toDate;
        }
      }

      // =====================================================
      // API REQUEST
      // =====================================================
      const res = await api.get(`/inventory/reports/${type}`, { params });

      console.log(`${type.toUpperCase()} RESPONSE:`, res.data);

      // =====================================================
      // PAGINATED REPORTS
      // =====================================================
      if (type === "movements") {
        setReportData(res.data.data || []);

        setMovementTotalPages(res.data.totalPages || 1);

        setMovementPage(res.data.page || 1);
      } else if (type === "customer-storage") {
        setReportData(res.data.data || []);

        setStorageTotalPages(res.data.totalPages || 1);

        setStoragePage(res.data.page || 1);
      }

      // =====================================================
      // NORMAL REPORTS
      // =====================================================
      else {
        if (Array.isArray(res.data)) {
          setReportData(res.data);
        } else {
          console.error("Unexpected response:", res.data);

          setReportData([]);
        }
      }
    } catch (err) {
      console.error("LOAD REPORT ERROR:", err.response?.data || err.message);

      setError(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DRILL DOWN
  // =========================
  const openDetails = (row) => {
    setSelectedRow(row);
    onOpen();
  };

  // =========================
  // TABLE COMPONENT
  // =========================
  const DataTable = ({ data }) => {
    if (!data || data.length === 0) return <Text>No data</Text>;

    const headers = Object.keys(data[0]);

    return (
      <Table size="sm" variant="striped">
        <Thead>
          <Tr>
            {headers.map((h) => (
              <Th key={h}>{h}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.map((row, i) => (
            <Tr key={i} onClick={() => openDetails(row)} cursor="pointer">
              {headers.map((h) => (
                <Td key={h}>{row[h]}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  };

  // =========================
  // ALERT COLOR LOGIC
  // =========================
  const getColor = (available, total) => {
    if (total === 0) return "gray.400";
    if (available === 0) return "red.500";
    if (available / total < 0.2) return "orange.400";
    return "green.500";
  };

  // =========================
  // GROUP CAPACITY
  // =========================
  const groupedCapacity = () => {
    const grouped = {};

    (metrics.capacity || []).forEach((row) => {
      if (!grouped[row.branch_id]) {
        grouped[row.branch_id] = {
          branch_name: row.branch_name,
          items: [],
        };
      }
      grouped[row.branch_id].items.push(row);
    });

    return Object.values(grouped);
  };

  const COLORS = ["#3182CE", "#38A169", "#DD6B20", "#E53E3E"];

  // ================================
  // ALERT SYSTEM
  // ================================
  const alerts = [];

  groupedCapacity().forEach((branch) => {
    branch.items.forEach((item) => {
      const total = Number(item.total_capacity);
      const available = Number(item.available_capacity);

      if (total === 0) return;

      if (available === 0) {
        alerts.push({
          type: "error",
          message: `${branch.branch_name} - ${item.storage_name} is FULL`,
        });
      } else if (available / total < 0.2) {
        alerts.push({
          type: "warning",
          message: `${branch.branch_name} - ${item.storage_name} is running LOW`,
        });
      }
    });
  });

  // =========================
  // VALUATION TABLE
  // =========================
  const ValuationMatrixTable = ({ data }) => {
    // =========================
    // SAFE GUARD
    // =========================
    if (!Array.isArray(data) || data.length === 0) {
      return <Text>No data</Text>;
    }

    // =========================
    // SAFE NUMBER PARSER
    // =========================
    //console.log("VALUATION DATA:", data);
    const toNumber = (val) => {
      if (val === null || val === undefined || val === "") return 0;
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    };

    const format = (n) =>
      toNumber(n).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
      });

    // =========================
    // GROUP BY BRANCH
    // =========================
    const grouped = {};

    data.forEach((row) => {
      const branch = row.branch_name || "Unknown";

      if (!grouped[branch]) grouped[branch] = [];

      grouped[branch].push({
        product_name: row.product_name,

        // FIXED FIELD MAPPING
        cost_price: toNumber(row.cost_price ?? row.unit_cost ?? row.costprice),

        quantity: toNumber(row.quantity ?? row.stock_quantity ?? row.qty),

        amount: toNumber(row.stock_value ?? row.amount ?? row.value),
      });
    });

    // =========================
    // ALL BRANCHES SUMMARY
    // =========================
    const allProducts = {};

    data.forEach((row) => {
      const key = row.product_name;

      if (!allProducts[key]) {
        allProducts[key] = {
          product_name: row.product_name,
          cost_price: toNumber(row.cost_price),
          quantity: 0,
          amount: 0,
        };
      }

      allProducts[key].quantity += toNumber(
        row.quantity ?? row.stock_quantity ?? row.qty,
      );

      allProducts[key].amount += toNumber(
        row.stock_value ?? row.amount ?? row.value,
      );
    });

    const allRows = Object.values(allProducts);

    const grandTotal = allRows.reduce((sum, r) => sum + r.amount, 0);

    // =========================
    // TABLE STYLE
    // =========================
    const tableStyle = {
      border: "1px solid #000",
    };

    const cellStyle = {
      border: "1px solid #000",
      padding: "6px",
    };

    return (
      <Box>
        {/* =========================
          PER BRANCH TABLES
      ========================= */}
        {Object.entries(grouped).map(([branch, rows]) => {
          const total = rows.reduce((sum, r) => sum + r.amount, 0);

          return (
            <Box key={branch} mb={10}>
              <Heading size="sm" mb={2}>
                BRANCH: {branch}
              </Heading>

              <Table size="sm" sx={tableStyle}>
                <Thead>
                  <Tr>
                    <Th sx={cellStyle}>PRODUCT NAME</Th>
                    <Th sx={cellStyle} isNumeric>
                      COST PRICE
                    </Th>
                    <Th sx={cellStyle} isNumeric>
                      QUANTITY
                    </Th>
                    <Th sx={cellStyle} isNumeric>
                      AMOUNT
                    </Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {rows.map((r, i) => (
                    <Tr key={i}>
                      <Td sx={cellStyle}>{r.product_name}</Td>
                      <Td sx={cellStyle} isNumeric>
                        {format(r.cost_price)}
                      </Td>
                      <Td sx={cellStyle} isNumeric>
                        {format(r.quantity)}
                      </Td>
                      <Td sx={cellStyle} isNumeric>
                        {format(r.amount)}
                      </Td>
                    </Tr>
                  ))}

                  {/* TOTAL ROW */}
                  <Tr fontWeight="bold">
                    <Td sx={cellStyle} colSpan={3}>
                      TOTAL - {branch}
                    </Td>
                    <Td sx={cellStyle} isNumeric>
                      {format(total)}
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          );
        })}

        {/* =========================
          ALL BRANCHES SUMMARY
      ========================= */}
        <Box mt={10}>
          <Heading size="sm" mb={2}>
            BRANCH: ALL BRANCHES
          </Heading>

          <Table size="sm" sx={tableStyle}>
            <Thead>
              <Tr>
                <Th sx={cellStyle}>PRODUCT NAME</Th>
                <Th sx={cellStyle} isNumeric>
                  COST PRICE
                </Th>
                <Th sx={cellStyle} isNumeric>
                  QUANTITY
                </Th>
                <Th sx={cellStyle} isNumeric>
                  AMOUNT
                </Th>
              </Tr>
            </Thead>

            <Tbody>
              {allRows.map((r, i) => (
                <Tr key={i}>
                  <Td sx={cellStyle}>{r.product_name}</Td>
                  <Td sx={cellStyle} isNumeric>
                    {format(r.cost_price)}
                  </Td>
                  <Td sx={cellStyle} isNumeric>
                    {format(r.quantity)}
                  </Td>
                  <Td sx={cellStyle} isNumeric>
                    {format(r.amount)}
                  </Td>
                </Tr>
              ))}

              {/* GRAND TOTAL */}
              <Tr fontWeight="bold">
                <Td sx={cellStyle} colSpan={3}>
                  GRAND TOTAL - ALL BRANCHES
                </Td>
                <Td sx={cellStyle} isNumeric>
                  {format(grandTotal)}
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      </Box>
    );
  };

  // =========================
  // STOCK LEVELS TABLE
  // =========================
  const StockLevelsTable = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <Text>No data</Text>;
    }

    const grouped = {};

    data.forEach((row) => {
      const branch = row.branch_name || "Unknown";

      if (!grouped[branch]) {
        grouped[branch] = [];
      }

      grouped[branch].push({
        product_name: row.product_name,
        minimum_quantity: Number(row.minimum_quantity || 0),
        quantity: Number(row.stock_quantity || 0),
      });
    });

    return (
      <Box>
        {Object.entries(grouped).map(([branch, rows]) => {
          const totalQty = rows.reduce((sum, r) => sum + r.quantity, 0);

          return (
            <Box key={branch} mb={8}>
              <Heading size="sm" mb={2}>
                BRANCH: {branch}
              </Heading>

              <Table size="sm" border="1px solid #000">
                <Thead>
                  <Tr>
                    <Th border="1px solid #000">PRODUCT NAME</Th>

                    <Th border="1px solid #000" isNumeric>
                      Min Quantity
                    </Th>

                    <Th border="1px solid #000" isNumeric>
                      Quantity
                    </Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {rows.map((r, i) => {
                    let color = "black";

                    // =========================
                    // COLOR CODING
                    // =========================
                    if (r.quantity === 0) {
                      color = "red";
                    } else if (r.quantity <= r.minimum_quantity) {
                      color = "purple";
                    }

                    return (
                      <Tr key={i}>
                        <Td border="1px solid #000">{r.product_name}</Td>

                        <Td border="1px solid #000" isNumeric>
                          {r.minimum_quantity}
                        </Td>

                        <Td
                          border="1px solid #000"
                          isNumeric
                          color={color}
                          fontWeight="bold"
                        >
                          {r.quantity}
                        </Td>
                      </Tr>
                    );
                  })}

                  {/* TOTAL */}
                  <Tr fontWeight="bold">
                    <Td border="1px solid #000" colSpan={2}>
                      TOTAL
                    </Td>

                    <Td border="1px solid #000" isNumeric>
                      {totalQty}
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          );
        })}
      </Box>
    );
  };

  /* STOCK MOVEMENT TABLE */
  const StockMovementsTable = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <Text>No stock movements found</Text>;
    }

    return (
      <Box>
        {/* =========================
          FILTERS
      ========================= */}
        <SimpleGrid columns={[1, 2, 4]} spacing={3} mb={4}>
          <Select
            placeholder="Filter by Branch"
            value={movementBranch}
            onChange={(e) => setMovementBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.branch_name}
              </option>
            ))}
          </Select>

          <Select
            placeholder="Filter by Product"
            value={movementProduct}
            onChange={(e) => setMovementProduct(e.target.value)}
          >
            {Array.isArray(products) &&
              products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                </option>
              ))}
          </Select>

          <Button colorScheme="blue" onClick={() => loadReport("movements", 1)}>
            Apply Filters
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setMovementBranch("");
              setMovementProduct("");
              loadReport("movements", 1);
            }}
          >
            Reset
          </Button>
        </SimpleGrid>

        {/* =========================
          TABLE
      ========================= */}
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead bg="gray.100">
              <Tr>
                <Th>Date</Th>
                <Th>Branch</Th>
                <Th>Product</Th>
                <Th>Movement</Th>
                <Th isNumeric>Quantity</Th>
                <Th isNumeric>Balance</Th>
                <Th>Reference</Th>
                <Th>Source</Th>
              </Tr>
            </Thead>

            <Tbody>
              {data.map((row) => (
                <Tr key={row.movement_id}>
                  <Td>{new Date(row.created_at).toLocaleString()}</Td>

                  <Td>{row.branch_name}</Td>

                  <Td>{row.product_name}</Td>

                  <Td>{row.movement_type}</Td>

                  <Td isNumeric>{Number(row.quantity).toLocaleString()}</Td>

                  <Td isNumeric>
                    {Number(row.balance_after).toLocaleString()}
                  </Td>

                  <Td>{row.reference_no}</Td>

                  <Td>{row.reference_table}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* =========================
          PAGINATION
      ========================= */}
        <HStack mt={4} justify="space-between">
          <Button
            isDisabled={movementPage <= 1}
            onClick={() => loadReport("movements", movementPage - 1)}
          >
            Previous
          </Button>

          <Text>
            Page {movementPage} of {movementTotalPages}
          </Text>

          <Button
            isDisabled={movementPage >= movementTotalPages}
            onClick={() => loadReport("movements", movementPage + 1)}
          >
            Next
          </Button>
        </HStack>
      </Box>
    );
  };

  /* =============================================
    Storage Report Table
  ================================================*/
  const StorageReportTable = ({ data }) => {
    const loadStorageItems = async (storageId) => {
      try {
        const res = await api.get(
          `/inventory/reports/customer-storage/${storageId}/items`,
        );

        setStorageItems(res.data || []);
        setSelectedStorage(storageId);

        onOpen();
      } catch (err) {
        console.error(err);
      }
    };

    return (
      <Box>
        {/* FILTERS */}
        <SimpleGrid columns={[1, 2, 3]} spacing={3} mb={4}>
          <Input
            placeholder="Customer name"
            value={storageCustomer}
            onChange={(e) => setStorageCustomer(e.target.value)}
          />

          <Select
            placeholder="Status"
            value={storageStatus}
            onChange={(e) => setStorageStatus(e.target.value)}
          >
            <option value="ACTIVE">Active</option>
            <option value="PARTIAL">Partial</option>
            <option value="CLOSED">Closed</option>
          </Select>

          <Select
            placeholder="Status"
            value={storageStatus}
            onChange={(e) => setStorageStatus(e.target.value)}
          >
            <option value="ACTIVE">Active</option>

            <option value="PARTIAL">Partial</option>

            <option value="CLOSED">Closed</option>
          </Select>

          <Button
            colorScheme="blue"
            onClick={() => loadReport("customer-storage", 1)}
          >
            Apply Filters
          </Button>
        </SimpleGrid>

        {/* TABLE */}
        <Box overflowX="auto">
          <Table size="sm">
            <Thead bg="gray.100">
              <Tr>
                <Th>Storage No</Th>
                <Th>Branch</Th>
                <Th>Customer</Th>
                <Th>Storage Space</Th>
                <Th>Status</Th>
                <Th>Date</Th>
                <Th isNumeric>Total Items</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>

            <Tbody>
              {data.map((row) => (
                <Tr key={row.storage_id}>
                  <Td>{row.storage_no}</Td>

                  <Td>{row.branch_name}</Td>

                  <Td>{row.customer_name}</Td>

                  <Td>{row.storage_name}</Td>

                  <Td>{row.status}</Td>

                  <Td>{new Date(row.created_at).toLocaleDateString()}</Td>

                  <Td isNumeric>{row.total_items}</Td>

                  <Td>
                    <Button
                      size="xs"
                      colorScheme="blue"
                      onClick={() => loadStorageItems(row.storage_id)}
                    >
                      View Items
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* PAGINATION */}
        <HStack mt={4} justify="space-between">
          <Button
            isDisabled={storagePage <= 1}
            onClick={() => loadReport("customer-storage", storagePage - 1)}
          >
            Previous
          </Button>

          <Text>
            Page {storagePage} of {storageTotalPages}
          </Text>

          <Button
            isDisabled={storagePage >= storageTotalPages}
            onClick={() => loadReport("customer-storage", storagePage + 1)}
          >
            Next
          </Button>
        </HStack>
      </Box>
    );
  };

  /*============================================
    STORAGE ANALYTICS
  ==============================================*/
  const StorageAnalyticsTable = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <Text>No analytics found</Text>;
    }

    return (
      <Box overflowX="auto">
        <Table size="sm" border="1px solid #000">
          <Thead>
            <Tr>
              <Th border="1px solid #000">Branch</Th>

              <Th border="1px solid #000" isNumeric>
                Total Storages
              </Th>

              <Th border="1px solid #000" isNumeric>
                Active Storages
              </Th>

              <Th border="1px solid #000" isNumeric>
                Occupancy %
              </Th>

              <Th border="1px solid #000" isNumeric>
                Avg Days In Storage
              </Th>
            </Tr>
          </Thead>

          <Tbody>
            {data.map((row, i) => (
              <Tr key={i}>
                <Td border="1px solid #000">{row.branch_name}</Td>

                <Td border="1px solid #000" isNumeric>
                  {row.total_storages}
                </Td>

                <Td border="1px solid #000" isNumeric>
                  {row.active_storages}
                </Td>

                <Td border="1px solid #000" isNumeric>
                  {row.occupancy_percent}%
                </Td>

                <Td border="1px solid #000" isNumeric>
                  {Math.round(row.avg_days_in_storage || 0)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  };

  /*=========================================
    EXPIRING CONTRACTS
  ===========================================*/
  const ExpiringContractsTable = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <Text>No expiring contracts</Text>;
    }

    return (
      <Box overflowX="auto">
        <Table size="sm" border="1px solid #000">
          <Thead>
            <Tr>
              <Th border="1px solid #000">Storage No</Th>

              <Th border="1px solid #000">Customer</Th>

              <Th border="1px solid #000">Branch</Th>

              <Th border="1px solid #000">Received Date</Th>

              <Th border="1px solid #000" isNumeric>
                Period (Months)
              </Th>

              <Th border="1px solid #000">Expiry Date</Th>
            </Tr>
          </Thead>

          <Tbody>
            {data.map((row, i) => (
              <Tr key={i}>
                <Td border="1px solid #000">{row.storage_no}</Td>

                <Td border="1px solid #000">{row.fullname}</Td>

                <Td border="1px solid #000">{row.branch_name}</Td>

                <Td border="1px solid #000">
                  {new Date(row.received_date).toLocaleDateString()}
                </Td>

                <Td border="1px solid #000" isNumeric>
                  {row.storage_period_months}
                </Td>

                <Td border="1px solid #000">
                  {new Date(row.expiry_date).toLocaleDateString()}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  };

  /*========================================
    ALL STORAGE ITEMS REPORT
  ==========================================*/
  const AllStorageItemsTable = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <Text>No storage items found</Text>;
    }

    const grouped = {};

    data.forEach((row) => {
      const branch = row.branch_name;

      if (!grouped[branch]) {
        grouped[branch] = [];
      }

      grouped[branch].push(row);
    });

    return (
      <Box>
        {Object.entries(grouped).map(([branch, rows]) => {
          const total = rows.reduce(
            (sum, r) => sum + Number(r.remaining_quantity || 0),
            0,
          );

          return (
            <Box key={branch} mb={8}>
              <Heading size="sm" mb={2}>
                BRANCH: {branch}
              </Heading>

              <Table size="sm" border="1px solid #000">
                <Thead>
                  <Tr>
                    <Th border="1px solid #000">STORAGE NO</Th>

                    <Th border="1px solid #000">CUSTOMER NAME</Th>

                    <Th border="1px solid #000">STORAGE SPACE</Th>

                    <Th border="1px solid #000">ITEM NAME</Th>

                    <Th border="1px solid #000" isNumeric>
                      REMAINING QUANTITY
                    </Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {rows.map((r, i) => (
                    <Tr key={i}>
                      <Td border="1px solid #000">{r.storage_no}</Td>

                      <Td border="1px solid #000">{r.customer_name}</Td>

                      <Td border="1px solid #000">{r.storage_space}</Td>

                      <Td border="1px solid #000">{r.item_name}</Td>

                      <Td border="1px solid #000" isNumeric>
                        {r.remaining_quantity}
                      </Td>
                    </Tr>
                  ))}

                  <Tr fontWeight="bold">
                    <Td border="1px solid #000" colSpan={4}>
                      TOTAL
                    </Td>

                    <Td border="1px solid #000" isNumeric>
                      {total}
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          );
        })}
      </Box>
    );
  };

  /*========================================
    ITEM QUANTITY PERBRANCH REPORT
  ==========================================*/
  const StorageItemSummaryTable = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <Text>No item summary found</Text>;
    }

    const grouped = {};

    data.forEach((row) => {
      const branch = row.branch_name;

      if (!grouped[branch]) {
        grouped[branch] = [];
      }

      grouped[branch].push(row);
    });

    return (
      <Box>
        {Object.entries(grouped).map(([branch, rows]) => {
          const total = rows.reduce(
            (sum, r) => sum + Number(r.quantity || 0),
            0,
          );

          return (
            <Box key={branch} mb={8}>
              <Heading size="sm" mb={2}>
                BRANCH: {branch}
              </Heading>

              <Table size="sm" border="1px solid #000">
                <Thead>
                  <Tr>
                    <Th border="1px solid #000">ITEM NAME</Th>

                    <Th border="1px solid #000" isNumeric>
                      QUANTITY
                    </Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {rows.map((r, i) => (
                    <Tr key={i}>
                      <Td border="1px solid #000">{r.product_name}</Td>

                      <Td border="1px solid #000" isNumeric>
                        {r.quantity}
                      </Td>
                    </Tr>
                  ))}

                  <Tr fontWeight="bold">
                    <Td border="1px solid #000">TOTAL ITEMS</Td>

                    <Td border="1px solid #000" isNumeric>
                      {total}
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box p={6}>
      <Heading mb={4}>Inventory Dashboard</Heading>

      {/* FILTERS */}
      <HStack spacing={4} mb={6}>
        <Select
          placeholder="All branches"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.branch_id} value={b.branch_id}>
              {b.branch_name}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <Button onClick={loadDashboard}>Refresh</Button>
      </HStack>

      {error && (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <Tabs
          index={tabIndex}
          onChange={(index) => setTabIndex(index)}
          variant="enclosed"
        >
          <TabList>
            <Tab>Dashboard</Tab>
            <Tab>Reports</Tab>
            <Tab>Analytics</Tab>
          </TabList>

          <TabPanels>
            {/* ================= DASHBOARD ================= */}
            <TabPanel>
              <SimpleGrid columns={[1, 2, 3]} spacing={4}>
                <Stat>
                  <StatLabel>Total Storages</StatLabel>
                  <StatNumber>
                    {metrics.storage?.total_storages ?? 0}
                  </StatNumber>
                </Stat>

                <Stat>
                  <StatLabel>Active</StatLabel>
                  <StatNumber>{metrics.storage?.active ?? 0}</StatNumber>
                </Stat>

                <Stat>
                  <StatLabel>Partial</StatLabel>
                  <StatNumber>{metrics.storage?.partial ?? 0}</StatNumber>
                </Stat>
              </SimpleGrid>

              {/* CAPACITY */}
              <Box mt={8}>
                <Heading size="md" mb={3}>
                  Storage Capacity Breakdown
                </Heading>

                {groupedCapacity().map((branch) => {
                  const total = branch.items.reduce(
                    (sum, i) => sum + Number(i.total_capacity),
                    0,
                  );

                  const occupied = branch.items.reduce(
                    (sum, i) => sum + Number(i.occupied_capacity),
                    0,
                  );

                  const available = total - occupied;

                  return (
                    <Box
                      key={branch.branch_name}
                      mb={5}
                      p={4}
                      borderWidth="1px"
                    >
                      <Text fontWeight="bold" mb={2}>
                        {branch.branch_name}
                      </Text>

                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                        color={getColor(available, total)}
                      >
                        Total: {total} | Occupied: {occupied} | Available:{" "}
                        {available}
                      </Text>

                      {branch.items.map((item) => (
                        <Text
                          key={item.product_id}
                          fontSize="sm"
                          ml={3}
                          color={getColor(
                            item.available_capacity,
                            item.total_capacity,
                          )}
                        >
                          • {item.storage_name} → Capacity:{" "}
                          {item.total_capacity}, Used: {item.occupied_capacity},
                          Free: {item.available_capacity}
                        </Text>
                      ))}
                    </Box>
                  );
                })}
              </Box>

              {/* STORAGE TREND */}
              <Box mt={8}>
                <Heading size="sm">Storage Trend</Heading>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="total_storages" stroke="#3182CE" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              {/* DISTRIBUTION */}
              <Box mt={8}>
                <Heading size="md" mb={3}>
                  Storage Distribution
                </Heading>

                {distribution.length === 0 ? (
                  <Text>No data available</Text>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="count"
                        nameKey="storage_name"
                        outerRadius={100}
                        label
                      >
                        {distribution.map((_, index) => (
                          <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>

              {/* BRANCH PERFOEMANCE CHART */}
              <Box mt={8}>
                <Heading size="sm">Branch Performance</Heading>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={branchPerf}>
                    <XAxis dataKey="branch" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3182CE" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* ================= REPORTS ================= */}
            <TabPanel>
              <SimpleGrid columns={[1, 2, 3]} spacing={3} mb={4}>
                <Button
                  colorScheme={reportType === "valuation" ? "blue" : "gray"}
                  onClick={() => loadReport("valuation")}
                >
                  Valuation
                </Button>
                <Button
                  colorScheme={reportType === "levels" ? "blue" : "gray"}
                  onClick={() => loadReport("levels")}
                >
                  Stock Levels
                </Button>
                <Button
                  colorScheme={reportType === "movements" ? "blue" : "gray"}
                  onClick={() => loadReport("movements")}
                >
                  Movements
                </Button>
                <Button
                  colorScheme={reportType === "analysis" ? "blue" : "gray"}
                  onClick={() => loadReport("analysis")}
                >
                  Analysis
                </Button>
                <Button
                  colorScheme={
                    reportType === "customer-storage" ? "blue" : "gray"
                  }
                  onClick={() => loadReport("customer-storage")}
                >
                  Storage
                </Button>
                <Button
                  colorScheme={
                    reportType === "customer-history" ? "blue" : "gray"
                  }
                  onClick={() => loadReport("customer-history")}
                >
                  Discharge History
                </Button>
                <Button
                  colorScheme="teal"
                  onClick={() => loadReport("storage-analytics")}
                >
                  Storage Analytics
                </Button>

                <Button
                  colorScheme="orange"
                  onClick={() => loadReport("expiring-storage")}
                >
                  Expiring Contracts
                </Button>

                <Button
                  colorScheme="purple"
                  onClick={() => loadReport("all-storage-items")}
                >
                  All Storage Items
                </Button>

                <Button
                  colorScheme="cyan"
                  onClick={() => loadReport("storage-item-summary")}
                >
                  Item Quantity Per Branch
                </Button>
              </SimpleGrid>

              {/*<DataTable data={reportData} />*/}
              {/* SWITCH TABLE */}
              {reportType === "valuation" && (
                <ValuationMatrixTable data={reportData} />
              )}

              {reportType === "levels" && (
                <StockLevelsTable data={reportData} />
              )}

              {reportType === "movements" && (
                <StockMovementsTable data={reportData} />
              )}

              {reportType === "customer-storage" && (
                <StorageReportTable data={reportData} />
              )}

              {reportType === "storage-analytics" && (
                <StorageAnalyticsTable data={reportData} />
              )}

              {reportType === "expiring-storage" && (
                <ExpiringContractsTable data={reportData} />
              )}

              {reportType === "all-storage-items" && (
                <AllStorageItemsTable data={reportData} />
              )}

              {reportType === "storage-item-summary" && (
                <StorageItemSummaryTable data={reportData} />
              )}

              {![
                "valuation",
                "levels",
                "movements",
                "customer-storage",
                "storage-analytics",
                "expiring-storage",
                "all-storage-items",
                "storage-item-summary",
              ].includes(reportType) && <DataTable data={reportData} />}
            </TabPanel>

            {/* ================= ANALYTICS ================= */}
            <TabPanel>
              <Text fontWeight="bold" mb={3}>
                Advanced Insights (Coming Next)
              </Text>

              <Text>
                - Inventory Turnover - Dead Stock Alerts - Reorder Suggestions -
                AI Forecasting
              </Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}

      {/* ================= MODAL ================= */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedStorage && (
              <>
                <Heading size="sm" mb={3}>
                  Storage Items
                </Heading>

                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Product</Th>
                      <Th isNumeric>Qty</Th>
                      <Th isNumeric>Retrieved</Th>
                      <Th isNumeric>Remaining</Th>
                      <Th>Condition</Th>
                      <Th>Barcode</Th>
                    </Tr>
                  </Thead>

                  <Tbody>
                    {storageItems.map((item) => (
                      <Tr key={item.item_id}>
                        <Td>{item.product_name}</Td>

                        <Td isNumeric>{item.quantity}</Td>

                        <Td isNumeric>{item.retrieved_quantity}</Td>

                        <Td isNumeric>{item.remaining_quantity}</Td>

                        <Td>{item.condition}</Td>

                        <Td>{item.generated_barcode}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
