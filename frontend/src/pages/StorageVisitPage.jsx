import {
  Box,
  Heading,
  Spinner,
  Text,
  VStack,
  Badge,
  Button,
  Textarea,
  useToast,
  Flex,
  Divider,
  HStack,
  Input,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";

import { FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../api/api";

export default function StorageVisitPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [visit, setVisit] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [scannerInstance, setScannerInstance] = useState(null);

  const [manualCode, setManualCode] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const [activeVisits, setActiveVisits] = useState([]);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ====================================
   INITIALIZE QR SCANNER
==================================== */

  useEffect(() => {
    if (visit) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,

        qrbox: {
          width: 280,
          height: 280,
        },

        rememberLastUsedCamera: true,
        supportedScanTypes: [0],
      },
      false,
    );

    setScannerInstance(scanner);

    scanner.render(
      async (decodedText) => {
        try {
          setLoading(true);

          const res = await api.post("/storage/visits/checkin", {
            qr_pass_code: decodedText,
          });

          setVisit(res.data.data);
          setRemarks("");

          toast({
            title: "Visit approved successfully",
            description: "Visitor check-in validated.",
            status: "success",
            duration: 4000,
            isClosable: true,
          });

          await stopCamera();
        } catch (err) {
          console.error(err);

          toast({
            title: "Invalid QR pass",
            description:
              err.response?.data?.message || "Unable to validate visit.",
            status: "error",
            duration: 4000,
            isClosable: true,
          });
        } finally {
          setLoading(false);
        }
      },

      () => {
        // ignore scan noise
      },
    );

    return () => {
      stopCamera();
    };
  }, [visit]);

  /* ====================================
     COMPLETE VISIT / CHECKOUT
  ==================================== */

  const completeVisit = async () => {
    try {
      setLoading(true);

      await api.put(`/storage/visits/${visit.visit_log_id}/checkout`, {
        remarks,
      });

      toast({
        title: "Visit completed",
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      /* RESET PAGE */

      setVisit(null);
      setManualCode("");
      await stopCamera();
      setRemarks("");
      await loadActiveVisits();
    } catch (err) {
      console.error(err);

      toast({
        title: "Checkout failed",
        description: err.response?.data?.message || "Unable to complete visit.",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ====================================
   MANUAL / BARCODE VALIDATION
==================================== */

  const validateManualVisit = async () => {
    try {
      if (!manualCode.trim()) {
        toast({
          title: "Enter approval code",
          status: "warning",
        });

        return;
      }

      setManualLoading(true);

      const res = await api.post("/storage/visits/checkin", {
        qr_pass_code: manualCode.trim(),
      });

      setVisit(res.data.data);
      setManualCode("");
      setRemarks("");

      toast({
        title: "Visit approved successfully",
        status: "success",
      });
    } catch (err) {
      console.error(err);

      toast({
        title: "Invalid visit code",
        description: err.response?.data?.message,
        status: "error",
      });
    } finally {
      setManualLoading(false);
    }
  };

  /* ====================================
   STOP DEVICE CAMERA
==================================== */

  const stopCamera = async () => {
    try {
      /* =========================
       STOP HTML5 QR CAMERA
    ========================= */

      if (scannerInstance && typeof scannerInstance.clear === "function") {
        try {
          await scannerInstance.clear();
        } catch {
          // ignore cleanup errors
        }
      }

      /* =========================
       FORCE STOP MEDIA TRACKS
    ========================= */

      const video = document.querySelector("#qr-reader video");

      if (video?.srcObject) {
        const tracks = video.srcObject.getTracks();

        tracks.forEach((track) => track.stop());

        video.srcObject = null;
      }
    } catch (err) {
      console.error("Camera stop error:", err);
    }
  };

  /* ====================================
     RESET / RESCAN
  ==================================== */
  /*
  const resetScanner = () => {
    setVisit(null);
    setRemarks("");
    window.location.reload();
  };
*/

  const resetScanner = async () => {
    await stopCamera();
    setVisit(null);
    setRemarks("");
    setManualCode("");

    /* =====================
       FORCE REINITIALIZE
       SCANNER
    ====================== */

    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  /* ====================================
   LOAD ACTIVE VISITS
==================================== */

  const loadActiveVisits = async () => {
    try {
      const res = await api.get("/storage/visits/active");

      setActiveVisits(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ====================================
   INITIAL PAGE LOAD
==================================== */

  useEffect(() => {
    loadActiveVisits();
  }, []);

  /* ====================================
   REFRESH ACTIVE VISITS
   AFTER CHECK-IN
==================================== */

  useEffect(() => {
    if (visit) {
      loadActiveVisits();
    }
  }, [visit]);

  /* ====================================
   AUTO REFRESH ACTIVE VISITS
==================================== */

  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveVisits();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  /* ====================================
     PAGE
  ==================================== */

  return (
    <Box p={6}>
      <Heading mb={6}>Storage Visit Page</Heading>

      {/* ==============================
          SCANNER SECTION
      =============================== */}

      {!visit && (
        <Box
          maxW="700px"
          mx="auto"
          bg="white"
          p={6}
          borderRadius="lg"
          boxShadow="md"
        >
          <Text mb={4} fontWeight="bold">
            Scan Visitor QR Pass
          </Text>

          <Box id="qr-reader" />

          <Button
            mt={4}
            colorScheme="red"
            variant="outline"
            onClick={stopCamera}
          >
            Stop Scanning
          </Button>

          <Alert status="info" mt={6} borderRadius="md">
            <AlertIcon />
            If camera scanning fails, use a barcode scanner or manually enter
            the visit code.
          </Alert>

          <Box mt={6}>
            <FormControl>
              <FormLabel>Barcode / Approval Code</FormLabel>

              <Input
                placeholder="Scan barcode or type code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  /* ======================
                  2D SCANNER SUPPORT
                  ======================= */

                  if (e.key === "Enter") {
                    validateManualVisit();
                  }
                }}
              />
            </FormControl>

            <Button
              mt={4}
              colorScheme="blue"
              onClick={validateManualVisit}
              isLoading={manualLoading}
            >
              Validate Visit
            </Button>
          </Box>
        </Box>
      )}

      {/* ==============================
          LOADING
      =============================== */}

      {loading && (
        <Flex justify="center" mt={6}>
          <Spinner size="xl" />
        </Flex>
      )}

      {/* ==============================
          APPROVED VISIT
      =============================== */}

      {visit && (
        <Box
          maxW="800px"
          mx="auto"
          bg="white"
          p={8}
          borderRadius="lg"
          boxShadow="lg"
        >
          <VStack align="stretch" spacing={5}>
            {/* =====================
                HEADER
            ====================== */}

            <Flex justify="space-between" align="center">
              <HStack>
                <FiCheckCircle size={28} color="green" />
                <Heading size="md">Approved Visit</Heading>
              </HStack>

              <Badge colorScheme="green" fontSize="0.9em" p={2}>
                CHECKED IN
              </Badge>
            </Flex>

            <Divider />

            {/* =====================
                VISIT DETAILS
            ====================== */}

            <Box>
              <Text mb={2}>
                <strong>Customer:</strong> {visit.customer_name}
              </Text>

              <Text mb={2}>
                <strong>Storage No:</strong> {visit.storage_no}
              </Text>

              <Text mb={2}>
                <strong>Branch:</strong> {visit.branch_name}
              </Text>

              <Text mb={2}>
                <strong>Visit Date:</strong>{" "}
                {/*{new Date(visit.visit_date).toLocaleDateString()} */}
                {formatDate(visit.visit_date)}
              </Text>

              <Text mb={2}>
                <strong>Approved By:</strong> {visit.approved_by || "-"}
              </Text>
            </Box>

            {/* =====================
                REMARKS
            ====================== */}

            <Box>
              <Text mb={2} fontWeight="bold">
                Visit Remarks
              </Text>

              <Textarea
                placeholder="Enter remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Box>

            {/* =====================
                ACTIONS
            ====================== */}

            <HStack spacing={4}>
              <Button
                colorScheme="blue"
                onClick={completeVisit}
                isLoading={loading}
              >
                Complete Visit
              </Button>

              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                onClick={resetScanner}
              >
                Scan Another
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* ====================================
        ACTIVE VISITS
      ==================================== */}
      <Box mt={10} bg="white" p={6} borderRadius="lg" boxShadow="md">
        <Heading size="md" mb={5}>
          Active Storage Visits
        </Heading>

        {activeVisits.length === 0 ? (
          <Flex justify="center" py={8} color="gray.500">
            No active visits
          </Flex>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Customer</Th>
                <Th>Storage No</Th>
                <Th>Branch</Th>
                <Th>Time In</Th>
                <Th>Duration</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>

            <Tbody>
              {activeVisits.map((item) => {
                const durationMinutes = Number(item.duration_minutes || 0);

                return (
                  <Tr key={item.visit_log_id}>
                    <Td>{item.customer_name}</Td>
                    <Td>{item.storage_no}</Td>
                    <Td>{item.branch_name}</Td>
                    <Td>{new Date(item.checked_in_at).toLocaleString()}</Td>

                    <Td>
                      <Badge
                        colorScheme={
                          durationMinutes > 120
                            ? "red"
                            : durationMinutes > 60
                              ? "orange"
                              : "green"
                        }
                      >
                        {durationMinutes < 60
                          ? `${durationMinutes} mins`
                          : `${(durationMinutes / 60).toFixed(1)} hrs`}
                      </Badge>
                    </Td>

                    <Td>
                      <Badge colorScheme="green">CHECKED IN</Badge>
                    </Td>

                    <Td>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => {
                          setVisit({
                            ...item,
                            visit_date: item.visit_date,
                            approved_by: item.approved_by,
                          });
                          setRemarks(item.remarks || "");
                        }}
                      >
                        Checkout
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
