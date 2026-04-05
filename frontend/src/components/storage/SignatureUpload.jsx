import { Box, Button, Image, Input, Text, VStack } from "@chakra-ui/react";
import { useRef } from "react";

export default function SignatureUpload({ label, value, onChange }) {
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <VStack align="start" spacing={2}>
      <Text fontWeight="semibold">{label}</Text>

      <Input
        ref={fileRef}
        type="file"
        accept="image/*"
        display="none"
        onChange={handleFile}
      />

      <Box
        w="220px"
        h="120px"
        border="2px dashed"
        borderColor="gray.300"
        borderRadius="md"
        overflow="hidden"
        cursor="pointer"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <Image
            src={value}
            alt={label}
            objectFit="contain"
            w="100%"
            h="100%"
          />
        ) : (
          <Text color="gray.500" fontSize="sm">
            Click to upload signature
          </Text>
        )}
      </Box>

      {value && (
        <Button
          size="xs"
          colorScheme="red"
          variant="link"
          onClick={() => onChange(null)}
        >
          Remove
        </Button>
      )}
    </VStack>
  );
}
