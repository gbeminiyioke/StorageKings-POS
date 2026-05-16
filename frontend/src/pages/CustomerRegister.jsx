import React, { useState } from "react";
import {
  Box,
  Grid,
  Input,
  Select,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Button,
  Flex,
  Text,
  IconButton,
  Spinner,
  InputGroup,
  InputRightElement,
  useToast,
  Heading,
} from "@chakra-ui/react";

import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import publicApi from "../api/publicApi";

export default function CustomerRegister() {
  const navigate = useNavigate();
  const toast = useToast();

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [capsLock, setCapsLock] = useState(false);

  const [capsLockConfirm, setCapsLockConfirm] = useState(false);

  const defaultValues = {
    fullname: "",
    customer_type: "",
    sex: "",
    telephone: "",
    address_1: "",
    address_2: "",
    address_3: "",
    fax: "",
    email: "",
    website: "",
    contact_name: "",
    contact_telephone: "",
    whatsapp: "",
    ig: "",
    facebook: "",

    enable: true,

    indemnity_agreement_locked: false,
    warehouse_agreement_locked: false,

    password: "",
    confirmPassword: "",
  };

  const {
    register,
    watch,
    handleSubmit,
    setError,

    formState: { errors },
  } = useForm({
    defaultValues,
  });

  const customerType = watch("customer_type", "Coporate");

  const validateForm = (data) => {
    if (!data.password) return "Password required";

    if (data.password !== data.confirmPassword) {
      return "Passwords do not match";
    }

    return null;
  };

  const onSubmit = async (data) => {
    const error = validateForm(data);

    if (error) {
      toast({
        title: error,
        status: "error",
      });

      return;
    }

    try {
      setLoading(true);

      await publicApi.post("/customers/register", {
        ...data,
        current_balance: 0,
        payment_terms: 0,
        enable: true,
        indemnity_agreement_locked: false,
        warehouse_agreement_locked: false,
      });

      toast({
        title: "Account created successfully",
        status: "success",
      });

      navigate("/login");
    } catch (err) {
      if (err.response?.data?.message === "EMAIL_EXISTS") {
        setError("email", {
          type: "manual",
          message: "Email already exists",
        });

        return;
      }

      toast({
        title: err.response?.data?.message || "Registration failed",

        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    //navigate("/Login");
    window.location.href = "/login";
  };

  return (
    <Flex minH="100vh" justify="center" bg="gray.50" py={8}>
      <Box bg="white" w="50%" minW="700px" p={8} shadow="lg" rounded="lg">
        <Heading size="md" mb={6} textAlign="center">
          Create Customer Account
        </Heading>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid
            templateColumns={
              customerType === "Individual" ? "2fr 1fr 1fr" : "2fr 2fr"
            }
            gap={4}
          >
            <FormControl isInvalid={errors.fullname} isRequired>
              <FormLabel>Customer Name</FormLabel>

              <Input
                {...register("fullname", {
                  required: "Customer name required",
                })}
              />

              <FormErrorMessage>{errors.fullname?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.customer_type} isRequired>
              <FormLabel>Customer Type</FormLabel>

              <Select
                placeholder="Select customer type"
                {...register("customer_type", {
                  required: "Customer type required",
                })}
              >
                <option value="Coporate">Coporate</option>

                <option value="Individual">Individual</option>
              </Select>

              <FormErrorMessage>
                {errors.customer_type?.message}
              </FormErrorMessage>
            </FormControl>

            {customerType === "Individual" && (
              <FormControl isInvalid={errors.sex} isRequired>
                <FormLabel>Sex</FormLabel>

                <Select
                  placeholder="Select sex"
                  {...register("sex", { required: "Sex required" })}
                >
                  <option>Male</option>
                  <option>Female</option>
                </Select>

                <FormErrorMessage>{errors.sex?.message}</FormErrorMessage>
              </FormControl>
            )}
          </Grid>

          <Grid templateColumns="2fr 1fr 1fr" gap={4} mt={4}>
            <FormControl isInvalid={errors.email} isRequired>
              <FormLabel>Email</FormLabel>

              <Input
                type="email"
                {...register("email", {
                  required: "Email required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email",
                  },
                })}
              />

              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>Password</FormLabel>

              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                />

                <InputRightElement>
                  <IconButton
                    size="sm"
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>

              {capsLock && (
                <Text color="red.500" fontSize="sm">
                  Caps Lock ON
                </Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Confirm Password</FormLabel>

              <InputGroup>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  onKeyUp={(e) =>
                    setCapsLockConfirm(e.getModifierState("CapsLock"))
                  }
                />

                <InputRightElement>
                  <IconButton
                    size="sm"
                    icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                </InputRightElement>
              </InputGroup>

              {capsLockConfirm && (
                <Text color="red.500" fontSize="sm">
                  Caps Lock ON
                </Text>
              )}
            </FormControl>
          </Grid>

          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl isInvalid={errors.telephone} isRequired>
              <FormLabel>Telephone</FormLabel>

              <Input
                {...register("telephone", {
                  required: "Telephone required",
                })}
              />

              <FormErrorMessage>{errors.telephone?.message}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>Whatsapp</FormLabel>

              <Input {...register("whatsapp")} />
            </FormControl>
          </Grid>

          <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
            <FormControl>
              <FormLabel>Address 1</FormLabel>

              <Input {...register("address_1")} />
            </FormControl>

            <FormControl>
              <FormLabel>Address 2</FormLabel>

              <Input {...register("address_2")} />
            </FormControl>
          </Grid>

          {customerType === "Coporate" && (
            <Grid templateColumns="1fr 1fr" gap={4} mt={4}>
              <FormControl isInvalid={errors.contact_name} isRequired>
                <FormLabel>Contact Name</FormLabel>

                <Input
                  {...register("contact_name", {
                    required: "Contact Name required",
                  })}
                />

                <FormErrorMessage>
                  {errors.contact_name?.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.contact_telephone} isRequired>
                <FormLabel>Contact Telephone</FormLabel>

                <Input
                  {...register("contact_telephone", {
                    required: "Contact telephone required",
                  })}
                />

                <FormErrorMessage>
                  {errors.contact_telephone?.message}
                </FormErrorMessage>
              </FormControl>
            </Grid>
          )}

          <Flex justify="center" gap={4} mt={8}>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={loading}
              leftIcon={loading && <Spinner size="sm" />}
            >
              Create Account
            </Button>

            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </Flex>
        </form>
      </Box>
    </Flex>
  );
}
