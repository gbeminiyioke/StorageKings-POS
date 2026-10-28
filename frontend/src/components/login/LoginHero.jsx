import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Image,
} from "@chakra-ui/react";

import { motion } from "framer-motion";

import { FiCheckCircle, FiDatabase, FiShield, FiPackage } from "react-icons/fi";

import logo from "../../assets/logo-storagekings.png";

const MotionBox = motion(Box);

const features = [
  {
    icon: FiPackage,
    text: "Inventory & Storage",
  },
  {
    icon: FiDatabase,
    text: "Multi-Branch Operations",
  },
  {
    icon: FiShield,
    text: "Enterprise Security",
  },
  {
    icon: FiCheckCircle,
    text: "Barcode Tracking",
  },
];

export default function LoginHero() {
  return (
    <MotionBox
      display={{ base: "none", lg: "flex" }}
      flex="1"
      px={16}
      color="white"
      alignItems="center"
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
    >
      <Box maxW="560px">
        <Image src={logo} h="80px" mb={8} />

        <Heading size="xl" lineHeight="1.0" mb={6}>
          Storage Homes For Busy Lagos Homes & Businesses
        </Heading>

        <Text fontSize="lg" opacity={0.9} mb={10}>
          Secure, scalable and intelligent inventory, storage and logistics
          management for modern multi-branch businesses.
        </Text>

        <VStack align="start" spacing={5}>
          {features.map((item) => (
            <HStack key={item.text}>
              <Icon as={item.icon} />
              <Text>{item.text}</Text>
            </HStack>
          ))}
        </VStack>
      </Box>
    </MotionBox>
  );
}
