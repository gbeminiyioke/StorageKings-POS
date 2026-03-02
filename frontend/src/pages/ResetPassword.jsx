import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
  InputGroup,
  InputRightElement,
  IconButton,
  Input,
  Alert,
  AlertIcon,
  Text,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate, data, Form } from "react-router-dom";
import { useState } from "react";
import publicApi from "../api/publicApi";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { register, handleSubmit, watch } = useForm();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const type = params.get("type");

  const onSubmit = async (data) => {
    setError("");
    try {
      const res = await publicApi.post("/auth/reset-password", {
        token,
        password: data.password,
        type: params.get("type"),
      });
      //SAVE TOKEN
      localStorage.setItem("token", res.data.token);

      //SHOW SUCCESS BREIFLY
      alert("Password updated successfuly");

      //RE-DIRECT
      navigate(
        res.data.loginType === "staff" ? "/dashboard" : "/customer-home",
      );
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired reset link");
    }
  };

  /*-----------------------------------
    DETECT CAPS LOCK
  -------------------------------------*/
  const handleCapsLock = (e) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box bg="white" p={8} rounded="md" w="100%" maxW="420px" boxShadow="md">
        <Text fontSize="xl" mb={4} fontWeight="bold">
          Reset Password
        </Text>

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <FormControl mb={4}>
            <FormLabel>New Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                name="password"
                onKeyUp={handleCapsLock}
                {...register("password", { required: true })}
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
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Confirm Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                name="password"
                onKeyUp={handleCapsLock}
                {...register("confirmPassword", {
                  validate: (v) =>
                    v === watch("password") || "Passwords do not match",
                })}
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
          </FormControl>

          <Button type="submit" w="100%" colorScheme="blue">
            Update Password
          </Button>
        </form>
      </Box>
    </Flex>
  );
}
