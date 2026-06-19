import {
  Box,
  Grid,
  Input,
  Select,
  Text,
  VStack,
  Spinner,
  List,
  ListItem,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { generateNumber } from "../../services/posService";
import api from "../../api/api";

export default function POSHeader({
  transactionType,
  setTransactionType,
  selectedCustomer,
  setSelectedCustomer,
  docNumber,
  setDocNumber,
}) {
  const { user } = useAuth();

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [branchName, setBranchName] = useState("");

  const [refundSearch, setRefundSearch] = useState("");
  const [refundResults, setRefundResults] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);

  const transactionDate = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  useEffect(() => {
    const loadNumber = async () => {
      try {
        setLoadingDoc(true);
        const res = await generateNumber(transactionType);
        setDocNumber(res.number || "");
      } catch (err) {
        console.error("Document number error:", err);
        setDocNumber("");
      } finally {
        setLoadingDoc(false);
      }
    };

    loadNumber();
  }, [transactionType, setDocNumber]);

  useEffect(() => {
    const loadBranch = async () => {
      try {
        if (!user?.branchId) return;

        const res = await api.get("/branches");

        const branch = (res.data || []).find(
          (b) => String(b.branch_id) === String(user.branchId),
        );

        if (branch) {
          setBranchName(branch.branch_name);
        }
      } catch (err) {
        console.error("Failed to load branch name", err);
      }
    };

    loadBranch();
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!customerQuery.trim()) {
        setCustomerResults([]);
        return;
      }

      try {
        const res = await api.get(`/customers/search?q=${customerQuery}`);
        setCustomerResults(res.data.data || []);
      } catch (err) {
        console.error("Customer search error:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerQuery]);

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerQuery("");
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (transactionType !== "REFUND") return;

    const timer = setTimeout(async () => {
      if (!refundSearch.trim()) {
        setRefundResults([]);
        return;
      }

      try {
        const res = await api.get(`/pos/search-sales?q=${refundSearch}`);

        setRefundResults(res.data);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [refundSearch, transactionType]);

  const dueDate = selectedCustomer?.payment_terms
    ? new Date(
        new Date(transactionDate).getTime() +
          Number(selectedCustomer.payment_terms) * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0]
    : "";

  return (
    <Box bg="white" p={4} borderBottom="1px solid #e2e8f0">
      <VStack spacing={4} align="stretch">
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2,1fr)",
            xl: "repeat(4,1fr)",
          }}
          gap={4}
        >
          <Box>
            <Text fontSize="sm" mb={1}>
              Transaction Date
            </Text>
            <Input value={transactionDate} isReadOnly />
          </Box>

          <Box>
            <Text fontSize="sm" mb={1}>
              Branch
            </Text>
            <Input value={branchName} isReadOnly />
          </Box>

          <Box>
            <Text fontSize="sm" mb={1}>
              Transaction Type
            </Text>
            <Select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
            >
              <option value="INVOICE">Invoice</option>
              <option value="PROFORMA">Proforma</option>
              <option value="REFUND">Refund</option>
            </Select>
          </Box>

          <Box>
            <Text fontSize="sm" mb={1}>
              {transactionType === "INVOICE"
                ? "Invoice Number"
                : transactionType === "PROFORMA"
                  ? "Proforma Number"
                  : "Refund Number"}
            </Text>

            {loadingDoc ? (
              <Spinner size="sm" mt={2} />
            ) : (
              <Input value={docNumber} isReadOnly />
            )}
          </Box>
        </Grid>

        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2,1fr)",
            xl: "2fr 1fr 1fr 1fr",
          }}
          gap={4}
        >
          <Box position="relative">
            <Text fontSize="sm" mb={1}>
              Customer
            </Text>
            <Input
              placeholder="Search customer name or phone"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
            />

            {customerResults.length > 0 && (
              <List
                position="absolute"
                top="100%"
                left="0"
                right="0"
                bg="white"
                border="1px solid #ddd"
                borderRadius="md"
                mt={1}
                zIndex={1000}
                maxH={{
                  base: "180px",
                  md: "200px",
                }}
                boxShadow="lg"
                overflowY="auto"
              >
                {customerResults.map((customer) => (
                  <ListItem
                    key={customer.id}
                    px={3}
                    py={2}
                    cursor="pointer"
                    _hover={{ bg: "gray.100" }}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setCustomerQuery(customer.fullname);
                      setCustomerResults([]);
                    }}
                  >
                    {customer.fullname} - {customer.telephone}
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box>
            <Text fontSize="sm" mb={1}>
              Current Balance
            </Text>
            <Input value={selectedCustomer?.current_balance || 0} isReadOnly />
          </Box>

          <Box>
            <Text fontSize="sm" mb={1}>
              Payment Terms
            </Text>
            <Input value={selectedCustomer?.payment_terms || 0} isReadOnly />
          </Box>

          <Box>
            <Text fontSize="sm" mb={1}>
              Due Date
            </Text>
            <Input value={dueDate} isReadOnly />
          </Box>

          {transactionType === "REFUND" && (
            <Box position="relative">
              <Text fontSize="sm" mb={1}>
                Original Invoice
              </Text>

              <Input
                placeholder="Search invoice number"
                value={refundSearch}
                onChange={(e) => setRefundSearch(e.target.value)}
              />

              {refundResults.length > 0 && (
                <List position="absolute" bg="white" zIndex={1000} width="100%">
                  {refundResults.map((sale) => (
                    <ListItem
                      key={sale.sale_id}
                      p={2}
                      cursor="pointer"
                      onClick={() => {
                        setSelectedSale(sale);
                        setRefundSearch(sale.invoice_no);
                        setRefundResults([]);
                      }}
                    >
                      {sale.invoice_no}
                      {" - "}₦{Number(sale.grand_total).toLocaleString()}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Grid>
      </VStack>
    </Box>
  );
}
