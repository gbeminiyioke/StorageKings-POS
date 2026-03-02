import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  VStack,
  HStack,
  Select,
  Text,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export default function UserForm({
  roles,
  branches,
  onSubmit,
  editingUser,
  onCancel,
}) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [allBranches, setAllBranches] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const selectedBranches = watch("branches") || [];

  useEffect(() => {
    if (editingUser) {
      reset(editingUser);
      setAllBranches(editingUser.all_branches);
    }
  }, [editingUser, reset]);

  const handleCaps = (e) => setCapsLock(e.getmodifierState("CapsLLock"));

  const toggleAllBranches = (checked) => {
    setAllBranches(checked);
    if (checked) {
      reset({
        ...watch(),
        branches: branches.map((b) => b.branch_id),
      });
    } else {
      reset({ ...watch(), branches: [] });
    }
  };

  useEffect(() => {
    if (selectedBranches.length !== branches.length && allBranches) {
      setAllBranches(false);
    }
  }, [selectedBranches, branches, allBranches]);

  return (
    <Box bg="white" p={6} rounded="lg" mb={6}>
      {capsLock && (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          Caps Loock is ON
        </Alert>
      )}

      <form onSubmit={handleSubmit(onsubmit)} autoComplete="off">
        <VStack spacing={4} align="stretch">
          <FormControl isInvalid={errors.fullname}>
            <FormLabel>Full Name</FormLabel>
            <Input
              onKeyUp={handleCaps}
              {...register("fullname", { required: true })}
            />
          </FormControl>

          <FormControl isInvalid={errors.email}>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              onKeyUp={handleCaps}
              {...register("email", { required: true })}
            />
          </FormControl>

          <FormControl isInvalid={errors.password}>
            <FormLabel>Password</FormLabel>
            <InputGroup>
              <Input
                type={showPass ? "text" : "password"}
                onKeyUp={handleCaps}
                {...register("password", {
                  required: !editingUser,
                })}
              />
              <InputRightElement>
                <IconButton
                  icon={showPass ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowPass(!showPass)}
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          <FormControl isInvalid={errors.coonfirmPassword}>
            <FormLabel>Confirm Password</FormLabel>
            <InputGroup>
              <Input
                type={showConfirm ? "text" : "password"}
                onKeyUp={handleCaps}
                {...register("confirmPassword", {
                  validate: (v) => v === watch("password"),
                })}
              />
              <InputRightElement>
                <IconButton
                  icon={showConfirm ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowConfirm(!showConfirm)}
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          <FormControl isInvalid={errors.roleId}>
            <FormLabel>Role</FormLabel>
            <Select {...register("roleId", { required: true })}>
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl isInvalid={errors.branches}>
            <FormLabel>Branches</FormLabel>
            <Checkbox
              isChecked={allBranches}
              onChange={(e) => toggleAllBranches(e.target.checked)}
            >
              All Branches
            </Checkbox>

            <VStack align="start" pl={4}>
              {branches.map((b) => (
                <Checkbox
                  key={b.branch_id}
                  value={b.branch_id}
                  {...register("branches", {
                    validate: (v) => v.length > 0,
                  })}
                >
                  {b.branch_name}
                </Checkbox>
              ))}
            </VStack>
          </FormControl>

          <HStack justify="flex-end">
            {editingUser && (
              <Button onClick={onCancel} variant="ghost">
                Cancel
              </Button>
            )}

            <Button type="submit" colorScheme="blue">
              {editingUser ? "Update User" : "Create User"}
            </Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  );
}
