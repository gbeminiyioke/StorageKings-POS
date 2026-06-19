import {
  Box,
  Heading,
  Grid,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import api from "../api/api";
import ResponsiveTable from "../components/ResponsiveTable";

export default function PurchasesReport() {
  const [data, setData] = useState([]);
  const [filter, setFilters] = useState({
    startDate: "",
    endDate: "",
    supplier: "",
    branch: "",
    product: "",
  });

  const fetchReport = async () => {
    try {
      const res = await api.get("/reports/purchases", { params: filters });

      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <Box p={6}>
      <Heading size="md" mb={6}>
        Purchases / Receive Items Report
      </Heading>

      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2,1fr)",
          xl: "repeat(5,1fr)",
        }}
        gap={4}
      >
        <Input
          type="date"
          onChange={(e) =>
            setFilters({ ...filters, startDate: e.target.value })
          }
        />

        <Input
          type="date"
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />

        <Input
          placeholder="Supplier ID"
          onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
        />

        <Input
          placeholder="Branch ID"
          onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
        />

        <Input
          placeholder="Product ID"
          onChange={(e) => setFilters({ ...filters, product: e.target.value })}
        />
      </Grid>

      <Button colorScheme="blue" mb={6} onClick={fetchReport}>
        Run Report
      </Button>

      <ResponsiveTable minWidth="900px">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>GRN</Th>
              <Th>Date</Th>
              <Th>Supplier</Th>
              <Th>Branch</Th>
              <Th>Product</Th>
              <Th>Qty</Th>
              <Th>Cost Price</Th>
              <Th>Total</Th>
            </Tr>
          </Thead>

          <Tbody>
            {data.map((row, i) => (
              <Tr key={i}>
                <Td>{row.grn_no}</Td>
                <Td>
                  {row.receive_date
                    ? new Date(row.receive_date).toLocaleDateString()
                    : ""}
                </Td>
                <Td>{row.supplier_name}</Td>
                <Td>{row.branch_name}</Td>
                <Td>{row.product_name}</Td>
                <Td>{row.quantity}</Td>
                <Td>{row.cost_price}</Td>
                <Td>{row.line_total}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ResponsiveTable>
    </Box>
  );
}
