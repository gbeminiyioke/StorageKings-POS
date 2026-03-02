import { Table, Thead, Tbody, Tr, Th, Td, Button } from "@chakra-ui/react";

export default function UsersTable({ users, onEdit, onDelete }) {
  return (
    <Table bg="white" rounded="lg">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>Enabled</Th>
          <Th></Th>
        </Tr>
      </Thead>
      <Tbody>
        {users.map((u) => (
          <Tr key={u.id}>
            <Td>{u.fullname}</Td>
            <Td>{u.email}</Td>
            <Td>{u.role}</Td>
            <Td>{u.enable ? "Yes" : "No"}</Td>
            <Td>
              <Button size="sm" onClick={() => onEdit(u)}>
                Edit
              </Button>
              <Button
                size="sm"
                ml={2}
                colorScheme="red"
                onClick={() => onDelete(u.id)}
              >
                Delete
              </Button>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
