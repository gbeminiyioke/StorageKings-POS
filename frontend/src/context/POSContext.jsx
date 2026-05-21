import { createContext, useContext, useState, useMemo } from "react";

const POSContext = createContext();

export const usePOS = () => useContext(POSContext);

export const POSProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const [discountType, setDiscountType] = useState("AMOUNT");
  const [discountValue, setDiscountValue] = useState(0);

  /* =====================================
  NEW: SHARED PAYMENT STATE
  ===================================== */
  const [payments, setPayments] = useState([{ method: "CASH", amount: "" }]);

  const updatePayment = (index, field, value) => {
    setPayments((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const addPaymentRow = () => {
    setPayments((prev) => [...prev, { method: "CASH", amount: "" }]);
  };

  const removePaymentRow = (index) => {
    setPayments((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const clearPayments = () => {
    setPayments([{ method: "CASH", amount: "" }]);
  };

  /* =====================================
     CART FUNCTIONS
  ===================================== */
  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.product_id === product.product_id);

      /* UPDATED: prevent selling above stock if monitor_stock = true */
      if (exists) {
        if (
          product.monitor_stock &&
          exists.qty + 1 > Number(product.stock_quantity || 0)
        ) {
          alert(`Only ${product.stock_quantity} item(s) available`);
          return prev;
        }

        return prev.map((p) =>
          p.product_id === product.product_id ? { ...p, qty: p.qty + 1 } : p,
        );
      }

      return [
        ...prev,
        {
          ...product,
          qty: 1,
        },
      ];
    });
  };

  const updateQty = (product_id, qty) => {
    setCart((prev) =>
      prev.map((p) => {
        if (p.product_id !== product_id) return p;

        /* UPDATED: respect monitor_stock */
        if (p.monitor_stock && qty > Number(p.stock_quantity || 0)) {
          alert(`Only ${p.stock_quantity} item(s) available`);
          return p;
        }

        return {
          ...p,
          qty: Math.max(1, qty),
        };
      }),
    );
  };

  const removeItem = (product_id) => {
    setCart((prev) => prev.filter((p) => p.product_id !== product_id));
  };

  /* UPDATED: clear both cart and payments */
  const clearCart = () => {
    setCart([]);
    clearPayments();
    setDiscountType("AMOUNT");
    setDiscountValue(0);
  };
  /*
  const subtotal = cart.reduce(
    (acc, item) =>
      acc + Number(item.selling_price || 0) * Number(item.qty || 0),
    0,
  );

  const tax = subtotal * 0.075;
  const total = subtotal + tax;
*/

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.qty) * Number(item.selling_price),
      0,
    );
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === "PERCENT") {
      return (subtotal * Number(discountValue || 0)) / 100;
    }

    return Number(discountValue || 0);
  }, [subtotal, discountType, discountValue]);

  //const taxableAmount = subtotal - discountAmount;
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const tax = taxableAmount * 0.075;
  const total = taxableAmount + tax;

  return (
    <POSContext.Provider
      value={{
        cart,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        subtotal,
        tax,
        total,

        discountType,
        setDiscountType,
        discountValue,
        setDiscountValue,
        discountAmount,

        /* NEW: payment state + helpers */
        payments,
        setPayments,
        updatePayment,
        addPaymentRow,
        removePaymentRow,
        clearPayments,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};
