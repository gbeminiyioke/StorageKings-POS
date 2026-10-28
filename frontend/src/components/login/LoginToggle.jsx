import React from "react";
import { Box, Button, HStack, Icon } from "@chakra-ui/react";
import { FaUser, FaUserTie } from "react-icons/fa";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export default function LoginToggle({ loginType, setLoginType }) {
  const options = [
    {
      value: "customer",
      label: "Customer",
      icon: FaUser,
    },
    {
      value: "staff",
      label: "Staff",
      icon: FaUserTie,
    },
  ];

  return (
    <Box position="relative" bg="gray.100" p="4px" borderRadius="full" mb={8}>
      <HStack spacing={1} position="relative">
        {options.map((option) => {
          const active = loginType === option.value;

          return (
            <Button
              key={option.value}
              flex={1}
              h="48px"
              borderRadius="full"
              variant="ghost"
              fontWeight={600}
              color={active ? "white" : "gray.600"}
              leftIcon={<Icon as={option.icon} />}
              onClick={() => setLoginType(option.value)}
              position="relative"
              overflow="hidden"
              _hover={{
                color: active ? "white" : "blue.600",
              }}
            >
              {active && (
                <MotionBox
                  layoutId="loginToggleBackground"
                  position="absolute"
                  inset="0"
                  borderRadius="full"
                  bgGradient="linear(to-r, blue.600, blue.500)"
                  zIndex={0}
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 35,
                  }}
                />
              )}

              <Box
                position="relative"
                zIndex={1}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Icon as={option.icon} />
                {option.label}
              </Box>
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
}
