import React from "react";
import { HStack, VStack, Text, Icon, Divider } from "@chakra-ui/react";
import { FiShield, FiMonitor, FiClock } from "react-icons/fi";
import { motion } from "framer-motion";

const MotionVStack = motion(VStack);

const items = [
  {
    icon: FiShield,
    title: "Secure Login",
    description: "Protected Authentication",
  },
  {
    icon: FiMonitor,
    title: "Device Protected",
    description: "Device Verification",
  },
  {
    icon: FiClock,
    title: "Session Monitored",
    description: "Continuous Monitoring",
  },
];

export default function SecurityFooter() {
  return (
    <MotionVStack
      mt={10}
      spacing={5}
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.25,
        duration: 0.45,
      }}
    >
      <Divider />

      <HStack
        spacing={8}
        justify="center"
        align="flex-start"
        flexWrap="wrap"
        w="100%"
      >
        {items.map((item) => (
          <VStack key={item.title} spacing={1} minW="90px">
            <Icon as={item.icon} boxSize={5} color="blue.500" />

            <Text
              fontSize="xs"
              fontWeight="700"
              color="gray.700"
              textAlign="center"
            >
              {item.title}
            </Text>

            <Text
              fontSize="10px"
              color="gray.500"
              textAlign="center"
              lineHeight="short"
            >
              {item.description}
            </Text>
          </VStack>
        ))}
      </HStack>
    </MotionVStack>
  );
}
