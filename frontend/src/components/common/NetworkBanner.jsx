import { Alert, AlertIcon } from "@chakra-ui/react";

import { useNetwork } from "../../context/NetworkContext";

export default function NetworkBanner() {
  const { online } = useNetwork();

  if (online) return null;

  return (
    <Alert
      status="warning"
      justifyContent="center"
      position="fixed"
      top="0"
      left="0"
      right="0"
      zIndex="9999"
    >
      <AlertIcon />
      Internet connection lost. Trying to reconnect...
    </Alert>
  );
}
