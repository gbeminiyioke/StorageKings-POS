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
  Tooltip,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import api from "../api/api";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
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
  const [branches, setBranches] = useState([]);

  const [branch, setBranch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [branchPerf, setBranchPerf] = useState([]);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [storages, setStorages] = useState([]);

  const [selectedStorage, setSelectedStorage] = useState(null);
  const [items, setItems] = useState([]);

  // =========================
  // LOAD BRANCHES
  // =========================
  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadData();
  }, [branch, fromDate, toDate]);

  const loadBranches = async () => {
    try {
      const res = await api.get("/discharge/branches");
      setBranches(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        branch_id: branch || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };

      const [metricsRes, trendsRes, distRes, perfRes] = await Promise.all([
        api.get("/inventory/metrics", { params }),
        api.get("/inventory/storage-trends", { params }),
        api.get("/inventory/storage-distribution", { params }),
        api.get("/inventory/branch-performance"),
      ]);

      setMetrics(metricsRes.data || {});
      setTrends(trendsRes.data || []);
      setBranchPerf(perfRes.data || []);

      // 🔥 FIX: ensure count is number
      setDistribution(
        (distRes.data || []).map((d) => ({
          ...d,
          count: Number(d.count),
        })),
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadStorages = async (branchId) => {
    const res = await api.get(`/inventory/branch/${branchId}/storages`);
    setStorages(res.data || []);
  };

  const loadItems = async (storageId) => {
    const res = await api.get(`/inventory/storage/${storageId}/items`);
    setItems(res.data || []);
  };

  // =========================
  // EXPORT EXCEL (FIXED)
  // =========================
  const exportExcel = async () => {
    try {
      const response = await api.get("/inventory/export/excel", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", "inventory-report.xlsx");

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export Excel error:", err);
    }
  };

  // =========================
  // EXPORT PDF (FIXED)
  // =========================
  const exportPdf = async () => {
    try {
      const response = await api.get("/inventory/export/pdf", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", "inventory-report.pdf");

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export PDF error:", err);
    }
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

        <Button onClick={loadData} colorScheme="blue">
          Refresh
        </Button>
      </HStack>

      {/* ERROR */}
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {alerts.length > 0 && (
        <Box mb={6}>
          <Heading size="sm" mb={2}>
            Capacity Alerts
          </Heading>

          {alerts.map((alert, i) => (
            <Alert key={i} status={alert.type} mb={2}>
              <AlertIcon />
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* LOADING */}
      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          {/* METRICS */}
          <SimpleGrid columns={[1, 2, 3]} spacing={4}>
            <Stat>
              <StatLabel>Total Storages</StatLabel>
              <StatNumber>{metrics.storage?.total_storages ?? 0}</StatNumber>
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
                <Box key={branch.branch_name} mb={5} p={4} borderWidth="1px">
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
                      • {item.storage_name} → Capacity: {item.total_capacity},
                      Used: {item.occupied_capacity}, Free:{" "}
                      {item.available_capacity}
                    </Text>
                  ))}
                </Box>
              );
            })}
          </Box>

          {/* STORAGE TREND */}
          <Box mt={8}>
            <Heading size="md" mb={3}>
              Storage Trend
            </Heading>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <XAxis dataKey="day" />
                <YAxis />
                <ReTooltip />
                <Legend />
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
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Box>

          {/* BRANCH PERFOEMANCE CHART */}
          <Box mt={8}>
            <Heading size="md" mb={3}>
              Branch Performance
            </Heading>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchPerf}>
                <XAxis dataKey="branch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3182CE" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* EXPORT */}
          <Box mt={8}>
            <Heading size="md" mb={3}>
              Reports
            </Heading>

            <HStack>
              <Button colorScheme="green" onClick={exportExcel}>
                Export Excel
              </Button>

              <Button colorScheme="red" onClick={exportPdf}>
                Export PDF
              </Button>
            </HStack>
          </Box>
        </>
      )}
    </Box>
  );
}
