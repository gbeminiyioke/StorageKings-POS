import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
  Text,
  Select,
  Image,
  Link,
  useToast,
  Toast,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { FaUser, FaUserTie } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import publicApi from "../api/publicApi";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo-storagekings.png";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [loginType, setLoginType] = useState("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");

  const isStaff = loginType === "staff";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  /*------------------------------------- 
  LOAD ENABLED BRANCHES (STAFF ONLY) ---------------------------------------*/
  useEffect(() => {
    if (!isStaff) return;

    publicApi
      .get("/branches/public/enabled")
      .then((res) => setBranches(res.data || []))
      .catch(() => setBranches([]));
  }, [isStaff]);

  /*=======================================
    RESET FORM WHEN SWITCHING LOGIN TYPE
  =========================================*/
  useEffect(() => {
    reset();
    setError("");
    setCapsLockOn(false);
  }, [loginType, reset]);

  /*=======================================
    CAPS LOCK DETECTION (STAFF ONLY)
  =========================================*/
  const handleCapsLock = (e) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  /*=======================================
    SUBMIT HANDLER
  =========================================*/
  const onSubmit = async (data) => {
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email: data.email,
        password: data.password,
        loginType,
        branchId: isStaff ? data.branchId : null,
      });

      // Response should now include role_id
      const { token, defaultPage, permissions, roleName, name } = res.data;

      // SAVE FULL USER CONTEXT
      login({
        token,
        permissions,
        roleName,
        name,
        defaultPage,
      });

      // Redirect based on loginType & defaultPage
      if (loginType === "staff") {
        if (!defaultPage || defaultPage === "dashboard") {
          navigate("/dashboard");
        } else {
          navigate(`/dashboard/${defaultPage}`);
        }
      } else {
        navigate("/customer-home");
      }
    } catch (err) {
      const message = err.response?.data?.message;
      if (err.response?.status === 423) {
        Toast({
          title: "Account Locked",
          description: message,
          status: "error",
        });
      } else {
        toast({
          title: "Login Failed",
          description: message || "Invalid Credentials",
          status: "error",
        });
      }
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box bg="white" p={8} rounded="md" w="100%" maxW="420px" boxShadow="md">
        {/* Logo */}
        <Flex justify="center" mb={4}>
          <Image src={logo} alt="Client logo" maxH="60px" />
        </Flex>

        {/* Login type toggle */}
        <Flex mb={6} gap={2}>
          <Button
            flex={1}
            leftIcon={<FaUser />}
            colorScheme="blue"
            variant={loginType === "customer" ? "solid" : "outline"}
            onClick={() => setLoginType("customer")}
          >
            Customer
          </Button>
          <Button
            flex={1}
            leftIcon={<FaUserTie />}
            colorScheme="blue"
            variant={loginType === "staff" ? "solid" : "outline"}
            onClick={() => setLoginType("staff")}
          >
            Staff
          </Button>
        </Flex>

        {error && (
          <Alert status="error" mb={4} rounded="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          {/* Email */}
          <FormControl mb={4} isInvalid={errors.email}>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="Enter your email"
              autoComplete={isStaff ? "off" : "email"}
              {...register("email", { required: "Enter your Email" })}
            />
            <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
          </FormControl>

          {/* Branch select for staff */}
          {isStaff && (
            <FormControl mb={4} isInvalid={errors.branchId}>
              <FormLabel>Branch</FormLabel>
              <Select
                placeholder="Select branch"
                {...register("branchId", { required: "Select branch" })}
              >
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.branch_name}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{errors.branchId?.message}</FormErrorMessage>
            </FormControl>
          )}

          {/* Password */}
          <FormControl mb={4} isInvalid={errors.password}>
            <FormLabel>Password</FormLabel>
            {isStaff && (
              <>
                <Input
                  type="text"
                  name="fake-user"
                  style={{ display: "none" }}
                />
                <Input
                  type="password"
                  name="fake-pass"
                  style={{ display: "none" }}
                />
              </>
            )}
            <InputGroup>
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete={isStaff ? "new-password" : "current-password"}
                name={isStaff ? `password_${Math.random()}` : "password"}
                onKeyUp={isStaff ? handleCapsLock : undefined}
                {...register("password", { required: "Enter your password" })}
              />
              <InputRightElement>
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Toggle password"
                  icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
          </FormControl>

          <Flex justify="flex-end" mb={4}>
            <Link
              fontSize="sm"
              color="blue.500"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </Link>
          </Flex>

          {isStaff && capsLockOn && (
            <Alert status="warning" mb={4} rounded="md">
              <AlertIcon />
              Caps Lock is ON
            </Alert>
          )}

          <Button type="submit" colorScheme="blue" w="100%" mt={2}>
            Login
          </Button>
        </form>

        <Text mt={4} fontSize="sm" textAlign="center">
          Don't have an account?{" "}
          <Link color="blue.500" onClick={() => navigate("/register")}>
            Create Account
          </Link>
        </Text>

        <Text mt={4} fontSize="sm" textAlign="center" color="gray.500">
          {isStaff ? "Staff access - restricted" : "Customer access"}
        </Text>
      </Box>
    </Flex>
  );
}
