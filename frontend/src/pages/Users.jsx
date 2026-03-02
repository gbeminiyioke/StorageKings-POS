import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Switch,
  Select,
  Heading,
  Text,
  SimpleGrid,
  Divider,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  InputGroup,
  InputRightElement,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Spinner,
} from "@chakra-ui/react";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  ViewIcon,
  ViewOffIcon,
  EditIcon,
  DeleteIcon,
  CopyIcon,
} from "@chakra-ui/icons";
import { useForm, Watch } from "react-hook-form";
import api from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Users() {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fulllname: "",
      email: "",
      password: "",
      confirmPassword: "",
      enable: false,
    },
  });

  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [branchRoles, setBranchRoles] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [capsLockConfirm, setCapsLockConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [deleteId, setDeleteId] = useState(null);
  const cancelRef = useRef();

  /*==================================
    LOAD DATA
  ====================================*/
  const loadData = async () => {
    const branchRes = await api.get("/branches");
    const roleRes = await api.get("/roles");
    const userRes = await api.get("/users");

    setBranches(branchRes.data.filter((b) => b.enable));
    setRoles(roleRes.data.filter((r) => r.enable));
    setUsers(userRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  /*=====================================
    SEARCH LOGIC
  =======================================*/
  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      `${u.fullname} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [users, search]);

  /*=====================================
    PAGINATION LOGIC
  =======================================*/
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /*=====================================
     BRANCH TOGGLE
  =======================================*/
  const toggleBranch = (branchId) => {
    setBranchRoles((prev) => {
      const updated = { ...prev };

      if (updated[branchId]) {
        delete updated[branchId];
      } else {
        updated[branchId] = { role_id: "" };
      }

      return updated;
    });
  };

  const handleRoleChange = (branchId, role_id) => {
    setBranchRoles((prev) => ({
      ...prev,
      [branchId]: { role_id },
    }));
  };

  /*===================================
    VAIDATION
  =====================================*/
  const validateForm = (data) => {
    if (!data.fullname) return "Fullname is required";
    if (!data.email) return "Email is required";
    if (!editingId && !data.password) return "Password is required";
    if (data.password !== data.confirmPassword) return "Passwords do not match";

    const selectedBranches = Object.keys(branchRoles);
    if (selectedBranches.length === 0)
      return "At least one branch must be selected";

    for (const b of selectedBranches) {
      if (!branchRoles[b].role_id)
        return "Each selected branch must have a role";
    }

    return null;
  };

  /*=====================================
    SAVE
  =======================================*/
  const onSubmit = async (data) => {
    const error = validateForm(data);
    if (error) {
      toast({ title: error, status: "error" });
      return;
    }

    try {
      const payload = {
        fullname: data.fullname,
        email: data.email,
        password: data.password,
        enable: data.enable || false,
        branchRoles: Object.entries(branchRoles).map(([branch_id, value]) => ({
          branch_id: parseInt(branch_id),
          role_id: parseInt(value.role_id),
        })),
      };

      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
        toast({ title: "User updated", status: "success" });
      } else {
        await api.post("/users", payload);
        toast({ title: "User created", status: "success" });
      }

      resetForm();
      loadData();
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Error saving user",
        status: "error",
      });
    }
  };

  /*=====================================
    EDIT
  =======================================*/
  const handleEdit = async (user) => {
    setEditingId(user.id);
    setValue("fullname", user.fullname);
    setValue("email", user.email);
    setValue("enable", user.enable, { shouldValidate: true });

    //FETCH USER BRANCH-ROLE MAPPING
    const res = await api.get(`/users/${user.id}/branches`);
    const mappings = res.data;

    const mapped = {};
    mappings.forEach((m) => {
      mapped[String(m.branch_id)] = { role_id: String(m.role_id) };
    });

    setBranchRoles(mapped);
  };

  /*===================================
      COPY
    =====================================*/
  const handleCopy = (user) => {
    setEditingId(null);
    setValue("fullname", user.fullname + " Copy");
    setValue("email", "");
  };

  const confirmDelete = async () => {
    try {
      if (!deleteId) return;

      await api.delete(`/users/${deleteId}`);

      toast({
        title: "User deleted",
        status: "success",
      });

      setDeleteId(null);
      loadData();
    } catch (err) {
      toast({
        title: "Failed to delete user",
        status: "error",
      });
    }
  };

  const resetForm = () => {
    reset({
      fullname: "",
      email: "",
      password: "",
      confirmPassword: "",
      enable: false,
    });
    setBranchRoles({});
    setEditingId(null);
  };

  /*====================================
    USER INTERFACE (UI)
  ======================================*/
  return (
    <Box p={6} autoComplete="off">
      <Heading mb={4}>Users</Heading>

      {/*======= PERSONAL INFORMATION =======*/}
      <Box borderWidth="1px" p={4} borderRadius="lg">
        <Heading size="md" mb={4}>
          Personal Information
        </Heading>

        <SimpleGrid columns={2} spacing={4}>
          <FormControl isInvalid={errors.fullname}>
            <FormLabel>Fullname</FormLabel>
            <Input
              autoComplete="off"
              {...register("fullname", { required: true })}
            />
            <FormErrorMessage>Required</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={errors.email}>
            <FormLabel>Email</FormLabel>
            <Input
              autoComplete="off"
              {...register("email", { required: true })}
            />
            <FormErrorMessage>Required</FormErrorMessage>
          </FormControl>

          <FormControl>
            <FormLabel>Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                isDisabled={!!editingId}
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
            {capsLock && <Text color="red.500"> CapsLock is ON</Text>}
          </FormControl>

          <FormControl>
            <FormLabel>Confirm Password</FormLabel>
            <InputGroup>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                isDisabled={!!editingId}
                {...register("confirmPassword")}
                onKeyUp={(e) =>
                  setCapsLockConfirm(e.getModifierState("CapsLock"))
                }
              />
              <InputRightElement>
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </InputRightElement>
            </InputGroup>
            {capsLockConfirm && (
              <Text color="red.500" fontSize="sm">
                CapsLock is ON
              </Text>
            )}
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">Enable</FormLabel>
            <Switch
              isChecked={watch("enable")}
              onChange={(e) => setValue("enable", e.target.checked)}
            />
          </FormControl>
        </SimpleGrid>
      </Box>

      {/*=========== ACCESS ============= */}
      <Box borderWidth="1px" p={4} mb={6} borderRadius="lg">
        <Heading size="md" mb={4}>
          Branches & Access
        </Heading>

        {branches.map((branch) => (
          <Flex key={branch.branch_id} align="center" mb={3}>
            <Switch
              mr={4}
              isChecked={!!branchRoles[branch.branch_id]}
              onChange={() => toggleBranch(branch.branch_id)}
            />

            <Text w="200px">{branch.branch_name}</Text>

            <Select
              placeholder="Select role"
              w="250px"
              isDisabled={!branchRoles[branch.branch_id]}
              value={branchRoles[branch.branch_id]?.role_id || ""}
              onChange={(e) =>
                handleRoleChange(branch.branch_id, e.target.value)
              }
            >
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </Select>

            <Text ml={4} fontSize="sm" color="gray.500">
              {
                roles.find(
                  (r) =>
                    r.role_id ===
                    parseInt(branchRoles[branch.branch_id]?.role_id),
                )?.role_description
              }
            </Text>
          </Flex>
        ))}
      </Box>

      {/*================== SAVE BUTTON ================== */}
      <Flex mt={4} gap={3}>
        {hasPermission("can_create") && (
          <Button colorScheme="blue" onClick={handleSubmit(onSubmit)}>
            {editingId ? "Update User" : "Save User"}
          </Button>
        )}

        <Button variant="outline" onClick={resetForm}>
          Cancel
        </Button>
      </Flex>

      <Divider my={6} />

      {/* ================ EXISTING USERS ================= */}
      <Heading size="md" mb={2}>
        Existing Users ({filteredUsers.length})
      </Heading>

      {/* ==================== SEARCH ======================*/}
      <Input
        placeholder="Search by fullname or email..."
        mb={3}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
      />

      {tableLoading ? (
        <Spinner />
      ) : (
        <>
          <Table>
            <Thead>
              <Tr>
                <Th>Fullname</Th>
                <Th>Email</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>

            <Tbody>
              {paginatedUsers.map((u) => (
                <Tr key={u.id}>
                  <Td>{u.fullname}</Td>
                  <Td>{u.email}</Td>
                  <Td>{u.enable ? "Enabled" : "Disabled"}</Td>
                  <Td>
                    {hasPermission("can_edit") && (
                      <IconButton
                        icon={<EditIcon />}
                        mr={2}
                        size="sm"
                        onClick={() => handleEdit(u)}
                      />
                    )}

                    <IconButton
                      icon={<CopyIcon />}
                      mr={2}
                      size="sm"
                      onClick={() => handleCopy(u)}
                    />

                    {hasPermission("can_delete") && (
                      <IconButton
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => setDeleteId(u.id)}
                      />
                    )}

                    {/* ====== AUDIT TRAIL ====== */}
                    <Button
                      size="xs"
                      ml={2}
                      onClick={() =>
                        (window.location.href = `/audit?user=${u.id}`)
                      }
                    >
                      Audit
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {/* ========= PAGINATION CONTROLS ========= */}
          <Flex mt={4} justify="space-between">
            <Button
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Prev
            </Button>

            <Text>
              Page {currentPage} of {totalPages || 1}
            </Text>

            <Button
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </Flex>
        </>
      )}

      {/* DELETE DIALOG */}
      <AlertDialog
        isOpen={!!deleteId}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteId(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete User</AlertDialogHeader>
            <AlertDialogBody>
              Delete user? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
