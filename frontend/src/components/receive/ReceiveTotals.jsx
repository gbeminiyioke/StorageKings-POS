import { Box, Flex, Input, Text } from "@chakra-ui/react";

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function ReceiveTotals({ header = {}, setHeader, isView }) {
  const safeNumber = (val) => (val === undefined || val === null ? 0 : val);

  return (
    <Box mt={4}>
      <Flex
        justify="space-between"
        direction={{
          base: "column",
          md: "row",
        }}
        gap={2}
      >
        <Text>Subtotal</Text>
        <Text fontWeight="bold">
          {formatCurrency(safeNumber(header.subtotal))}
        </Text>
      </Flex>

      <Flex
        justify="space-between"
        direction={{
          base: "column",
          md: "row",
        }}
        gap={2}
      >
        <Text>Other Charges</Text>
        <Input
          width={{
            base: "100%",
            md: "160px",
          }}
          value={safeNumber(header.other)}
          isDisabled={isView}
          onChange={(e) =>
            setHeader({ ...header, other: Number(e.target.value) || 0 })
          }
        />
      </Flex>

      <Flex
        justify="space-between"
        direction={{
          base: "column",
          md: "row",
        }}
        gap={2}
      >
        <Text>Amount Paid</Text>
        <Input
          width={{
            base: "100%",
            md: "160px",
          }}
          value={safeNumber(header.amount_paid)}
          isDisabled={isView}
          onChange={(e) =>
            setHeader({ ...header, amount_paid: Number(e.target.value) || 0 })
          }
        />
      </Flex>

      <Flex
        justify="space-between"
        direction={{
          base: "column",
          md: "row",
        }}
        gap={2}
      >
        <Text fontWeight="bold">Grand Total</Text>
        <Text fontWeight="bold">
          {formatCurrency(safeNumber(header.grand_total))}
        </Text>
      </Flex>

      <Flex
        justify="space-between"
        direction={{
          base: "column",
          md: "row",
        }}
        gap={2}
      >
        <Text>Outstanding</Text>
        <Text>{formatCurrency(safeNumber(header.outstanding))}</Text>
      </Flex>
    </Box>
  );
}
