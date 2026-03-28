import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  IconButton,
  Box,
  List,
  ListItem,
} from "@chakra-ui/react";

import { DeleteIcon } from "@chakra-ui/icons";
import { useState, useRef } from "react";
import { searchProducts } from "../../services/receiveService";
import api from "../../api/api";

export default function ReceiveItemsTable({
  items,
  setItems,
  updateItem,
  handleRowKey,
  isView,
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [activeRow, setActiveRow] = useState(null);

  const inputRefs = useRef([]);

  const columns = ["product_name", "cost_price", "qty", "discount", "tax"];

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: "",
        product_name: "",
        unit: "pcs",
        qty: 1,
        cost_price: 0,
        discount: 0,
        tax: 0,
        line_total: 0,

        stock_quantity: 0,
        minimum_quantity: 0,
        selling_price: 0,
        last_supplier_price: 0,
      },
    ]);
  };

  const removeRow = (i) => {
    const copy = [...items];
    copy.splice(i, 1);
    setItems(copy);

    inputRefs.current.splice(i, 1);
  };

  /*====================================
    PRODUCT SEARCH
  ======================================*/
  const handleSearch = async (value, rowIndex) => {
    updateItem(rowIndex, "product_name", value);

    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      //const res = await searchProducts(value);
      const res = await api.get("/products/search", {
        params: { q: value },
      });

      const result = res.data.data || [];

      setSearchResults(result);
      setActiveRow(rowIndex);
    } catch (err) {
      console.error("Search failed", err);
      setSearchResults([]);
    }
  };

  const selectProduct = (product, rowIndex) => {
    const copy = [...items];

    copy[rowIndex] = {
      ...copy[rowIndex],
      product_id: product.product_id || "",
      product_name: product.product_name || "",
      unit: product.unit || "pcs",
      cost_price: product.cost_price || 0,
      qty: 1,
      discount: 0,
      tax: 0,
      line_total: product.cost_price || 0,

      stock_quantity: product.stock_quantity ?? 0,
      minimum_quantity: product.minimum_quantity ?? 0,
      selling_price: product.selling_price ?? 0,
      last_supplier_price: product.last_supplier_price ?? 0,
    };

    setItems(copy);
    setSearchResults([]);
    setActiveRow(null);
  };

  const handleKey = (e, row, col) => {
    const key = e.key;

    if (key === "ArrowRight" || key === "Tab") {
      e.preventDefault();

      const nextcol = col + 1;

      if (nextcol < columns.length) {
        inputRefs.current[row][nextcol]?.focus();
      }
    }

    if (key === "ArrowLeft") {
      e.preventDefault();

      const prevCol = col - 1;

      if (prevCol >= 0) {
        inputRefs.current[row][prevCol]?.focus();
      }
    }

    if (key === "ArrowDown" || key === "Enter") {
      e.preventDefault();

      const nextRow = row + 1;

      if (nextRow < items.length) {
        inputRefs.current[nextRow][col]?.focus();
      }
    }

    if (key === "ArrowUp") {
      e.preventDefault();

      const prevRow = row - 1;

      if (prevRow >= 0) {
        inputRefs.current[prevRow][col]?.focus();
      }
    }

    if (key === "Delete") {
      removeRow(row);
    }
  };

  return (
    <>
      <Table size="sm" variant="simple">
        <Thead bg="gray.100">
          <Tr>
            <Th width="39%">Product</Th>
            <Th width="10%">Unit</Th>
            <Th width="16%">Cost</Th>
            <Th width="10%">Qty</Th>
            <Th width="10%">Discount</Th>
            <Th width="10%">Tax</Th>
            <Th width="2%">Cur</Th>
            <Th width="2%">Min</Th>
            <Th width="4%">S/P</Th>
            <Th width="4%">LS/P</Th>
            <Th width="12%">Total</Th>
            <Th width="1%"></Th>
          </Tr>
        </Thead>

        <Tbody>
          {items.map((item, i) => {
            if (!inputRefs.current[i]) {
              inputRefs.current[i] = [];
            }

            return (
              <Tr key={i}>
                {/* PRODUCT */}
                <Td position="relative">
                  <Input
                    ref={(el) => (inputRefs.current[i][0] = el)}
                    value={item.product_name || ""}
                    isDisabled={isView}
                    placeholder="Search product..."
                    onKeyDown={(e) => handleKey(e, i, 0)}
                    onChange={(e) => handleSearch(e.target.value, i)}
                  />

                  {activeRow === i && searchResults.length > 0 && (
                    <Box
                      position="absolute"
                      bg="white"
                      border="1px solid #ddd"
                      width="100%"
                      zIndex={10}
                      maxH="200px"
                      overflowY="auto"
                    >
                      <List spacing={0}>
                        {searchResults.map((p) => (
                          <ListItem
                            key={p.product_id}
                            px={3}
                            py={2}
                            cursor="pointer"
                            _hover={{ bg: "gray.100" }}
                            onClick={() => selectProduct(p, i)}
                          >
                            {p.product_name}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Td>

                {/* UNIT */}
                <Td>
                  <Input
                    ref={(el) => (inputRefs.current[i][1] = el)}
                    value={item.unit || ""}
                    isDisabled={isView}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                  />
                </Td>

                {/* COST PRICE */}
                <Td>
                  <Input
                    ref={(el) => (inputRefs.current[i][2] = el)}
                    type="number"
                    value={item.cost_price ?? ""}
                    isDisabled={isView}
                    onKeyDown={(e) => handleKey(e, i, 2)}
                    onChange={(e) =>
                      updateItem(i, "cost_price", Number(e.target.value) || 0)
                    }
                  />
                </Td>

                {/* QTY */}
                <Td>
                  <Input
                    ref={(el) => (inputRefs.current[i][3] = el)}
                    type="number"
                    value={item.qty ?? ""}
                    isDisabled={isView}
                    onKeyDown={(e) => handleKey(e, i, 3)}
                    onChange={(e) =>
                      updateItem(i, "qty", Number(e.target.value) || 0)
                    }
                  />
                </Td>

                {/* DISCOUNT */}
                <Td>
                  <Input
                    ref={(el) => (inputRefs.current[i][4] = el)}
                    type="number"
                    value={item.discount ?? ""}
                    isDisabled={isView}
                    onKeyDown={(e) => handleKey(e, i, 4)}
                    onChange={(e) =>
                      updateItem(i, "discount", Number(e.target.value) || 0)
                    }
                  />
                </Td>

                {/* TAX */}
                <Td>
                  <Input
                    ref={(el) => (inputRefs.current[i][5] = el)}
                    type="number"
                    value={item.tax ?? ""}
                    isDisabled={isView}
                    onKeyDown={(e) => handleKey(e, i, 5)}
                    onChange={(e) =>
                      updateItem(i, "tax", Number(e.target.value) || 0)
                    }
                  />
                </Td>

                {/* CURRENT STOCK */}
                <Td
                  color={
                    (item.stock_quantity ?? 0) < (item.minimum_quantity ?? 0)
                      ? "red.500"
                      : "grey.700"
                  }
                >
                  {item.stock_quantity ?? 0}
                </Td>

                {/* MINIMUM QUANTITY */}
                <Td>{item.minimum_quantity ?? 0}</Td>

                {/* SELLING PRICE */}
                <Td>{item.selling_price ?? 0}</Td>

                {/* LAST SELLING PRICE */}
                <Td>{item.last_supplier_price ?? 0}</Td>

                <Td>
                  {Number(item.line_total || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Td>

                <Td>
                  {!isView && (
                    <IconButton
                      size="sm"
                      icon={<DeleteIcon />}
                      onClick={() => removeRow(i)}
                    />
                  )}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </>
  );
}
