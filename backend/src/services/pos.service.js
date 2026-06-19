import pool from "../config/db.js";

export const completeSaleService = async (data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      branch_id,
      user_id,
      customer_id,
      discount_type = "AMOUNT",
      discount_value = 0,
      transaction_type = "INVOICE",
      invoice_no,
      proforma_no,
      refund_no,
      subtotal,
      vat,
      grand_total,
      payment_terms = 0,
      due_date = null,
      items = [],
      payments = [],
    } = data;

    if (!items.length) {
      throw new Error("Cart is empty");
    }

    if (transaction_type !== "PROFORMA" && !payments.length) {
      throw new Error("No payment provided");
    }

    const rawSubtotal = Number(subtotal || 0);

    let computedDiscountAmount = 0;

    if (discount_type === "PERCENT") {
      computedDiscountAmount =
        (rawSubtotal * Number(discount_value || 0)) / 100;
    } else {
      computedDiscountAmount = Number(discount_value || 0);
    }

    if (computedDiscountAmount > rawSubtotal) {
      throw new Error("Discount cannot exceed subtotal");
    }

    const discountedSubtotal = rawSubtotal - computedDiscountAmount;

    const computedVat = discountedSubtotal * 0.075;

    const computedGrandTotal = discountedSubtotal + computedVat;

    const nonCreditPaid = payments.reduce((sum, p) => {
      const amount = Number(p.amount || 0);

      return p.method?.toUpperCase() === "CREDIT" ? sum : sum + amount;
    }, 0);

    const creditPayment = payments.find(
      (p) => p.method?.toUpperCase() === "CREDIT",
    );

    const creditAmount = Number(creditPayment?.amount || 0);

    const totalPaid = nonCreditPaid;
    const balanceDue = creditPayment
      ? -creditAmount
      : Number(computedGrandTotal) - Number(nonCreditPaid);

    if (nonCreditPaid > Number(computedGrandTotal)) {
      throw new Error("Paid amount cannot exceed total");
    }

    const hasCredit = payments.some(
      (p) => p.method?.toUpperCase() === "CREDIT",
    );

    if (transaction_type !== "PROFORMA" && balanceDue > 0 && !hasCredit) {
      throw new Error("Outstanding balance must be recorded as CREDIT");
    }

    const branchResult = await client.query(
      `
      SELECT
        branch_prefix,
        next_pos_no,
        next_proforma_no,
        next_refund_no
      FROM branches
      WHERE branch_id = $1
      FOR UPDATE
      `,
      [branch_id],
    );

    if (!branchResult.rows.length) {
      throw new Error("Branch not found");
    }

    const branch = branchResult.rows[0];

    let actualInvoiceNo = null;
    let actualProformaNo = null;
    let actualRefundNo = null;
    let counterField = null;
    let counterValue = 1;
    let prefix = branch.branch_prefix || "X";
    let label = "";

    switch (transaction_type) {
      case "INVOICE":
        counterField = "next_pos_no";
        counterValue = Number(branch.next_pos_no || 1);
        label = "S";
        actualInvoiceNo = `${label}${prefix}-${String(counterValue).padStart(6, "0")}`;
        break;

      case "PROFORMA":
        counterField = "next_proforma_no";
        counterValue = Number(branch.next_proforma_no || 1);
        label = "P";
        actualProformaNo = `${label}${prefix}-${String(counterValue).padStart(6, "0")}`;
        break;

      case "REFUND":
        counterField = "next_refund_no";
        counterValue = Number(branch.next_refund_no || 1);
        label = "R";
        actualRefundNo = `${label}${prefix}-${String(counterValue).padStart(6, "0")}`;
        break;
    }

    const saleRes = await client.query(
      `
      INSERT INTO pos_sales (
        branch_id,
        status,
        created_by,
        created_at,
        transaction_date,
        customer_id,
        transaction_type,
        invoice_no,
        proforma_no,
        refund_no,
        subtotal,
        discount_type,
        discount_value,
        discount_amount,
        vat,
        grand_total,
        amount_paid,
        balance_due,
        payment_status,
        payment_terms,
        due_date
      )
      VALUES (
        $1,
        $2,
        $3,
        NOW(),
        CURRENT_DATE,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19
      )
      RETURNING sale_id
    `,
      [
        branch_id,
        transaction_type === "PROFORMA" ? "PENDING" : "COMPLETED",
        user_id,
        customer_id || null,
        transaction_type,
        actualInvoiceNo,
        actualProformaNo,
        actualRefundNo,
        rawSubtotal,
        discount_type,
        Number(discount_value || 0),
        computedDiscountAmount,
        computedVat,
        computedGrandTotal,
        totalPaid,
        balanceDue,
        balanceDue <= 0 ? "PAID" : "PARTIAL",
        payment_terms,
        due_date,
      ],
    );

    const sale_id = saleRes.rows[0].sale_id;

    if (transaction_type === "REFUND" && original_sale_id) {
      await client.query(
        `
    INSERT INTO pos_refunds
    (
      sale_id,
      refund_sale_id,
      created_by,
      reason
    )
    VALUES
    ($1,$2,$3,$4)
    `,
        [original_sale_id, sale_id, user_id, refund_reason],
      );
    }

    for (const item of items) {
      const stockRes = await client.query(
        `
        SELECT
          p.monitor_stock,
          COALESCE(pbb.stock_quantity, 0) AS stock_quantity
        FROM products_by_branch pbb
        JOIN products p ON p.product_id = pbb.product_id
        WHERE pbb.branch_id = $1
          AND pbb.product_id = $2
        FOR UPDATE
      `,
        [branch_id, item.product_id],
      );

      if (!stockRes.rows.length) {
        throw new Error(
          `Product ${item.product_name} not found in branch stock`,
        );
      }

      const { monitor_stock, stock_quantity } = stockRes.rows[0];

      if (
        transaction_type !== "REFUND" &&
        monitor_stock &&
        Number(stock_quantity) < Number(item.quantity)
      ) {
        throw new Error(`Insufficient stock for ${item.product_name}`);
      }

      let newStock = Number(stock_quantity);

      if (transaction_type !== "PROFORMA") {
        if (transaction_type === "REFUND") {
          const refundedQty = await client.query(
            `
            SELECT
            COALESCE(SUM(d.quantity), 0) AS refunded
            FROM pos_refunds pr
            JOIN pos_sale_details d
            ON d.sale_id = pr.refund_sale_id
            WHERE pr.sale_id = $1 AND d.product_id = $2
            `,
            [original_sale_id, item.product_id],
          );

          if (
            Number(refundedQty.rows[0].refunded) + Number(item.quantity) >
            originalQty
          ) {
            throw new Error("Refund exceeds sold quantity");
          }
        }

        newStock =
          transaction_type === "REFUND"
            ? Number(stock_quantity) + Number(item.quantity)
            : Number(stock_quantity) - Number(item.quantity);

        await client.query(
          `
            UPDATE products_by_branch
            SET stock_quantity = $1
            WHERE branch_id = $2
            AND product_id = $3
          `,
          [newStock, branch_id, item.product_id],
        );
      }

      await client.query(
        `
        INSERT INTO pos_sale_details
        (sale_id, product_id, quantity, cost_price, selling_price, total)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          sale_id,
          item.product_id,
          item.quantity,
          item.cost_price || 0,
          item.selling_price,
          Number(item.quantity) * Number(item.selling_price),
        ],
      );

      if (transaction_type !== "PROFORMA") {
        await client.query(
          `
            INSERT INTO stock_movements
            (
            product_id,
            branch_id,
            movement_type,
            quantity,
            reference_id,
            reference_table,
            created_by,
            created_at,
            balance_after
            )
            VALUES ($1,$2,$3,$4,$5,'pos_sales',$6,NOW(),$7)
          `,
          [
            item.product_id,
            branch_id,
            transaction_type === "REFUND" ? "REFUND" : "SALE",
            transaction_type === "REFUND"
              ? Number(item.quantity)
              : -Number(item.quantity),
            sale_id,
            user_id,
            newStock,
          ],
        );
      }
    }

    if (transaction_type !== "PROFORMA" && customer_id && creditAmount > 0) {
      await client.query(
        `
          UPDATE customers
          SET current_balance = COALESCE(current_balance, 0) - $1
          WHERE id = $2
        `,
        [creditAmount, customer_id],
      );
    }

    for (const payment of payments) {
      if (!payment.amount || Number(payment.amount) <= 0) continue;

      await client.query(
        `
        INSERT INTO pos_payments (sale_id, payment_method, amount)
        VALUES ($1, $2, $3)
      `,
        [sale_id, payment.method.toUpperCase(), Number(payment.amount)],
      );
    }

    // Update branch document counter only after successful sale
    await client.query(
      `
        UPDATE branches
        SET ${counterField} = COALESCE(${counterField}, 1) + 1
        WHERE branch_id = $1
        `,
      [branch_id],
    );

    await client.query("COMMIT");

    return {
      success: true,
      sale_id,
      message: "Sale completed successfully",

      subtotal: rawSubtotal,
      discount_type,
      discount_value,
      discount_amount: computedDiscountAmount,
      vat: computedVat,
      grand_total: computedGrandTotal,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const convertProformaToInvoiceService = async (proformaId, userId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // =====================================
    // LOAD PROFORMA
    // =====================================

    const proformaRes = await client.query(
      `
      SELECT *
      FROM pos_sales
      WHERE sale_id = $1
        AND transaction_type = 'PROFORMA'
      FOR UPDATE
      `,
      [proformaId],
    );

    if (!proformaRes.rows.length) {
      throw new Error("Proforma not found");
    }

    const proforma = proformaRes.rows[0];

    if (proforma.converted) {
      throw new Error("This proforma has already been converted");
    }

    // =====================================
    // LOAD ITEMS
    // =====================================

    const itemsRes = await client.query(
      `
      SELECT *
      FROM pos_sale_details
      WHERE sale_id = $1
      `,
      [proformaId],
    );

    const items = itemsRes.rows;

    // =====================================
    // STOCK VALIDATION
    // =====================================

    for (const item of items) {
      const stockRes = await client.query(
        `
        SELECT
          stock_quantity,
          monitor_stock
        FROM products
        WHERE product_id = $1
        `,
        [item.product_id],
      );

      const product = stockRes.rows[0];

      if (
        product.monitor_stock &&
        Number(product.stock_quantity) < Number(item.quantity)
      ) {
        throw new Error(`${item.product_name} has insufficient stock`);
      }
    }

    // =====================================
    // CREATE INVOICE NUMBER
    // =====================================

    const branchRes = await client.query(
      `
      UPDATE branches
      SET next_pos_no =
        next_pos_no + 1
      WHERE branch_id = $1
      RETURNING next_pos_no
      `,
      [proforma.branch_id],
    );

    const invoiceNo = `POS-${String(branchRes.rows[0].next_pos_no).padStart(
      6,
      "0",
    )}`;

    // =====================================
    // CREATE INVOICE
    // =====================================

    const invoiceRes = await client.query(
      `
      INSERT INTO pos_sales
      (
        invoice_no,
        transaction_type,
        customer_id,
        branch_id,
        subtotal,
        tax_amount,
        grand_total,
        created_by,
        source_sale_id
      )
      VALUES
      ($1,'INVOICE',$2,$3,$4,$5,$6,$7,$8)
      RETURNING sale_id
      `,
      [
        invoiceNo,
        proforma.customer_id,
        proforma.branch_id,
        proforma.subtotal,
        proforma.tax_amount,
        proforma.grand_total,
        userId,
        proforma.sale_id,
      ],
    );

    const invoiceId = invoiceRes.rows[0].sale_id;

    // =====================================
    // COPY DETAILS
    // =====================================

    for (const item of items) {
      await client.query(
        `
        INSERT INTO pos_sale_details
        (
          sale_id,
          product_id,
          quantity,
          unit_price,
          total
        )
        VALUES
        ($1,$2,$3,$4,$5)
        `,
        [
          invoiceId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.total,
        ],
      );

      // Deduct stock now
      await client.query(
        `
        UPDATE products
        SET stock_quantity =
          stock_quantity - $1
        WHERE product_id = $2
        `,
        [item.quantity, item.product_id],
      );
    }

    // =====================================
    // MARK PROFORMA
    // =====================================

    await client.query(
      `
      UPDATE pos_sales
      SET
        converted = TRUE,
        converted_at = NOW(),
        converted_by = $1
      WHERE sale_id = $2
      `,
      [userId, proforma.sale_id],
    );

    await client.query("COMMIT");

    return {
      sale_id: invoiceId,
      invoice_no: invoiceNo,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
