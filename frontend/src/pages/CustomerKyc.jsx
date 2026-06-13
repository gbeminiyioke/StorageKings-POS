import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Image,
  Input,
  Select,
  Stack,
  Textarea,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";

import axios from "axios";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Canada",
  "China",
  "Egypt",
  "France",
  "Germany",
  "Ghana",
  "India",
  "Ireland",
  "Italy",
  "Japan",
  "Kenya",
  "Mexico",
  "Netherlands",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Qatar",
  "Russia",
  "Saudi Arabia",
  "South Africa",
  "Spain",
  "Sweden",
  "Switzerland",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Zambia",
  "Zimbabwe",
];

export default function CustomerKyc() {
  const navigate = useNavigate();
  const toast = useToast();

  const clientSignatureRef = useRef();
  const authorisedSignatureRef = useRef();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullNameCompanyName: "",
    emailAddress: "",
    customerType: "Individual",
    contactPerson: "",
    telephoneNumber: "",
    alternateTelephone: "",
    residentialBusinessAddress: "",
    nationality: "",
    occupationNatureOfBusiness: "",
    meansOfIdentification: "",
    idNumber: "",
    expiryDate: "",

    typeOfServiceRequired: "",
    storageDurationMonths: "",
    estimatedValueOfItems: "",
    dateOfMoveIn: "",
    itemsToBeStored: "",

    emergencyFullName: "",
    relationship: "",
    emergencyTelephone: "",
    emergencyAddress: "",

    complianceConfirmed: false,

    consentDate: "",

    kycVerifiedBy: "",
    storageUnitReferenceNumber: "",
    comments: "",
    authorisedBy: "",
  });

  const [clientSignature, setClientSignature] = useState(null);
  const [clientSignaturePreview, setClientSignaturePreview] = useState("");

  const [authorisedSignature, setAuthorisedSignature] = useState(null);
  const [authorisedSignaturePreview, setAuthorisedSignaturePreview] =
    useState("");

  const identificationOptions = useMemo(() => {
    const options = [
      "National ID Card",
      "International Passport",
      "Drivers License",
      "Voters Card",
    ];

    if (formData.customerType === "Corporate") {
      options.push("CAC Document");
    }

    return options;
  }, [formData.customerType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];

    if (!file) return;

    const preview = URL.createObjectURL(file);

    if (type === "client") {
      setClientSignature(file);
      setClientSignaturePreview(preview);
    } else {
      setAuthorisedSignature(file);
      setAuthorisedSignaturePreview(preview);
    }
  };

  const removeImage = (type) => {
    if (type === "client") {
      setClientSignature(null);
      setClientSignaturePreview("");
    } else {
      setAuthorisedSignature(null);
      setAuthorisedSignaturePreview("");
    }
  };

  const handleSubmit = async () => {
    try {
      if (
        !formData.fullNameCompanyName ||
        !formData.emailAddress ||
        !formData.telephoneNumber
      ) {
        toast({
          title: "Validation Error",
          description: "Please fill all required fields",
          status: "error",
        });

        return;
      }

      if (formData.customerType === "Corporate" && !formData.contactPerson) {
        toast({
          title: "Validation Error",
          description: "Contact Person is required for Corporate customers",
          status: "error",
        });

        return;
      }

      setLoading(true);

      const payload = new FormData();

      Object.keys(formData).forEach((key) => {
        payload.append(key, formData[key]);
      });

      if (clientSignature) {
        payload.append("clientSignature", clientSignature);
      }

      if (authorisedSignature) {
        payload.append("authorisedSignature", authorisedSignature);
      }

      await axios.post("/api/customer-kyc/create", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "Success",
        description: "KYC details saved successfully",
        status: "success",
      });

      navigate("/login");
    } catch (error) {
      toast({
        title: "Application Notice",
        description: error.response?.data?.message || "Failed to save details",
        status: "warning",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg">Customer KYC & Onboarding Form</Heading>

        {/* General Information */}
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={6}>
            General Information
          </Heading>

          <Grid templateColumns="repeat(2, 1fr)" gap={5}>
            <FormControl isRequired>
              <FormLabel>Full Name/Company Name</FormLabel>
              <Input
                name="fullNameCompanyName"
                value={formData.fullNameCompanyName}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Customer Type</FormLabel>
              <Select
                name="customerType"
                value={formData.customerType}
                onChange={handleChange}
              >
                <option>Individual</option>
                <option>Corporate</option>
              </Select>
            </FormControl>

            <FormControl isRequired={formData.customerType === "Corporate"}>
              <FormLabel>Contact Person</FormLabel>
              <Input
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Telephone Number</FormLabel>
              <Input
                name="telephoneNumber"
                value={formData.telephoneNumber}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Alternate Telephone</FormLabel>
              <Input
                name="alternateTelephone"
                value={formData.alternateTelephone}
                onChange={handleChange}
              />
            </FormControl>

            <GridItem colSpan={2}>
              <FormControl>
                <FormLabel>Residential/Business Address</FormLabel>
                <Textarea
                  name="residentialBusinessAddress"
                  value={formData.residentialBusinessAddress}
                  onChange={handleChange}
                />
              </FormControl>
            </GridItem>

            <FormControl>
              <FormLabel>Nationality</FormLabel>
              <Select
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
              >
                <option value="">Select Country</option>

                {countries.map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Occupation/Nature of Business</FormLabel>
              <Input
                name="occupationNatureOfBusiness"
                value={formData.occupationNatureOfBusiness}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Means of Identification</FormLabel>

              <Select
                name="meansOfIdentification"
                value={formData.meansOfIdentification}
                onChange={handleChange}
              >
                <option value="">Select Identification</option>

                {identificationOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>ID Number</FormLabel>
              <Input
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Expiry Date</FormLabel>
              <Input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
              />
            </FormControl>
          </Grid>
        </Box>

        {/* Storage Details */}
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={6}>
            Storage Details
          </Heading>

          <Grid templateColumns="repeat(2, 1fr)" gap={5}>
            <FormControl>
              <FormLabel>Type of Service Required</FormLabel>

              <Select
                name="typeOfServiceRequired"
                value={formData.typeOfServiceRequired}
                onChange={handleChange}
              >
                <option value="">Select Service</option>
                <option>Self Storage</option>
                <option>Warehouse Storage</option>
                <option>Car Storage</option>
                <option>Logistics/Distribution</option>
                <option>Other</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Storage Duration/Rental Period (Months)</FormLabel>

              <Input
                type="number"
                name="storageDurationMonths"
                value={formData.storageDurationMonths}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Estimate Value of Items</FormLabel>

              <Input
                type="number"
                name="estimatedValueOfItems"
                value={formData.estimatedValueOfItems}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Date of Move-In</FormLabel>

              <Input
                type="date"
                name="dateOfMoveIn"
                value={formData.dateOfMoveIn}
                onChange={handleChange}
              />
            </FormControl>

            <GridItem colSpan={2}>
              <FormControl>
                <FormLabel>Items to be stored/Service Description</FormLabel>

                <Textarea
                  name="itemsToBeStored"
                  value={formData.itemsToBeStored}
                  onChange={handleChange}
                />
              </FormControl>
            </GridItem>
          </Grid>
        </Box>

        {/* Emergency Contact */}
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={6}>
            Emergency Contact / Next of Kin
          </Heading>

          <Grid templateColumns="repeat(2, 1fr)" gap={5}>
            <FormControl>
              <FormLabel>Full Name</FormLabel>
              <Input
                name="emergencyFullName"
                value={formData.emergencyFullName}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Relationship</FormLabel>

              <Select
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
              >
                <option value="">Select Relationship</option>

                <option>Spouse / Partner</option>

                <option>Child (Son / Daughter)</option>

                <option>Parent (Mother / Father)</option>

                <option>Sibling (Brother / Sister)</option>

                <option>Grandparent / Grandchild</option>

                <option>Uncle / Aunt</option>

                <option>Niece / Nephew</option>

                <option>Cousin</option>

                <option>Other Relative</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Telephone Number</FormLabel>
              <Input
                name="emergencyTelephone"
                value={formData.emergencyTelephone}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Address</FormLabel>
              <Input
                name="emergencyAddress"
                value={formData.emergencyAddress}
                onChange={handleChange}
              />
            </FormControl>
          </Grid>
        </Box>

        {/* Compliance */}
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={6}>
            Compliance & Security Declaration
          </Heading>

          <Checkbox
            name="complianceConfirmed"
            isChecked={formData.complianceConfirmed}
            onChange={handleChange}
          >
            I hereby confirm that:
          </Checkbox>

          <Textarea
            mt={4}
            isReadOnly
            value="I confirm that all information provided is accurate and that I will not store prohibited or illegal items."
          />
        </Box>

        {/* Prohibited Items */}
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={6}>
            Prohibited Items
          </Heading>

          <FormLabel>The following items are not permitted:</FormLabel>

          <Textarea
            isReadOnly
            value="Explosives, firearms, illegal drugs, flammable materials, perishable items, toxic substances, stolen goods and any prohibited items under applicable laws."
          />
        </Box>

        {/* Client Consent */}
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={6}>
            Client Consent
          </Heading>

          <Grid templateColumns="repeat(2, 1fr)" gap={5}>
            <Box>
              <FormLabel>Client Signature</FormLabel>

              <Box
                borderWidth="1px"
                borderRadius="md"
                h="180px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                overflow="hidden"
                onClick={() => clientSignatureRef.current.click()}
              >
                {clientSignaturePreview ? (
                  <Image
                    src={clientSignaturePreview}
                    h="100%"
                    w="100%"
                    objectFit="cover"
                  />
                ) : (
                  <Text>Click to upload signature</Text>
                )}
              </Box>

              <Input
                hidden
                type="file"
                accept="image/*"
                ref={clientSignatureRef}
                onChange={(e) => handleImageChange(e, "client")}
              />

              <Button
                mt={3}
                colorScheme="red"
                size="sm"
                onClick={() => removeImage("client")}
              >
                Remove
              </Button>
            </Box>

            <FormControl>
              <FormLabel>Date</FormLabel>

              <Input
                type="date"
                name="consentDate"
                value={formData.consentDate}
                onChange={handleChange}
              />
            </FormControl>
          </Grid>
        </Box>

        {/* Official Use */}
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={6}>
            For Official Use Only
          </Heading>

          <Grid templateColumns="repeat(2, 1fr)" gap={5}>
            <FormControl>
              <FormLabel>KYC Verified By</FormLabel>

              <Input
                name="kycVerifiedBy"
                value={formData.kycVerifiedBy}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Storage Unit/Reference Number</FormLabel>

              <Input
                name="storageUnitReferenceNumber"
                value={formData.storageUnitReferenceNumber}
                onChange={handleChange}
              />
            </FormControl>

            <GridItem colSpan={2}>
              <FormControl>
                <FormLabel>Comments</FormLabel>

                <Textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                />
              </FormControl>
            </GridItem>

            <FormControl>
              <FormLabel>Authorised By</FormLabel>

              <Input
                name="authorisedBy"
                value={formData.authorisedBy}
                onChange={handleChange}
              />
            </FormControl>

            <Box>
              <FormLabel>Authorised Signature</FormLabel>

              <Box
                borderWidth="1px"
                borderRadius="md"
                h="180px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                overflow="hidden"
                onClick={() => authorisedSignatureRef.current.click()}
              >
                {authorisedSignaturePreview ? (
                  <Image
                    src={authorisedSignaturePreview}
                    h="100%"
                    w="100%"
                    objectFit="cover"
                  />
                ) : (
                  <Text>Click to upload signature</Text>
                )}
              </Box>

              <Input
                hidden
                type="file"
                accept="image/*"
                ref={authorisedSignatureRef}
                onChange={(e) => handleImageChange(e, "authorised")}
              />

              <Button
                mt={3}
                colorScheme="red"
                size="sm"
                onClick={() => removeImage("authorised")}
              >
                Remove
              </Button>
            </Box>
          </Grid>
        </Box>

        <Stack direction="row" spacing={4}>
          <Button colorScheme="blue" isLoading={loading} onClick={handleSubmit}>
            Save Details
          </Button>

          <Button variant="outline" onClick={() => navigate("/login")}>
            Cancel
          </Button>
        </Stack>
      </VStack>
    </Box>
  );
}
