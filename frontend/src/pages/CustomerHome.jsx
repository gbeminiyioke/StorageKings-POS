import React from "react";
import { Box, Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";

export default function CustomerHome() {
  return (
    <Box p={6}>
      <Tabs>
        <TabList>
          <Tab>My Stored Items</Tab>
          <Tab>Transactions</Tab>
          <Tab>Profile</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>Items in storage</TabPanel>
          <TabPanel>Recent transactions</TabPanel>
          <TabPanel>Customer profile</TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
