import React, { useMemo } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Link,
  Select,
  Text,
} from "@chakra-ui/react";

import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

import { FiMail, FiHome, FiLock } from "react-icons/fi";

import logo from "../../assets/logo-storagekings.png";

import LoginHeader from "./LoginHeader";
import LoginToggle from "./LoginToggle";
import SecurityFooter from "./SecurityFooter";

export default function LoginForm({
  register,
  handleSubmit,
  errors,
  onSubmit,
  loginType,
  setLoginType,
  branches,
  showPassword,
  setShowPassword,
  capsLockOn,
  handleCapsLock,
  navigate,
  error,
  isSubmitting,
}) {
  const isStaff = loginType === "staff";

  /*
   * Generate a stable password field name.
   * Prevents creating a new random name every render.
   */
  const passwordFieldName = useMemo(() => {
    if (!isStaff) return "password";

    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `password_${crypto.randomUUID()}`;
    }

    return `password_${Date.now()}`;
  }, [isStaff]);

  return (
    <>
      {/* =======================================================
          HEADER
      ======================================================= */}

      <Flex justify="center" mb={5}>
        <Image
          src={logo}
          alt="StorageKings"
          maxH={{
            base: "56px",
            md: "68px",
          }}
        />
      </Flex>

      <LoginHeader />

      {/* =======================================================
          CUSTOMER / STAFF TOGGLE
      ======================================================= */}

      <LoginToggle loginType={loginType} setLoginType={setLoginType} />

      {/* =======================================================
          LOGIN ERROR
      ======================================================= */}

      {error && (
        <Alert status="error" mb={6} borderRadius="xl">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* =======================================================
          FORM START
      ======================================================= */}

      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        {/* =======================================================
            EMAIL
        ======================================================= */}

        <FormControl mb={5} isInvalid={errors.email}>
          <FormLabel fontWeight="600" color="gray.700">
            Email Address
          </FormLabel>

          <InputGroup size="lg">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiMail} color="gray.400" />
            </InputLeftElement>

            <Input
              type="email"
              placeholder="Enter your email address"
              autoComplete={isStaff ? "off" : "email"}
              borderRadius="14px"
              h="54px"
              bg="whiteAlpha.900"
              borderColor="gray.200"
              _hover={{
                borderColor: "blue.300",
              }}
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px #3182CE",
              }}
              {...register("email", {
                required: "Enter your email",
              })}
            />
          </InputGroup>

          <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
        </FormControl>

        {/* =======================================================
            STAFF BRANCH
        ======================================================= */}

        {isStaff && (
          <FormControl mb={5} isInvalid={errors.branchId}>
            <FormLabel fontWeight="600" color="gray.700">
              Branch
            </FormLabel>

            <InputGroup size="lg">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiHome} color="gray.400" />
              </InputLeftElement>

              <Select
                pl="42px"
                h="54px"
                borderRadius="14px"
                placeholder="Select your branch"
                bg="whiteAlpha.900"
                borderColor="gray.200"
                _hover={{
                  borderColor: "blue.300",
                }}
                _focus={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px #3182CE",
                }}
                {...register("branchId", {
                  required: "Please select a branch",
                })}
              >
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.branch_name}
                  </option>
                ))}
              </Select>
            </InputGroup>

            <FormErrorMessage>{errors.branchId?.message}</FormErrorMessage>
          </FormControl>
        )}

        {/* =======================================================
            PASSWORD
        ======================================================= */}

        <FormControl mb={3} isInvalid={errors.password}>
          <FormLabel fontWeight="600" color="gray.700">
            Password
          </FormLabel>

          {isStaff && (
            <>
              <Input type="text" name="fake-user" display="none" />

              <Input type="password" name="fake-pass" display="none" />
            </>
          )}

          <InputGroup size="lg">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiLock} color="gray.400" />
            </InputLeftElement>

            <Input
              type={showPassword ? "text" : "password"}
              name={passwordFieldName}
              autoComplete={isStaff ? "new-password" : "current-password"}
              onKeyUp={isStaff ? handleCapsLock : undefined}
              placeholder="Enter your password"
              h="54px"
              borderRadius="14px"
              bg="whiteAlpha.900"
              borderColor="gray.200"
              _hover={{
                borderColor: "blue.300",
              }}
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px #3182CE",
              }}
              {...register("password", {
                required: "Enter your password",
              })}
            />

            <InputRightElement h="54px">
              <IconButton
                variant="ghost"
                aria-label="Toggle Password"
                icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowPassword(!showPassword)}
              />
            </InputRightElement>
          </InputGroup>

          <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
        </FormControl>

        {/* =======================================================
            CAPS LOCK
        ======================================================= */}

        {isStaff && capsLockOn && (
          <Alert status="warning" mt={4} mb={4} borderRadius="xl">
            <AlertIcon />
            Caps Lock is currently ON.
          </Alert>
        )}

        {/* =======================================================
            FORGOT PASSWORD
        ======================================================= */}

        <Flex justify="flex-end" mb={7}>
          <Link
            color="blue.500"
            fontWeight="600"
            fontSize="sm"
            _hover={{
              textDecoration: "none",
              color: "blue.600",
            }}
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
          </Link>
        </Flex>

        {/* =======================================================
            SIGN IN BUTTON
        ======================================================= */}

        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Signing In..."
          spinnerPlacement="start"
          w="100%"
          h="56px"
          borderRadius="14px"
          fontSize="md"
          fontWeight="700"
          color="white"
          bgGradient="linear(to-r, blue.600, blue.500)"
          transition="all .25s ease"
          _hover={{
            bgGradient: "linear(to-r, blue.700, blue.600)",
            transform: "translateY(-2px)",
            boxShadow: "0 12px 30px rgba(37,99,235,.30)",
          }}
          _active={{
            transform: "translateY(0)",
          }}
        >
          Sign In
        </Button>

        {/* =======================================================
            CUSTOMER LINKS
        ======================================================= */}

        {!isStaff && (
          <Box mt={8}>
            <Text fontSize="sm" textAlign="center" color="gray.600" mb={3}>
              New to StorageKings?
            </Text>

            <Flex justify="center" gap={6} wrap="wrap">
              <Link
                color="blue.500"
                fontWeight="600"
                onClick={() => navigate("/register")}
                _hover={{
                  textDecoration: "none",
                  color: "blue.600",
                }}
              >
                Create Account
              </Link>

              <Link
                color="blue.500"
                fontWeight="600"
                onClick={() => navigate("/kyc")}
                _hover={{
                  textDecoration: "none",
                  color: "blue.600",
                }}
              >
                Customer KYC
              </Link>
            </Flex>
          </Box>
        )}

        {/* =======================================================
            STAFF NOTICE
        ======================================================= */}

        {isStaff && (
          <Text
            mt={7}
            textAlign="center"
            fontSize="sm"
            color="gray.500"
            fontWeight="500"
          >
            Staff access is monitored and restricted.
          </Text>
        )}
      </form>

      {/* =======================================================
          SECURITY FOOTER
      ======================================================= */}

      <SecurityFooter />
    </>
  );
}
