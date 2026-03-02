import {
  Box,
  Button,
  Heading,
  Input,
  FormControl,
  FormLabel,
  Select,
  Switch,
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useToast,
  Flex,
  Badge,
  Text,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, CopyIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const Branches = () => {
  const toast = useToast();
  const { hasPermission } = useAuth([]);
  const [businesses, setBusinesses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    branch_name: "",
    branch_address: "",
    branch_email: "",
    branch_telephone: "",
    branch_prefix: "",
    enable: false,
    hq_branch: false,
    comments: "",
  });

  /*======================================
    FETCH BUSINESSES
  ========================================*/
  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const res = await api.get("/business?enable=true");
        const data = res.data || [];

        setBusinesses(data);

        if (data.length > 0) {
          setSelectedBusiness(data[0].business_id);
        }
      } catch {
        setBusinesses([]);
      }
    };
    loadBusinesses();
  }, []);

  /*======================================
    FETCH BANCHES
  ========================================*/
  const fetchBranches = async (businessId) => {
    try {
      const res = await api.get(`/branches?business_id=${businessId}`);
      setBranches(res.data);
    } catch {
      setBranches([]);
    }
  };

  useEffect(() => {
    if (selectedBusiness) fetchBranches(selectedBusiness);
  }, [selectedBusiness]);

  /*========================================
    SAVE/UPDATE
  ==========================================*/
  const handleSave = async () => {
    if (!selectedBusiness)
      return toast({ title: "Select a business", status: "error" });
    if (!form.branch_name) return toast({ title: "Branch name required" });
    if (!form.branch_address)
      return toast({ title: "Branch address is required" });
    if (!form.branch_prefix)
      return toast({ title: "Branch prefix is required", status: "error" });

    try {
      if (editingId) {
        await api.put(`/branches/${editingId}`, {
          ...form,
          business_id: selectedBusiness,
        });
        toast({ title: "Branch updated", status: "success" });
      } else {
        await api.post("/branches", {
          ...form,
          business_id: selectedBusiness,
        });
        toast({ title: "Branch created", status: "success" });
      }

      resetForm();
      fetchBranches(selectedBusiness);
    } catch (err) {
      toast({
        title: err.response?.data?.message || "Error",
        status: "error",
      });
    }
  };

  const resetForm = () => {
    setForm({
      branch_name: "",
      branch_address: "",
      branch_email: "",
      branch_telephone: "",
      enable: false,
      hq_branch: false,
      branch_prefix: "",
      comments: "",
    });
    setEditingId(null);
  };

  const handleEdit = (branch) => {
    setEditingId(branch.branch_id);
    setForm(branch);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete branch?")) return;

    await api.delete(`/branches/${id}`);
    fetchBranches(selectedBusiness);
  };

  const handleClone = (branch) => {
    const { branch_id, ...rest } = branch;
    setForm({ ...rest, branch_name: branch.branch_name + " Copy" });
    setEditingId(null);
  };

  /*====================================
    PREFIX VALLIDATION
  ======================================*/
  const handlePrefixChange = (value) => {
    const letter = value
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 1);
    setForm({ ...form, branch_prefix: letter });
  };

  return (
    <Box p={6}>
      <Box maxW="1000px" mx="auto">
        <Heading mb={6}>Branches</Heading>

        {/* BUSINESS SELECT */}
        <FormControl mb={6} maxW="400px">
          <FormLabel>Business</FormLabel>
          <Select
            placeholder="Select Business"
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
          >
            {businesses.map((b) => (
              <option key={b.business_id} value={b.business_id}>
                {b.business_name}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* FORM */}
        <Box bg="white" p={4} rounded="md" shadow="sm" mb={8}>
          <Flex gap={6} wrap="wrap">
            <FormControl flex="1" minW="250px">
              <FormLabel>Branch Name</FormLabel>
              <Input
                value={form.branch_name}
                onChange={(e) =>
                  setForm({ ...form, branch_name: e.target.value })
                }
              />
            </FormControl>

            <FormControl flex="1" minW="250px">
              <FormLabel>Address</FormLabel>
              <Input
                value={form.branch_address}
                onChange={(e) =>
                  setForm({ ...form, branch_address: e.target.value })
                }
              />
            </FormControl>

            <FormControl flex="1" minW="250px">
              <FormLabel>Email</FormLabel>
              <Input
                value={form.branch_email}
                onChange={(e) =>
                  setForm({ ...form, branch_email: e.target.value })
                }
              />
            </FormControl>

            <FormControl flex="1" minW="250px">
              <FormLabel>Telephone</FormLabel>
              <Input
                value={form.branch_telephone}
                onChange={(e) =>
                  setForm({ ...form, branch_telephone: e.target.value })
                }
              />
            </FormControl>
          </Flex>

          <Flex gap={10} mt={6} align="center" wrap="wrap">
            <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel mb="0">Enable</FormLabel>
              <Switch
                isChecked={form.enable}
                onChange={(e) => setForm({ ...form, enable: e.target.checked })}
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel mb="0">HQ Branch</FormLabel>
              <Switch
                isChecked={form.hq_branch}
                onChange={(e) =>
                  setForm({ ...form, hq_branch: e.target.checked })
                }
              />
            </FormControl>

            <FormControl w="120px">
              <FormLabel>Branch Prefix</FormLabel>
              <Input
                value={form.branch_prefix}
                onChange={(e) => handlePrefixChange(e.target.value)}
                maxLength={1}
                textTransform="uppercase"
                placeholder="A"
              />
            </FormControl>
          </Flex>

          <FormControl mt={4}>
            <FormLabel>Comments</FormLabel>
            <Textarea
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
            />
          </FormControl>

          <Flex gap={4} mt={4}>
            {hasPermission("can_create") && (
              <Button colorScheme="blue" onClick={handleSave}>
                {editingId ? "Update Branch" : "Save Branch"}
              </Button>
            )}

            <Button onClick={resetForm}>Cancel</Button>
          </Flex>
        </Box>

        <Table bg="white" shadow="sm" rounded="lg">
          <Thead bg="gray.50">
            <Tr>
              <Th>Name</Th>
              <Th>Address</Th>
              <Th>Email</Th>
              <Th>Telephone</Th>
              <Th>Status</Th>
              <Th>Prefix</Th>
              <Th></Th>
            </Tr>
          </Thead>

          <Tbody>
            {branches.map((b) => (
              <Tr
                key={b.branch_id}
                bg={b.hq_branch ? "green.50" : "transparent"}
              >
                <Td>{b.branch_name}</Td>
                <Td>{b.branch_address}</Td>
                <Td>{b.branch_email}</Td>
                <Td>{b.branch_telephone}</Td>
                <Td>{b.enable ? "Enabled" : "Disabled"}</Td>
                <Td>{b.branch_prefix}</Td>
                <Td>
                  {hasPermission("can_edit") && (
                    <IconButton
                      icon={<EditIcon />}
                      size="sm"
                      mr={2}
                      onClick={() => handleEdit(b)}
                    />
                  )}

                  {hasPermission("can_edit") && (
                    <IconButton
                      icon={<CopyIcon />}
                      size="sm"
                      mr={2}
                      onClick={() => handleClone(b)}
                    />
                  )}

                  {hasPermission("can_delete") && (
                    <IconButton
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => handleDelete(b.branch_id)}
                    />
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default Branches;
