import React from "react";
import { VStack, Heading, Text, Badge } from "@chakra-ui/react";
import { motion } from "framer-motion";

const MotionVStack = motion(VStack);

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good Morning ☀️",
      message: "Start your day with confidence.",
      badge: "Morning Shift",
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good Afternoon 🌤️",
      message: "Welcome back to your workspace.",
      badge: "Business Hours",
    };
  }

  return {
    greeting: "Good Evening 🌙",
    message: "Let's finish today's work strong.",
    badge: "Evening Session",
  };
};

export default function LoginHeader() {
  const { greeting, message, badge } = getGreeting();

  return (
    <MotionVStack
      align="flex-start"
      spacing={3}
      mb={8}
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
      }}
    >
      <Badge
        colorScheme="blue"
        borderRadius="full"
        px={4}
        py={1}
        fontSize="0.75rem"
        textTransform="none"
      >
        {badge}
      </Badge>

      <Heading
        size="lg"
        color="gray.800"
        fontWeight="800"
        letterSpacing="-0.5px"
      >
        {greeting}
      </Heading>

      <Text fontSize="lg" fontWeight="600" color="gray.700">
        Welcome back
      </Text>

      <Text color="gray.500" lineHeight="tall" maxW="340px">
        {message}
        <br />
        Sign in to continue to your StorageKings workspace.
      </Text>
    </MotionVStack>
  );
}
