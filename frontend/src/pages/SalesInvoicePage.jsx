import {
  Box,
  Flex,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  Spinner,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";

export default function SalesInvoicePage() {
  const { sale_id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const res = await api.get(`/pos/invoice/${sale_id}`);
        setInvoice(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [sale_id]);

  useEffect(() => {
    if (!loading && invoice) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, invoice]);

  if (loading) return <Spinner />;

  const { sale, items } = invoice;

  return (
    <Box p={10} bg="white" minH="100vh" color="black">
      <Flex justify="space-between" align="start" mb={10}>
        <Box>
          <Heading size="2xl">INVOICE</Heading>
          <Text fontSize="3xl" fontWeight="bold" mt={2}>
            {sale.business_name || sale.branch_name}
          </Text>
          <Text>{sale.branch_address}</Text>
          <Text>{sale.branch_telephone}</Text>
        </Box>

        <Box textAlign="right">
          <Text fontWeight="bold">Invoice #</Text>
          <Text>{sale.invoice_no || sale.proforma_no || sale.refund_no}</Text>

          <Text mt={3} fontWeight="bold">
            Date
          </Text>
          <Text>{new Date(sale.transaction_date).toLocaleDateString()}</Text>

          <Text mt={3} fontWeight="bold">
            Terms
          </Text>
          <Text>{sale.payment_terms || 0} days</Text>

          <Text mt={3} fontWeight="bold">
            Due Date
          </Text>
          <Text>
            {sale.due_date ? new Date(sale.due_date).toLocaleDateString() : "-"}
          </Text>
        </Box>
      </Flex>

      <Divider mb={6} />

      <Box mb={8}>
        <Text fontWeight="bold" mb={2}>
          Bill To
        </Text>
        <Text>{sale.fullname}</Text>
        <Text>{sale.address_1}</Text>
        {sale.address_2 && <Text>{sale.address_2}</Text>}
        <Text>{sale.telephone}</Text>
      </Box>

      <Table variant="simple" size="md">
        <Thead bg="gray.100">
          <Tr>
            <Th>Description</Th>
            <Th isNumeric>Quantity</Th>
            <Th isNumeric>Rate</Th>
            <Th isNumeric>Amount</Th>
          </Tr>
        </Thead>

        <Tbody>
          {items.map((item) => (
            <Tr key={item.id}>
              <Td>{item.product_name}</Td>
              <Td isNumeric>{item.quantity}</Td>
              <Td isNumeric>
                ₦{" "}
                {Number(item.selling_price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Td>
              <Td isNumeric>
                ₦{" "}
                {Number(item.total).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Flex justify="flex-end" mt={10}>
        <Box w="350px">
          <Flex justify="space-between" mb={2}>
            <Text>Subtotal</Text>
            <Text>
              ₦{" "}
              {Number(sale.subtotal).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </Flex>

          <Flex justify="space-between" mb={2}>
            <Text>Tax (7.5%)</Text>
            <Text>
              ₦{" "}
              {Number(sale.vat).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </Flex>

          <Flex justify="space-between" mb={2} fontWeight="bold">
            <Text>Total</Text>
            <Text>
              ₦{" "}
              {Number(sale.grand_total).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </Flex>

          <Flex justify="space-between" mb={2}>
            <Text>Paid</Text>
            <Text>
              ₦{" "}
              {Number(sale.amount_paid).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </Flex>

          <Divider my={2} />

          <Flex justify="space-between" fontSize="xl" fontWeight="bold">
            <Text>Balance Due</Text>
            <Text>
              ₦{" "}
              {Number(sale.balance_due).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
