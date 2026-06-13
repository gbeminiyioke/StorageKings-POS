import pool from "../database/db.js";

export const createCustomerKyc = async (req, res) => {
  try {
    const {
      fullNameCompanyName,
      emailAddress,
      customerType,
      contactPerson,
      telephoneNumber,
      alternateTelephone,
      residentialBusinessAddress,
      nationality,
      occupationNatureOfBusiness,
      meansOfIdentification,
      idNumber,
      expiryDate,

      typeOfServiceRequired,
      storageDurationMonths,
      estimatedValueOfItems,
      dateOfMoveIn,
      itemsToBeStored,

      emergencyFullName,
      relationship,
      emergencyTelephone,
      emergencyAddress,

      complianceConfirmed,

      consentDate,

      kycVerifiedBy,
      storageUnitReferenceNumber,
      comments,
      authorisedBy,
    } = req.body;

    // Required validations
    if (!fullNameCompanyName || !emailAddress || !telephoneNumber) {
      return res.status(400).json({
        message: "Please fill all required fields",
      });
    }

    // Corporate validation
    if (customerType === "Corporate" && !contactPerson) {
      return res.status(400).json({
        message: "Contact Person is required for Corporate customers",
      });
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      `
        SELECT id, approved
        FROM customer_kyc
        WHERE LOWER(email_address) = LOWER($1)
      `,
      [emailAddress],
    );

    if (existingEmail.rows.length > 0) {
      const customer = existingEmail.rows[0];

      // Already approved
      if (customer.approved === true) {
        return res.status(400).json({
          message:
            "Your registered email has been onboarded, please login with the details sent to your email address",
        });
      }

      // Existing pending application
      return res.status(400).json({
        message:
          "email already used, please wait for your previous application to be approved",
      });
    }

    const clientSignature = req.files?.clientSignature?.[0]?.path || null;

    const authorisedSignature =
      req.files?.authorisedSignature?.[0]?.path || null;

    const query = `
      INSERT INTO customer_kyc (
        full_name_company_name,
        email_address,
        customer_type,
        contact_person,
        telephone_number,
        alternate_telephone,
        residential_business_address,
        nationality,
        occupation_nature_of_business,
        means_of_identification,
        id_number,
        expiry_date,

        type_of_service_required,
        storage_duration_months,
        estimated_value_of_items,
        date_of_move_in,
        items_to_be_stored,

        emergency_full_name,
        relationship,
        emergency_telephone,
        emergency_address,

        compliance_confirmed,

        client_signature,
        consent_date,

        kyc_verified_by,
        storage_unit_reference_number,
        comments,
        authorised_by,
        authorised_signature,

        approved
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30
      )
      RETURNING *
    `;

    const values = [
      fullNameCompanyName,
      emailAddress,
      customerType,
      contactPerson,
      telephoneNumber,
      alternateTelephone,
      residentialBusinessAddress,
      nationality,
      occupationNatureOfBusiness,
      meansOfIdentification,
      idNumber,
      expiryDate,

      typeOfServiceRequired,
      storageDurationMonths || null,
      estimatedValueOfItems || null,
      dateOfMoveIn,
      itemsToBeStored,

      emergencyFullName,
      relationship,
      emergencyTelephone,
      emergencyAddress,

      complianceConfirmed === "true",

      clientSignature,
      consentDate,

      kycVerifiedBy,
      storageUnitReferenceNumber,
      comments,
      authorisedBy,
      authorisedSignature,

      false,
    ];

    const result = await pool.query(query, values);

    return res.status(201).json({
      message: "KYC details saved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.log(error);

    // Handle unique constraint errors
    if (error.code === "23505") {
      return res.status(400).json({
        message:
          "email already used, please wait for your previous application to be approved",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};
