import React from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  useToast,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import api from "../api/api";

/*----------------------------------------------
  BUSINESS PAGE
------------------------------------------------*/
const Business = () => {
  const toast = useToast();

  /*-----------------STATE---------------------*/
  const [business, setBusiness] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    db_user: "",
    db_name: "",
    db_password: "",
    max_branches: "",
  });

  /*--------------FETCH BUSINESSES-------------*/
  const fetchBusinesses = async () => {
    try {
      const res = await api.get("/business");
      setBusiness(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      toast({ title: "Failed to load businesses.", status: "error" });
    }
  };

  useEffect(() => {
    //axios.get("/business").then((res) => setBusiness(res.data));
    fetchBusinesses();
  }, []);

  /*---------------INPUT HANDLER-----------------*/
  const handleChange = (e) => {
    const { name, value } = e.target;

    //MAX BRANCHES MUST BE NUMERIC
    if (name === "max_branches" && !/^\d*$/.test(value)) return;

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /*---------------CAPS LOCK CHECK----------------*/
  const handleKeyUp = (e) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  /*-----------------VALIDATE FORM-----------------*/
  const isValid = () => {
    return (
      form.business_name.trim() &&
      form.db_user.trim() &&
      form.db_name.trim() &&
      form.db_password.trim() &&
      form.max_branches !== ""
    );
  };

  /*-------------------RESET FORM-------------------*/
  const resetForm = () => {
    setForm({
      business_name: "",
      db_user: "",
      db_name: "",
      db_password: "",
      max_branches: "",
    });
    setEditingId(null);
  };

  /*---------------------SUBMIT---------------------*/
  const handleSubmit = async () => {
    if (!isValid()) {
      toast({
        title: "All fields are required",
        description: "One or more fields are missing",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      if (editingId) {
        await api.put(`/business/${editingId}`, {
          ...form,
          max_branches: Number(form.max_branches),
        });
        toast({
          title: "Business updated",
          description: "Selected business was updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        //const res = await axios.post('http://localhost:5000/api/business/register', data);
        //await axios.post("/api/business", {
        await api.post("/business", {
          ...form,
          max_branches: Number(form.max_branches),
        });
        toast({
          title: "Business created",
          description: "Business was created successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      resetForm();
      fetchBusinesses();
    } catch (err) {
      toast({
        title: "Operation failed!",
        description: "The operation was not successful, try again!",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  /*----------------------EDIT--------------------- */
  const handleEdit = (biz) => {
    setForm({
      business_name: biz.business_name,
      db_user: biz.db_user,
      db_name: biz.db_name,
      db_password: biz.db_password,
      max_branches: String(biz.max_branches),
    });
    setEditingId(biz.business_id);
  };

  /*----------------------DELETE---------------------*/
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this business?")) return;

    try {
      await api.delete(`/business/${id}`);
      toast({
        title: "Business deleted",
        description: "Selected business was deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchBusinesses();
    } catch {
      toast({
        title: "Delete failed!",
        description: "Could not delete selected business",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  /*------------------------UI--------------------------- */
  return (
    <Box p={6}>
      <Flex minH="100vh" align="center" justify="center" bg="gray.50">
        <Box bg="white" p={8} rounded="md" w="100%" maxW="60%" boxShadow="md">
          <Heading mb={6}>Business Setup</Heading>
          {/*---------------FORM----------------*/}
          <Flex wrap="wrap" gap={4}>
            <FormControl isRequired>
              <FormLabel>Business Name</FormLabel>
              <Input
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Database User</FormLabel>
              <Input
                name="db_user"
                value={form.db_user}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Database Name</FormLabel>
              <Input
                name="db_name"
                value={form.db_name}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Database Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  name="db_password"
                  autoComplete="new-password"
                  value={form.db_password}
                  onChange={handleChange}
                  onKeyUp={handleKeyUp}
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>
              {capsLockOn && (
                <Text color="orange.400" fontSize="sm">
                  ⚠ Caps Lock is ON
                </Text>
              )}
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Max Branches</FormLabel>
              <Input
                name="max_branches"
                value={form.max_branches}
                onChange={handleChange}
              />
            </FormControl>
          </Flex>

          <Flex mt={6} gap={4}>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isDisabled={!isValid()}
            >
              {editingId ? "Update Business" : "Create Business"}
            </Button>

            <Button variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </Flex>
        </Box>
      </Flex>

      <Divider my={8} />

      {/*-------------------BUSINESS IST-------------------*/}
      <Heading size="md" mb={4}>
        Existing Businesses
      </Heading>

      <Table>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>DB Name</Th>
            <Th>Max Branches</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>

        <Tbody>
          {business.map((biz, index) => (
            <Tr key={biz.business_id ?? `biz-${index}`}>
              <Td>{biz.business_name}</Td>
              <Td>{biz.db_name}</Td>
              <Td>{biz.max_branches}</Td>
              <Td>
                <Flex gap={2}>
                  <Button size="sm" onClick={() => handleEdit(biz)}>
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDelete(biz.business_id)}
                  >
                    Delete
                  </Button>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default Business;
