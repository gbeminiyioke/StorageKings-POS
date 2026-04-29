import { Box, Button, Image, Input, Text, VStack } from "@chakra-ui/react";
import { useRef } from "react";

const PLACEHOLDER_IMAGE = "/signature-placeholder.png";

export default function SignatureUpload({
  label,
  value,
  onChange,
  isDisabled = false,
}) {
  const fileInputRef = useRef(null);

  const handleSelectFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      onChange(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <VStack align="stretch" spacing={3}>
      <Text fontWeight="medium">{label}</Text>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        display="none"
        onChange={handleSelectFile}
        isDisabled={isDisabled}
      />

      <Box
        borderWidth="1px"
        borderStyle="dashed"
        borderColor="gray.300"
        borderRadius="lg"
        p={3}
        minH="140px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor={isDisabled ? "default" : "pointer"}
        bg={isDisabled ? "gray.50" : "white"}
        onClick={() => {
          if (!isDisabled) {
            fileInputRef.current?.click();
          }
        }}
      >
        <Image
          src={value || PLACEHOLDER_IMAGE}
          fallbackSrc={PLACEHOLDER_IMAGE}
          maxH="120px"
          maxW="100%"
          objectFit="contain"
          alt={`${label} signature`}
        />
      </Box>

      {value && !isDisabled && (
        <Button
          size="sm"
          variant="ghost"
          colorScheme="red"
          alignSelf="flex-start"
          onClick={handleRemove}
        >
          Remove Signature
        </Button>
      )}
    </VStack>
  );
}
