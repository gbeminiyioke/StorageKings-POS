import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Alert,
  AlertIcon,
  Text,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import publicApi from "../api/publicApi";
import { Navigate } from "react-router-dom";

export default function ForgotPassword() {
  const { register, handleSubmit } = useForm();
  const [status, setStatus] = useState(null);

  const onSubmit = async (data) => {
    setStatus(null);
    try {
      await publicApi.post("/auth/forgot-password", {
        email: data.email,
        loginType: data.loginType,
      });
      setStatus(res.data.message);

      setTimeout(() => {
        Navigate("/");
      }, 2000);
    } catch (err) {
      setStatus(err.response?.data.message || "Something went wrong");
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box bg="white" p={8} rounded="md" w="100%" maxW="420px" boxShadow="md">
        <Text fontSize="xl" mb={4} fontWeight="bold">
          Forgot Password
        </Text>

        {status === "success" && (
          <Alert status="success" mb={4}>
            <AlertIcon />
            If the email exists, a rest link has been sent.
          </Alert>
        )}

        {status === "error" && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            Unable to process request
          </Alert>
        )}

        {status && (
          <Alert status="info" mb={4}>
            <AlertIcon />
            {status}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl mb={4}>
            <select {...register("loginType", { required: true })}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
            </select>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="Enter your email"
              {...register("email", { required: true })}
            />
          </FormControl>

          <Button type="submit" w="100%" colorScheme="blue">
            Send Reset Link
          </Button>
        </form>
      </Box>
    </Flex>
  );
}
