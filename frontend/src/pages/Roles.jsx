import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Input,
  Select,
  Grid,
  Heading,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Textarea,
  useToast,
  IconButton,
  Switch,
  Badge,
  ScaleFade,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, CopyIcon } from "@chakra-ui/icons";
import { useEffect, useRef, useState } from "react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

/*---------------------------------------------
  MODULE GROUPING
-----------------------------------------------*/
const MODULE_GROUPS = {
  Dashboard: [{ label: "Home", key: "dashboard" }],
  Sales: [{ label: "Sales", key: "sales" }],
  Inventory: [
    { label: "Inventory", key: "inventory" },
    { label: "Receive Items", key: "receive_items" },
    { label: "Discharge Items", key: "discharge_items" },
    { label: "Storage", key: "storage" },
    { label: "Transfer", key: "transfer" },
  ],
  Customers: [{ label: "Customers", key: "customers" }],
  Management: [
    { label: "POS Terminals", key: "pos_terminals" },
    { label: "Branches", key: "branches" },
    { label: "Roles", key: "roles" },
    { label: "Users", key: "users" },
    { label: "Security", key: "security" },
  ],
  Reports: [
    { label: "Reports & Analytics", key: "reports_and_analytics" },
    { label: "Audit Log", key: "audit_logs" },
  ],
};

//const MODULES = Object.values(MODULE_GROUPS).flat();
const MODULES = Object.values(MODULE_GROUPS)
  .flat()
  .map((m) => m.key);

const RIGHTS = [
  { label: "Can View", key: "can_view" },
  { label: "Can Create", key: "can_create" },
  { label: "Can Edit", key: "can_edit" },
  { label: "Can Delete", key: "can_delete" },
  { label: "Can Vew Security", key: "can_view_security" },
];
/*---------------------------------------------
  INITIAL PERMISSION STATE
-----------------------------------------------*/
const initialPermissions = {
  ...RIGHTS.reduce((acc, r) => ({ ...acc, [r.key]: false }), {}),
  ...MODULES.reduce((acc, m) => ({ ...acc, [m]: false }), {}),
};

