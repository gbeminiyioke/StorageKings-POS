import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  HStack,
  IconButton,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";

import ResponsiveTable from "../ResponsiveTable";

export default function CustomerOnboardingCard({
  queue = [],
  loading = false,
  onRefresh,
  onStart,
  activeOnboarding,
}) {
  return (
    <Card mb={6}>
      <CardHeader>
        <Flex justify="space-between" align="center">
          <Heading size="md">Customer Onboarding Queue</Heading>

          <Tooltip label="Refresh Queue">
            <IconButton
              icon={<RepeatIcon />}
              aria-label="Refresh Queue"
              onClick={onRefresh}
            />
          </Tooltip>
        </Flex>
      </CardHeader>

      <CardBody>
        {loading ? (
          <Flex justify="center" py={10}>
            <Spinner size="lg" />
          </Flex>
        ) : queue.length === 0 ? (
          <Box textAlign="center" py={8} color="gray.500">
            No pending onboarding requests.
          </Box>
        ) : (
          <ResponsiveTable minWidth="900px">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Invoice</Th>
                  <Th>Customer</Th>
                  <Th>Branch</Th>
                  <Th>Storage</Th>
                  <Th>Duration</Th>
                  <Th>Status</Th>
                  <Th width="120px">Action</Th>
                </Tr>
              </Thead>

              <Tbody>
                {queue.map((job) => (
                  <Tr key={job.onboarding_id}>
                    <Td>{job.invoice_no}</Td>

                    <Td>
                      <Text fontWeight="semibold">{job.fullname}</Text>

                      <Text fontSize="xs" color="gray.500">
                        {job.phone}
                      </Text>
                    </Td>

                    <Td>{job.branch_name}</Td>

                    <Td>{job.product_name}</Td>

                    <Td>
                      {job.duration} Month
                      {Number(job.duration) > 1 ? "s" : ""}
                    </Td>

                    <Td>
                      <Badge
                        colorScheme={
                          job.status === "PENDING" ? "orange" : "green"
                        }
                      >
                        {job.status}
                      </Badge>
                    </Td>

                    <Td>
                      <HStack>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          isDisabled={activeOnboarding}
                          onClick={() => onStart(job.onboarding_id)}
                        >
                          Onboard
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ResponsiveTable>
        )}
      </CardBody>
    </Card>
  );
}
