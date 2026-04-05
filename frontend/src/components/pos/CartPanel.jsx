import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  Divider,
  Select,
  Grid,
  GridItem,
  IconButton,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { useMemo } from "react";
import { usePOS } from "../../context/POSContext";

export default function CartPanel({ onOpenPayment }) {
  const {
    cart,
    updateQty,
    removeItem,
    clearCart,
    subtotal,
    tax,
    total,

    /* NEW: shared payment state from POSContext */
    payments,
    updatePayment,
    addPaymentRow,
    removePaymentRow,
  } = usePOS();

  /* =====================================
     NEW: amount paid + balance due
  ===================================== */
  const amountPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const balanceDue = Math.max(total - amountPaid, 0);

  return (
    <Box bg="gray.50" p={4} h="100%" display="flex" flexDirection="column">
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Selected Products
      </Text>

      {/* =====================================
         CART ITEMS
      ===================================== */}
      <VStack
        align="stretch"
        spacing={3}
        flex="1"
        minH="0"
        maxH="40vh"
        overflowY="auto"
        pr={1}
      >
        {cart.length === 0 && (
          <Box
            p={6}
            border="1px dashed"
            borderColor="gray.300"
            borderRadius="md"
            textAlign="center"
            color="gray.500"
          >
            No products selected
          </Box>
        )}

        {cart.map((item) => (
          <Box
            key={item.product_id}
            bg="white"
            borderRadius="md"
            p={3}
            shadow="sm"
          >
            <HStack align="start" spacing={3}>
              <Box flex="1">
                <Text fontWeight="bold">{item.product_name}</Text>

                {/* UPDATED: show price and stock */}
                <Text fontSize="sm" color="gray.500">
                  ₦ {Number(item.selling_price).toFixed(2)} each
                </Text>

                {item.monitor_stock && (
                  <Text fontSize="xs" color="orange.500">
                    Stock Available: {item.stock_quantity}
                  </Text>
                )}
              </Box>

              <Input
                type="number"
                min={1}
                width="80px"
                value={item.qty}
                onChange={(e) =>
                  updateQty(
                    item.product_id,
                    Math.max(1, Number(e.target.value || 1)),
                  )
                }
              />

              <Box minW="90px" textAlign="right">
                <Text fontWeight="bold">
                  ₦ {(item.qty * item.selling_price).toFixed(2)}
                </Text>
              </Box>

              <IconButton
                aria-label="Remove item"
                icon={<DeleteIcon />}
                colorScheme="red"
                variant="ghost"
                onClick={() => removeItem(item.product_id)}
              />
            </HStack>
          </Box>
        ))}
      </VStack>

      <Divider my={4} />

      {/* =====================================
         NEW: PAYMENT MODES SECTION
      ===================================== */}
      <Box pt={4} borderTop="1px solid" borderColor="gray.200" bg="gray.50">
        <Box mb={4}>
          <Text fontSize="lg" fontWeight="bold" mb={3}>
            Payment Modes
          </Text>

          <VStack spacing={2} align="stretch">
            {payments.map((payment, index) => (
              <Grid
                key={index}
                templateColumns="1fr 1fr auto"
                gap={2}
                alignItems="center"
              >
                <GridItem>
                  <Select
                    value={payment.method}
                    onChange={(e) =>
                      updatePayment(index, "method", e.target.value)
                    }
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="CREDIT">Credit</option>
                  </Select>
                </GridItem>

                <GridItem>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={payment.amount}
                    onChange={(e) =>
                      updatePayment(index, "amount", e.target.value)
                    }
                  />
                </GridItem>

                <GridItem>
                  <IconButton
                    aria-label="Remove payment"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => removePaymentRow(index)}
                    isDisabled={payments.length === 1}
                  />
                </GridItem>
              </Grid>
            ))}
          </VStack>

          <Button mt={3} size="sm" onClick={addPaymentRow}>
            + Add Payment Line
          </Button>
        </Box>

        <Divider mb={4} />

        {/* =====================================
         TOTALS SECTION
      ===================================== */}
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <Text>Subtotal</Text>
            <Text>₦ {subtotal.toFixed(2)}</Text>
          </HStack>

          <HStack justify="space-between">
            <Text>VAT (7.5%)</Text>
            <Text>₦ {tax.toFixed(2)}</Text>
          </HStack>

          <HStack justify="space-between" fontWeight="bold" fontSize="lg">
            <Text>Grand Total</Text>
            <Text>₦ {total.toFixed(2)}</Text>
          </HStack>

          {/* NEW: amount paid + balance due */}
          <Divider />

          <HStack justify="space-between">
            <Text>Amount Paid</Text>
            <Text color="green.600">₦ {amountPaid.toFixed(2)}</Text>
          </HStack>

          <HStack justify="space-between">
            <Text>Balance Due</Text>
            <Text color={balanceDue > 0 ? "red.500" : "green.600"}>
              ₦ {balanceDue.toFixed(2)}
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* =====================================
         ACTION BUTTONS
      ===================================== */}
      <Grid templateColumns="1fr 1fr" gap={3} mt={5}>
        {/* UPDATED: uses clearCart through browser reload replacement later */}
        <Button colorScheme="red" variant="outline" onClick={clearCart}>
          Cancel Sale
        </Button>

        <Button
          colorScheme="green"
          onClick={onOpenPayment}
          isDisabled={cart.length === 0}
        >
          Complete Sale
        </Button>
      </Grid>
    </Box>
  );
}
