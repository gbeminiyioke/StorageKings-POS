import { useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  useToast,
} from "@chakra-ui/react";

import { useAuth } from "../context/AuthContext";
import api from "../api/api";

const WARNING_TIME = 7 * 60 * 1000; // 40 minutes
const LOGOUT_TIME = 12 * 60 * 1000; // 45 minutes
const COUNTDOWN_SECONDS = 300; // 5 minutes

export default function IdleWarningModal() {
  const { logout, isAuthenticated } = useAuth();
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  const warningTimer = useRef(null);
  const logoutTimer = useRef(null);
  const countdownInterval = useRef(null);
  const lastActivityRef = useRef(0);
  const modalOpenRef = useRef(false);

  const clearAllTimers = () => {
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
      warningTimer.current = null;
    }

    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }

    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
  };

  const startCountdown = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }

    setSecondsLeft(COUNTDOWN_SECONDS);

    countdownInterval.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current);
          countdownInterval.current = null;
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  const resetTimers = () => {
    clearAllTimers();
    setIsOpen(false);

    warningTimer.current = setTimeout(() => {
      setIsOpen(true);
      startCountdown();
    }, WARNING_TIME);

    logoutTimer.current = setTimeout(() => {
      clearAllTimers();
      setIsOpen(false);

      toast({
        title: "Session expired",
        description: "You have been logged out due to inactivity.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });

      logout();
    }, LOGOUT_TIME);
  };

  const continueSession = async () => {
    try {
      setIsOpen(false);

      await api.post("/auth/ping");

      toast({
        title: "Session extended",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      resetTimers();
    } catch (err) {
      console.error(err);

      toast({
        title: "Failed to extend session",
        description: err.response?.data?.message || "Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLogout = async () => {
    clearAllTimers();
    setIsOpen(false);
    await logout();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    modalOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setIsOpen(false);
      return;
    }

    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const activityHandler = () => {
      if (modalOpenRef.current) {
        return;
      }
      const now = Date.now();

      // Debounce activity updates
      if (now - lastActivityRef.current < 5000) {
        return;
      }

      lastActivityRef.current = now;

      resetTimers();
    };

    events.forEach((event) => {
      window.addEventListener(event, activityHandler);
    });

    resetTimers();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, activityHandler);
      });

      clearAllTimers();
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      isCentered
    >
      <ModalOverlay />

      <ModalContent>
        <ModalHeader>Session Expiring</ModalHeader>

        <ModalBody>
          <Text textAlign="center">
            Your session will expire due to inactivity.
          </Text>

          <Text
            mt={4}
            fontSize="3xl"
            fontWeight="bold"
            textAlign="center"
            color="red.500"
          >
            {formatTime(secondsLeft)}
          </Text>

          <Text mt={2} fontSize="sm" color="gray.500" textAlign="center">
            Click "Continue Working" to keep your session active.
          </Text>
        </ModalBody>

        <ModalFooter>
          <Button mr={3} colorScheme="red" onClick={handleLogout}>
            Logout
          </Button>

          <Button colorScheme="blue" onClick={continueSession}>
            Continue Working
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
