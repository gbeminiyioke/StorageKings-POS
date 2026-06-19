import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  Divider,
  Select,
  Spacer,
  Grid,
  GridItem,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { useMemo, useEffect, useRef, useState } from "react";
import { usePOS } from "../../context/POSContext";

export default function CartPanel({ onOpenPayment }) {
  const {
    cart,
    updateQty,
    removeItem,
    clearCart,
    lastTouchedProductId,
    subtotal,
    tax,
    total,

    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    discountAmount,

    /* NEW: shared payment state from POSContext */
    payments,
    updatePayment,
    addPaymentRow,
    removePaymentRow,
  } = usePOS();

  const [flashId, setFlashId] = useState(null);

  const cartListRef = useRef(null);
  const itemRefs = useRef({});

  useEffect(() => {
    if (!lastTouchedProductId) return;

    const element = itemRefs.current[lastTouchedProductId];

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    setFlashId(lastTouchedProductId);

    const timer = setTimeout(() => {
      setFlashId(null);
    }, 1200);

    return () => clearTimeout(timer);
  }, [lastTouchedProductId]);

  useEffect(() => {
    if (cart.length > 0) {
      const last = cart[cart.length - 1];

      setFlashId(last.product_id);

      const timer = setTimeout(() => {
        setFlashId(null);
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [cart.length]);

  /* =====================================
     NEW: amount paid + balance due
  ===================================== */
  const amountPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const balanceDue = Math.max(total - amountPaid, 0);

  //console.log("CartPanel cart:", cart);

  return (
    <Box bg="gray.50" p={4} h="100%" display="flex" flexDirection="column">
      <Flex align="center" mb={2}>
        <Text fontSize="lg" fontWeight="bold">
          Selected Products
        </Text>

        <Spacer />

        <Tooltip label="Clear cart">
          <IconButton
            size={{ base: "xs", md: "sm" }}
            colorScheme="red"
            variant="ghost"
            icon={<DeleteIcon />}
            aria-label="Clear cart"
            onClick={() => {
              if (
                window.confirm("Remove all selected products from the cart?")
              ) {
                clearCart();
              }
            }}
          />
        </Tooltip>
      </Flex>

      {/* =====================================
         CART ITEMS
      ===================================== */}
      <VStack
        ref={cartListRef}
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

        {cart.map((item, index) => (
          <Box
            key={item.product_id}
            ref={(el) => {
              if (el) {
                itemRefs.current[item.product_id] = el;
              }
            }}
            bg={flashId === item.product_id ? "blue.50" : "white"}
            borderColor={
              flashId === item.product_id ? "blue.400" : "transparent"
            }
            borderWidth="1px"
            transition="all 0.4s ease"
            borderRadius="md"
            p={3}
            shadow="sm"
          >
            <HStack align="start" spacing={3} flexWrap="wrap">
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
                width={{
                  base: "100%",
                  md: "80px",
                }}
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
                templateColumns={{
                  base: "1fr",
                  md: "1fr 1fr auto",
                }}
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
         DISCOUNT SECTION
        ===================================== */}
        <Box mt={4}>
          <Text fontWeight="bold" mb={2}>
            Invoice Discount
          </Text>

          <Grid templateColumns="1fr 1fr" gap={2}>
            <Select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
            >
              <option value="AMOUNT">Amount</option>
              <option value="PERCENT">Percent</option>
            </Select>

            <Input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={
                discountType === "PERCENT" ? "Discount %" : "Discount Amount"
              }
            />
          </Grid>
        </Box>

        {/* =====================================
         TOTALS SECTION
        ===================================== */}
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <Text>Subtotal</Text>
            <Text>₦ {subtotal.toFixed(2)}</Text>
          </HStack>

          <HStack justify="space-between">
            <Text>Discount</Text>
            <Text color="red.500">- ₦ {Number(discountAmount).toFixed(2)}</Text>
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
      <Grid
        templateColumns={{
          base: "1fr",
          md: "1fr 1fr",
        }}
        gap={3}
      >
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
