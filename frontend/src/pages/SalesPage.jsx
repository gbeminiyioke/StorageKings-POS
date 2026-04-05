import { Grid, GridItem, useDisclosure } from "@chakra-ui/react";
import { useState } from "react";

import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";
import PaymentModal from "../components/pos/PaymentModal";
import CategorySidebar from "../components/pos/CategorySidebar";
import POSHeader from "../components/pos/POSHeader";
import { POSProvider } from "../context/POSContext";

export default function SalesPage() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [transactionType, setTransactionType] = useState("INVOICE");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [docNumber, setDocNumber] = useState("");

  return (
    <POSProvider>
      <Grid templateRows="auto 1fr" h="calc(100vh - 80px)">
        <POSHeader
          search={search}
          setSearch={setSearch}
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          docNumber={docNumber}
          setDocNumber={setDocNumber}
        />

        <Grid templateColumns="220px 1fr 420px" h="100%">
          <GridItem borderRight="1px solid #eee">
            <CategorySidebar selected={category} setSelected={setCategory} />
          </GridItem>

          <GridItem p={4} overflow="auto" bg="gray.100">
            <ProductGrid
              search={search}
              setSearch={setSearch}
              category={category}
            />
          </GridItem>

          <GridItem borderLeft="1px solid #eee">
            <CartPanel onOpenPayment={onOpen} />
          </GridItem>
        </Grid>

        <PaymentModal
          isOpen={isOpen}
          onClose={onClose}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          transactionType={transactionType}
          docNumber={docNumber}
          setDocNumber={setDocNumber}
        />
      </Grid>
    </POSProvider>
  );
}
