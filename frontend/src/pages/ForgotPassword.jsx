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
  Select,
  Spinner,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import publicApi from "../api/publicApi";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setAlert(null);
    setLoading(true);

    try {
      const res = await publicApi.post("/auth/forgot-password", {
        email: data.email,
        loginType: data.loginType,
      });

      setAlert({
        type: "success",
        message:
          res.data?.message ||
          "If the email exists, a reset link has been sent.",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box bg="white" p={8} rounded="md" w="100%" maxW="420px" boxShadow="md">
        <Text fontSize="xl" mb={4} fontWeight="bold">
          Forgot Password
        </Text>

        {alert && (
          <Alert status={alert.type} mb={4}>
            <AlertIcon />
            {alert.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl mb={4}>
            <FormLabel>Login Type</FormLabel>
            <Select
              {...register("loginType", { required: true })}
              defaultValue="customer"
            >
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
            </Select>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="Enter your email"
              {...register("email", { required: true })}
            />
          </FormControl>

          <Button
            type="submit"
            w="100%"
            colorScheme="blue"
            isDisabled={loading}
          >
            {loading ? <Spinner size="sm" /> : "Send Reset Link"}
          </Button>
        </form>
      </Box>
    </Flex>
  );
}
