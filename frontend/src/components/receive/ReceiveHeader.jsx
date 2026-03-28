import { Grid, Input, Select, FormControl, FormLabel } from "@chakra-ui/react";

export default function ReceiveHeader({
  header,
  setHeader,
  branches,
  suppliers,
  isView,
}) {
  const updateHeader = (field, value) => {
    setHeader((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <>
      <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={4}>
        <FormControl>
          <FormLabel>Date</FormLabel>
          <Input
            type="date"
            value={header.date || ""}
            isDisabled={isView}
            onChange={(e) => updateHeader("date", e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>GRN No.</FormLabel>
          <Input value={header.grn || ""} isDisabled />
        </FormControl>

        <FormControl>
          <FormLabel>Invoice No</FormLabel>
          <Input
            value={header.invoice_no || ""}
            isDisabled={isView}
            onChange={(e) => updateHeader("invoice_no", e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Branch</FormLabel>
          <Select
            value={header.branch_id || ""}
            isDisabled={isView}
            onChange={(e) =>
              updateHeader("branch_id", Number(e.target.value) || "")
            }
          >
            <option value="">Select Branch</option>
            {(branches || []).map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.branch_name}
              </option>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={4}>
        <FormControl gridColumn="span 1">
          <FormLabel>Supplier</FormLabel>
          <Select
            value={header.supplier_id || ""}
            isDisabled={isView}
            onChange={(e) =>
              updateHeader("supplier_id", Number(e.target.value) || "")
            }
          >
            <option value="">Select Supplier</option>

            {(suppliers || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.supplier_name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl gridColumn="span 1">
          <FormLabel>Supplier Balance</FormLabel>
          <Input value={header.supplier_balance ?? ""} isDisabled />
        </FormControl>
      </Grid>
    </>
  );
}
