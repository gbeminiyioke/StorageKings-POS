import {
  HStack,
  IconButton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { EmailIcon, CheckIcon, CloseIcon, WarningIcon } from "@chakra-ui/icons";
import { FaPrint } from "react-icons/fa";
import { useState } from "react";

import {
  emailDischargePdf,
  approveDischarge,
  rejectDischarge,
  requestReversal,
} from "../../services/dischargeService";

import { useAuth } from "../../context/AuthContext";

export default function RecentDischargeList({ discharges, onPrint }) {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [loadingEmail, setLoadingEmail] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [reversingId, setReversingId] = useState(null);

  const handleEmail = async (id) => {
    try {
      setLoadingEmail(id);
      await emailDischargePdf(id);
      toast({ title: "Email sent", status: "success" });
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Email failed",
        status: "error",
      });
    } finally {
      setLoadingEmail(null);
    }
  };

  const handleApprove = async (id) => {
    try {
      setApprovingId(id);
      await approveDischarge(id);
      toast({ title: "Approved", status: "success" });
      window.location.reload();
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Approval failed",
        status: "error",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectDischarge(id);
      toast({ title: "Rejected", status: "info" });
      window.location.reload();
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Reject failed",
        status: "error",
      });
    }
  };

  const handleReverse = async (id) => {
    const reason = prompt("Enter reversal reason:");
    if (!reason) return;

    try {
      setReversingId(id);
      await requestReversal(id, reason);
      toast({
        title: "Reversal request submitted",
        status: "info",
      });
      window.location.reload();
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to request reversal",
        status: "error",
      });
    } finally {
      setReversingId(null);
    }
  };

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Date</Th>
          <Th>Branch</Th>
          <Th>Customer</Th>
          <Th>Status</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>

      <Tbody>
        {discharges.map((row) => {
          const status = row.approval_status;

          const canView = hasPermission("can_view");
          const canApprove = hasPermission("can_approve");
          const canDelete = hasPermission("can_delete");

          let printEnabled = false;
          let emailEnabled = false;
          let approveEnabled = false;
          let rejectEnabled = false;
          let reverseEnabled = false;

          // =========================
          // STRICT STATUS SWITCH
          // =========================
          switch (status) {
            case "PENDING":
              printEnabled = false;
              emailEnabled = false;
              approveEnabled = canApprove;
              rejectEnabled = canApprove;
              reverseEnabled = false;
              break;

            case "APPROVED":
              printEnabled = canView;
              emailEnabled = canView;
              approveEnabled = false;
              rejectEnabled = false;
              reverseEnabled = canDelete;
              break;

            case "PENDING_REVERSAL":
              printEnabled = false;
              emailEnabled = false;
              approveEnabled = canApprove;
              rejectEnabled = canApprove;
              reverseEnabled = false;
              break;

            case "REJECTED":
              printEnabled = canView;
              emailEnabled = false;
              approveEnabled = false;
              rejectEnabled = false;
              reverseEnabled = false;
              break;

            case "REVERSED":
              printEnabled = canView;
              emailEnabled = canView;
              approveEnabled = false;
              rejectEnabled = false;
              reverseEnabled = false;
              break;

            default:
              break;
          }

          return (
            <Tr key={row.discharge_id}>
              <Td>{row.discharge_date?.slice(0, 10)}</Td>
              <Td>{row.branch_name}</Td>
              <Td>{row.customer_name}</Td>

              <Td>
                {status === "REVERSED" ? (
                  <Text color="red.500" fontWeight="bold">
                    REVERSED
                  </Text>
                ) : status === "PENDING_REVERSAL" ? (
                  <Text color="orange.500" fontWeight="bold">
                    PENDING REVERSAL
                  </Text>
                ) : status === "REJECTED" ? (
                  <Text color="red.500" fontWeight="bold">
                    REJECTED
                  </Text>
                ) : (
                  status
                )}
              </Td>

              <Td>
                <HStack spacing={2}>
                  <Tooltip label="Print">
                    <IconButton
                      size="sm"
                      icon={<FaPrint />}
                      isDisabled={!printEnabled}
                      onClick={() => onPrint(row)}
                    />
                  </Tooltip>

                  <Tooltip label="Email">
                    <IconButton
                      size="sm"
                      colorScheme="blue"
                      icon={<EmailIcon />}
                      isLoading={loadingEmail === row.discharge_id}
                      isDisabled={!emailEnabled}
                      onClick={() => handleEmail(row.discharge_id)}
                    />
                  </Tooltip>

                  <Tooltip label="Approve">
                    <IconButton
                      size="sm"
                      colorScheme="green"
                      icon={<CheckIcon />}
                      isLoading={approvingId === row.discharge_id}
                      isDisabled={!approveEnabled}
                      onClick={() => handleApprove(row.discharge_id)}
                    />
                  </Tooltip>

                  <Tooltip label="Reject">
                    <IconButton
                      size="sm"
                      colorScheme="orange"
                      icon={<CloseIcon />}
                      isDisabled={!rejectEnabled}
                      onClick={() => handleReject(row.discharge_id)}
                    />
                  </Tooltip>

                  <Tooltip label="Request Reversal">
                    <IconButton
                      size="sm"
                      colorScheme="red"
                      icon={<WarningIcon />}
                      isLoading={reversingId === row.discharge_id}
                      isDisabled={!reverseEnabled}
                      onClick={() => handleReverse(row.discharge_id)}
                    />
                  </Tooltip>
                </HStack>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
