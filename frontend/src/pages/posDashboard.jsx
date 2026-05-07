import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { useEffect, useState } from "react";

import api from "../api/api";

export default function POSDashboard() {
  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/pos-dashboard");

      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  const paymentData = data.paymentMethods.map((p) => ({
    name: p.payment_method,
    value: Number(p.total),
  }));

  return (
    <Box p={5}>
      <Heading mb={5}>Enterprise POS Dashboard</Heading>

      {/* KPI CARDS */}

      <SimpleGrid columns={[1, 2, 4]} spacing={5} mb={8}>
        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Sales Products Available</StatLabel>

          <StatNumber>
            {Number(data.summary.sales_products_available).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Storage Spaces Available</StatLabel>

          <StatNumber>
            {Number(data.summary.storage_spaces_available).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Sales Today</StatLabel>

          <StatNumber>
            ₦ {Number(data.salesToday.value).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Storage Revenue Today</StatLabel>

          <StatNumber>
            ₦ {Number(data.storageToday.value).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Sales This Month</StatLabel>

          <StatNumber>
            ₦ {Number(data.salesMonth.value).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Storage Revenue This Month</StatLabel>

          <StatNumber>
            ₦ {Number(data.storageMonth.value).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Gross Revenue</StatLabel>

          <StatNumber>
            ₦ {Number(data.financials.gross_revenue).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>VAT Collected</StatLabel>

          <StatNumber>
            ₦ {Number(data.financials.vat_collected).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Net Revenue</StatLabel>

          <StatNumber>
            ₦ {Number(data.financials.net_revenue).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Outstanding Receivables</StatLabel>

          <StatNumber>
            ₦ {Number(data.financials.outstanding_receivables).toLocaleString()}
          </StatNumber>
        </Stat>

        <Stat bg="white" p={5} shadow="sm" borderRadius="md">
          <StatLabel>Refund Value</StatLabel>

          <StatNumber>
            ₦ {Number(data.financials.refund_value).toLocaleString()}
          </StatNumber>
        </Stat>
      </SimpleGrid>

      {/* CHARTS */}

      <Grid templateColumns={["1fr", "2fr 1fr"]} gap={5} mb={8}>
        <GridItem bg="white" p={5} borderRadius="md">
          <Heading size="md" mb={4}>
            Today's Revenue By Branch
          </Heading>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.branchRevenueToday}>
              <XAxis dataKey="branch_name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" />
            </BarChart>
          </ResponsiveContainer>
        </GridItem>

        <GridItem bg="white" p={5} borderRadius="md">
          <Heading size="md" mb={4}>
            Month-To-Date Revenue By Branch
          </Heading>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.branchRevenueMonth}>
              <XAxis dataKey="branch_name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" />
            </BarChart>
          </ResponsiveContainer>
        </GridItem>

        <GridItem bg="white" p={5} borderRadius="md">
          <Heading size="md" mb={4}>
            Year-To-Date Revenue By Branch
          </Heading>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.branchRevenueYear}>
              <XAxis dataKey="branch_name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" />
            </BarChart>
          </ResponsiveContainer>
        </GridItem>

        <GridItem bg="white" p={5} borderRadius="md">
          <Heading size="md" mb={4}>
            Payment Methods
          </Heading>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label
              >
                {paymentData.map((entry, index) => (
                  <Cell key={index} />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </GridItem>
      </Grid>

      {/* TOP PRODUCTS */}

      <Box bg="white" p={5} borderRadius="md" mb={8}>
        <Heading size="md" mb={4}>
          Top Selling Products
        </Heading>

        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Product</Th>

              <Th isNumeric>Qty Sold</Th>

              <Th isNumeric>Revenue</Th>
            </Tr>
          </Thead>

          <Tbody>
            {data.topProducts.map((p, index) => (
              <Tr key={index}>
                <Td>{p.product_name}</Td>

                <Td isNumeric>{p.qty_sold}</Td>

                <Td isNumeric>₦ {Number(p.revenue).toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* ALERTS */}

      <Box bg="white" p={5} borderRadius="md">
        <Heading size="md" mb={4}>
          Low Stock Alerts
        </Heading>

        {data.alerts.length === 0 && <Text>No alerts</Text>}

        {data.alerts.map((a, index) => (
          <Alert status="warning" mb={3} key={index}>
            <AlertIcon />
            {a.product_name} at {a.branch_name} is low on stock. Remaining:{" "}
            {a.stock_quantity}
          </Alert>
        ))}
      </Box>
    </Box>
  );
}
