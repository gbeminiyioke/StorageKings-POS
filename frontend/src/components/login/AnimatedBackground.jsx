import { Box } from "@chakra-ui/react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export default function AnimatedBackground() {
  return (
    <Box
      position="fixed"
      inset="0"
      overflow="hidden"
      zIndex={0}
      bgGradient="linear(to-br, blue.900, blue.700, cyan.500)"
    >
      {/* Animated Gradient */}
      <MotionBox
        position="absolute"
        inset="-30%"
        bgGradient="radial(whiteAlpha.300, transparent 70%)"
        animate={{
          x: [0, 120, -80, 0],
          y: [0, -80, 80, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating Circle 1 */}
      <MotionBox
        position="absolute"
        w="320px"
        h="320px"
        borderRadius="full"
        bg="whiteAlpha.100"
        filter="blur(60px)"
        top="10%"
        left="5%"
        animate={{
          y: [-20, 30, -20],
          x: [-10, 25, -10],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating Circle 2 */}
      <MotionBox
        position="absolute"
        w="260px"
        h="260px"
        borderRadius="full"
        bg="cyan.300"
        opacity={0.12}
        filter="blur(80px)"
        bottom="10%"
        right="8%"
        animate={{
          y: [25, -35, 25],
          x: [20, -15, 20],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </Box>
  );
}
