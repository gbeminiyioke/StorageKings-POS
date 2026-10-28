import React from "react";
import { Box } from "@chakra-ui/react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export default function LoginCard({ children }) {
  return (
    <MotionBox
      width="100%"
      maxW={{ base: "100%", sm: "470px", lg: "500px" }}
      initial={{
        opacity: 0,
        y: 35,
        scale: 0.96,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.6,
        ease: "easeOut",
      }}
    >
      <Box
        position="relative"
        overflow="hidden"
        borderRadius="32px"
        p={{ base: 7, md: 10 }}
        bg="rgba(255,255,255,0.82)"
        backdropFilter="blur(20px)"
        border="1px solid rgba(255,255,255,0.25)"
        boxShadow="
          0 25px 80px rgba(15,23,42,.20),
          inset 0 1px 0 rgba(255,255,255,.25)
        "
      >
        {/* Top glass reflection */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          h="1px"
          bg="rgba(255,255,255,.55)"
          pointerEvents="none"
        />

        {/* Decorative glow */}
        <Box
          position="absolute"
          top="-140px"
          right="-120px"
          w="280px"
          h="280px"
          borderRadius="full"
          bg="whiteAlpha.300"
          filter="blur(100px)"
          opacity={0.7}
          pointerEvents="none"
        />

        {/* Secondary glow */}
        <Box
          position="absolute"
          bottom="-120px"
          left="-120px"
          w="220px"
          h="220px"
          borderRadius="full"
          bg="blue.100"
          opacity={0.25}
          filter="blur(90px)"
          pointerEvents="none"
        />

        {/* Content */}
        <Box position="relative" zIndex={2}>
          {children}
        </Box>
      </Box>
    </MotionBox>
  );
}
