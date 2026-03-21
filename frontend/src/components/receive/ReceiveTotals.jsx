import { Box, Flex, Input, Text } from "@chakra-ui/react";

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function ReceiveTotals({ header, setHeader, isView }) {
  return (
    <Box mt={4}>
      <Flex justify="space-between">
        <Text>Subtotal</Text>
        <Text fontWeight="bold">{formatCurrency(header.subtotal)}</Text>
      </Flex>

      <Flex justify="space-between" mb={2}>
        <Text>Other Charges</Text>
        <Input
          width="160px"
          value={header.other}
          isDisabled={isView}
          onChange={(e) => setHeader({ ...header, other: e.target.value })}
        />
      </Flex>

      <Flex justify="space-between">
        <Text>Amount Paid</Text>
        <Input
          width="160px"
          value={header.amount_paid}
          isDisabled={isView}
          onChange={(e) =>
            setHeader({ ...header, amount_paid: Number(e.target.value) })
          }
        />
      </Flex>

      <Flex justify="space-between" mt={3}>
        <Text fontWeight="bold">Grand Total</Text>
        <Text fontWeight="bold">{formatCurrency(header.grand_total)}</Text>
      </Flex>

      <Flex justify="space-between">
        <Text>Outstanding</Text>
        <Text>{formatCurrency(header.outstanding)}</Text>
      </Flex>
    </Box>
  );
}