export default function Roles() {
  const toast = useToast();
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    role_name: "",
    role_description: "",
    default_page: "",
    enable: true,
  });
  const [permissions, setPermissions] = useState(initialPermissions);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const cancelRef = useRef();

  const fetchRoles = async () => {
    if (!user?.permissions?.can_view) return;
    const res = await api.get("/roles");
    setRoles(res.data);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  /*========================================
    RESET
  ==========================================*/
  const resetForm = () => {
    setForm({
      role_name: "",
      role_description: "",
      default_page: "",
      enable: true,
    });
    setPermissions(initialPermissions);
    setEditingId(null);
  };

  /*===================================
    GET SELECTED MODULES
  ====================================*/
  const selectedModules = MODULES.filter((m) => permissions[m]);

  /*==================================
    SELECT ALL MODULES AND RIGHTS
  ====================================*/
  const allModulesSelected = MODULES.every((m) => permissions[m]);
  /*===================================
    SELECT ALL RIGHTS
  =====================================*/
  const allRightsSelected = RIGHTS.every((r) => permissions[r.key]);

  const selectAllModules = (value) => {
    const updated = { ...permissions };
    MODULES.forEach((m) => (updated[m] = value));
    setPermissions(updated);

    if (!value) {
      setForm((f) => ({ ...f, default_page: "" }));
    }
  };

  const selectAllRights = (value) => {
    const updated = { ...permissions };
    RIGHTS.forEach((r) => (updated[r.key] = value));
    setPermissions(updated);
  };

  /*==================================
    VALIDATE
  ====================================*/
  const validate = () => {
    const hasRight = RIGHTS.some((r) => permissions[r.key]);
    //VALIDATE DEFAUT PAGE EXISTS IN SELECTED MODULES (IF SELECTED)
    if (!form.role_name.trim()) {
      toast({ title: "Role name is required", status: "warning" });
      return false;
    }

    if (!hasRight) {
      toast({ title: "Select at least one right", status: "warning" });
      return false;
    }

    if (
      form.default_page === "" ||
      !selectedModules.includes(form.default_page)
    ) {
      toast({
        title: "Select a valid default page from the list",
        status: "warning",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (editingId) {
        await api.put(`/roles/${editingId}`, { ...form, permissions });
        toast({ title: "Role updated", status: "success" });
      } else {
        await api.post("/roles", { ...form, permissions });
        toast({ title: "Role created", status: "success" });
      }

      resetForm();
      fetchRoles();
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Error",
        status: "error",
      });
    }
  };

  const handleEdit = (role) => {
    setEditingId(role.role_id);

    setForm({
      role_name: role.role_name,
      role_description: role.role_description,
      default_page: role.default_page || "",
      enable: role.enable,
    });

    const perms = { ...initialPermissions };
    Object.keys(perms).forEach((key) => {
      perms[key] = !!role[key];
    });

    setPermissions(perms);
  };

  /*=================================
    CLONE
  ===================================*/
  const handleClone = (role) => {
    handleEdit(role);
    setEditingId(null);
    setForm((prev) => ({
      ...prev,
      role_name: `${role.role_name} Copy`,
    }));
  };

  /*===================================
    DELETE
  =====================================*/
  const confirmDelete = (role) => {
    setRoleToDelete(role);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!roleToDelete) return;

    try {
      const res = await api.delete(`/roles/${roleToDelete.role_id}`);
      if (res.data.attachedUsers) {
        toast({
          title: "Cannot delete role",
          description: "This role is attached to users.",
          status: "warning",
        });
      } else {
        toast({ title: "Role deleted!", status: "success" });
        fetchRoles();
      }
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Error deleting role",
        status: "error",
      });
    } finally {
      setIsDeleteOpen(false);
      setRoleToDelete(null);
    }
  };

  const rightsSelected = RIGHTS.filter((r) => permissions[r.key]);

  return (
    <Box p={6}>
      <Heading size="md" mb={6}>
        {editingId ? "Edit Role" : "Add New Role"}
      </Heading>

      <SimpleGrid columns={[1, 2]} spacing={6}>
        <Input
          borderWidth="2px"
          placeholder="Role Name"
          value={form.role_name}
          onChange={(e) => setForm({ ...form, role_name: e.target.value })}
        />

        <Select
          borderWidth="2px"
          placeholder="Select Default Page"
          value={form.default_page}
          onChange={(e) => setForm({ ...form, default_page: e.target.value })}
          isDisabled={selectedModules.length === 0}
        >
          {selectedModules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>

        <Textarea
          borderWidth="2px"
          placeholder="Role Description"
          value={form.role_description}
          onChange={(e) =>
            setForm({ ...form, role_description: e.target.value })
          }
        />

        <Flex align="center" gap={3}>
          <Text>Enable</Text>
          <Switch
            isChecked={form.enable}
            onChange={(e) => setForm({ ...form, enable: e.target.checked })}
          />
        </Flex>
      </SimpleGrid>

      <Divider my={8} borderColor="gray.400" />

      {/* RIGHTS */}
      <Flex justify="space-between" align="center">
        <Heading size="sm">Rights</Heading>
        <Flex align="center" gap={2}>
          <Text fontSize="sm">Select All</Text>
          <Switch
            colorScheme="purple"
            isChecked={allRightsSelected}
            onChange={(e) => selectAllRights(e.target.checked)}
          />
        </Flex>
      </Flex>

      <Flex gap={6} mt={4} wrap="wrap">
        {RIGHTS.map((r) => (
          <Checkbox
            key={r.key}
            isChecked={permissions[r.key]}
            onChange={(e) =>
              setPermissions((prev) => ({
                ...prev,
                [r.key]: e.target.checked,
              }))
            }
          >
            {r.label}
          </Checkbox>
        ))}
      </Flex>

      <Divider my={8} borderColor="gray.400" />

      {/* MODULES */}
      <Flex justify="space-between" align="center">
        <Heading size="sm">Modules</Heading>
        <Flex align="center" gap={2}>
          <Text fontSize="sm">Select All</Text>
          <Switch
            colorScheme="purple"
            isChecked={allModulesSelected}
            onChange={(e) => selectAllModules(e.target.checked)}
          />
        </Flex>
      </Flex>

      {Object.entries(MODULE_GROUPS).map(([group, modules]) => (
        <Box key={group} mt={6}>
          <Heading size="xs" mb={3}>
            {group}
          </Heading>

          <Grid templateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap={4}>
            {modules.map((m) => (
              <ScaleFade in key={m.key}>
                <Checkbox
                  isChecked={permissions[m.key]}
                  onChange={(e) =>
                    setPermissions((prev) => ({
                      ...prev,
                      [m.key]: e.target.checked,
                    }))
                  }
                >
                  {m.label}
                </Checkbox>
              </ScaleFade>
            ))}
          </Grid>
        </Box>
      ))}

      {/* SUMMARY */}
      <Box mt={8} bg="gray.50" borderRadius="md">
        <Heading size="xs" mb={2}>
          Permission Summary
        </Heading>

        <Flex wrap="wrap" gap={2}>
          {rightsSelected.map((r) => (
            <Badge key={r.key} colorScheme="blue">
              {r.label}
            </Badge>
          ))}

          {selectedModules.map((m) => (
            <Badge key={m} colorScheme="purple">
              {m}
            </Badge>
          ))}
        </Flex>
      </Box>

      <Button
        mt={6}
        colorScheme="blue"
        onClick={handleSubmit}
        isDisabled={!user?.permissions?.can_create && !editingId}
      >
        {editingId ? "Update Role" : "Save Role"}
      </Button>

      {editingId && (
        <Button mt={6} ml={3} onClick={resetForm}>
          Cancel
        </Button>
      )}

      {/* ROLE LIST */}
      {user?.permissions?.can_view && (
        <>
          <Divider my={10} borderColor="gray.400" />
          <Heading size="sm" mb={4}>
            Existing Roles
          </Heading>
          <Table>
            <Thead bg="gray.100">
              <Tr>
                <Th>Role</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th textAlign="center">Actions</Th>
              </Tr>
            </Thead>

            <Tbody>
              {roles.map((r) => (
                <Tr key={r.role_id}>
                  <Td>{r.role_name}</Td>
                  <Td>{r.role_description}</Td>
                  <Td>{r.enable ? "Enabled" : "Disabled"}</Td>
                  <Td textAlign="center">
                    {user.permissions.can_view && (
                      <IconButton
                        icon={<EditIcon />}
                        size="sm"
                        mr={2}
                        onClick={() => handleEdit(r)}
                      />
                    )}

                    <IconButton
                      icon={<CopyIcon />}
                      size="sm"
                      mr={2}
                      onClick={() => handleClone(r)}
                    />

                    {user.permissions.can_delete && (
                      <IconButton
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => confirmDelete(r)}
                      />
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}

      {/* DELETE CONFIRMATION */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Role
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the role "
              {roleToDelete?.role_name}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>

              <Button colorScheme="red" onClick={handleDeleteConfirmed} ml={3}>
                Yes, Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
