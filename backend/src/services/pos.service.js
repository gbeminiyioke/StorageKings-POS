import pool from "../config/db.js";

export const completeSaleService = async (data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      branch_id,
      user_id,
      customer_id,
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
      : Number(grand_total) - Number(nonCreditPaid);

    if (nonCreditPaid > Number(grand_total)) {
      throw new Error("Paid amount cannot exceed total");
    }

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
        $16
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
        subtotal,
        vat,
        grand_total,
        totalPaid,
        balanceDue,
        balanceDue <= 0 ? "PAID" : "PARTIAL",
        payment_terms,
        due_date,
      ],
    );

    const sale_id = saleRes.rows[0].sale_id;

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
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
