import { useState } from "react";
import {
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  VStack,
  HStack,
  Input,
  Text,
  Select,
  Switch,
  Divider,
} from "@chakra-ui/react";
import { usePOS } from "../../context/POSContext";
import { useAuth } from "../../context/AuthContext";
import { generateNumber, completeSale } from "../../services/posService";

export default function PaymentModal({
  isOpen,
  onClose,
  selectedCustomer,
  setSelectedCustomer,
  transactionType,
  docNumber,
  setDocNumber,
}) {
  const {
    cart,
    total,
    subtotal,
    tax,
    clearCart,
    clearPayments,
    payments,
    updatePayment,
    addPaymentRow,
    removePaymentRow,
  } = usePOS();

  const [emailInvoice, setEmailInvoice] = useState(false);

  const { user } = useAuth();

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const balance = total - totalPaid;

  const handleCompleteSale = async () => {
    try {
      if (!cart.length) {
        alert("Cart is empty");
        return;
      }

      if (!selectedCustomer) {
        alert("Please select a customer before completing the sale");
        return;
      }

      const payload = {
        customer_id: selectedCustomer?.id || null,
        transaction_type: transactionType,
        invoice_no: transactionType === "INVOICE" ? docNumber : null,
        proforma_no: transactionType === "PROFORMA" ? docNumber : null,
        refund_no: transactionType === "REFUND" ? docNumber : null,
        subtotal,
        vat: tax,
        grand_total: total,
        payment_terms: selectedCustomer?.payment_terms || 0,
        email_invoice: emailInvoice,
        due_date:
          selectedCustomer?.payment_terms > 0
            ? new Date(
                Date.now() +
                  Number(selectedCustomer.payment_terms) * 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .split("T")[0]
            : null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.qty,
          selling_price: item.selling_price,
          cost_price: item.cost_price,
        })),
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({
            method: p.method,
            amount: Number(p.amount),
          })),
      };

      const result = await completeSale(payload);

      // open invoice in a new tab before clearing everything
      window.open(`/sales/invoice/${result.sale_id}`, "_blank");

      if (emailInvoice && result.email_sent === false) {
        alert(
          result.email_message || "Customer does not have an email address set",
        );
      }

      clearCart();
      setSelectedCustomer(null);
      clearPayments();

      // refresh invoice / proforma / refund number
      const nextDoc = await generateNumber(transactionType);
      setDocNumber(nextDoc.number || "");

      setEmailInvoice(false);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Sale failed");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />

      <ModalContent>
        <ModalHeader>Complete Payment</ModalHeader>

        <ModalBody pb={6}>
          <Text fontSize="xl" mb={4}>
            Total: ₦ {total.toFixed(2)}
          </Text>

          {/* UPDATED: shared payment rows */}
          <VStack spacing={3}>
            {payments.map((p, i) => (
              <HStack key={i} w="100%">
                <Select
                  value={p.method}
                  onChange={(e) => updatePayment(i, "method", e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="CREDIT">Credit</option>
                </Select>

                <Input
                  type="number"
                  placeholder="Amount"
                  value={p.amount}
                  onChange={(e) => updatePayment(i, "amount", e.target.value)}
                />

                <Button
                  colorScheme="red"
                  onClick={() => removePaymentRow(i)}
                  isDisabled={payments.length === 1}
                >
                  X
                </Button>
              </HStack>
            ))}
          </VStack>

          <Button mt={3} size="sm" onClick={addPaymentRow}>
            + Add Payment Line
          </Button>

          <Divider my={4} />

          <Text>Paid: ₦ {totalPaid.toFixed(2)}</Text>

          <Text color={balance > 0 ? "red.500" : "green.500"}>
            Balance: ₦ {balance.toFixed(2)}
          </Text>

          <FormControl display="flex" alignItems="center" mt={4}>
            <FormLabel htmlFor="email-invoice" mb="0" fontSize="sm">
              Email invoice to customer
            </FormLabel>
            <Switch
              id="email-invoice"
              isChecked={emailInvoice}
              onChange={(e) => setEmailInvoice(e.target.checked)}
            />
          </FormControl>

          <Button
            mt={5}
            colorScheme="green"
            w="100%"
            size="lg"
            onClick={handleCompleteSale}
            isDisabled={cart.length === 0}
          >
            Complete Sale
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
