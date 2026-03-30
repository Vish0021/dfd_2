import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Banknote, MapPin, Phone, FileText, ShoppingBag } from "lucide-react";
import { useCart } from "~/hooks/use-cart";
import { useAuth } from "~/hooks/use-auth";
import { useNetwork } from "~/hooks/use-network";
import { placeOrder } from "~/lib/firebase/services/orders.service";
import { getStore } from "~/lib/firebase/services/stores.service";
import { DELIVERY_FEE } from "~/lib/firebase/schema";
import styles from "./checkout.module.css";

const TAX_PERCENTAGE_FALLBACK = 5;

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, cartStoreId, clearCart } = useCart();
  const { firebaseUser, profile } = useAuth();
  const { isOnline } = useNetwork();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? firebaseUser?.phoneNumber ?? "");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Autofill Address based on Profile Settings
  useEffect(() => {
    if (profile?.addresses?.length) {
      const defaultAddr = profile.addresses.find(a => a.isDefault) || profile.addresses[0];
      setAddress(`${defaultAddr.house}, ${defaultAddr.street}, ${defaultAddr.area}, ${defaultAddr.city} ${defaultAddr.pincode}`);
    }
  }, [profile?.addresses]);

  const subtotal = cartItems.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const taxAmount = parseFloat(((subtotal * TAX_PERCENTAGE_FALLBACK) / 100).toFixed(2));
  const grandTotal = parseFloat((subtotal + taxAmount + DELIVERY_FEE).toFixed(2));

  function validate() {
    const next: Record<string, string> = {};
    if (!address.trim()) {
      next.address = "Delivery address is required.";
    } else if (address.trim().length < 10) {
      next.address = "Address must be at least 10 characters.";
    } else if (address.trim().length > 200) {
      next.address = "Address is too long (max 200 characters).";
    }

    if (!phone.trim()) {
      next.phone = "Phone number is required.";
    } else if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      next.phone = "Enter a valid 10-digit Indian mobile number.";
    }
    return next;
  }

  async function handlePlaceOrder() {
    if (!isOnline) {
      setErrors({ submit: "You are offline. Please check your internet connection." });
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!firebaseUser || !cartStoreId || cartItems.length === 0) {
      setErrors({ submit: "Your cart is missing items or store details." });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});
      const storeData = await getStore(cartStoreId);
      const taxPct = storeData?.taxPercentage ?? TAX_PERCENTAGE_FALLBACK;

      const orderId = await placeOrder({
        userId: firebaseUser.uid,
        storeId: cartStoreId,
        items: cartItems.map((c) => ({
          itemId: c.item.id,
          name: c.item.name,
          price: c.item.price,
          quantity: c.quantity,
        })),
        taxPercentage: taxPct,
        deliveryAddress: address.trim(),
        deliveryPhone: phone.trim(),
        deliveryInstructions: instructions.trim(),
      });

      clearCart();
      navigate(`/order/${orderId}`, { replace: true });
    } catch (error: any) {
      console.error("Order error:", error);
      let errMsg = "Could not place your order. Please try again.";
      if (error?.code === "functions/resource-exhausted") {
        errMsg = "Too many requests. Please wait a minute and try again.";
      } else if (error?.code === "functions/permission-denied") {
        errMsg = "Permission denied. Ensure you are signed in correctly.";
      } else if (error?.code === "functions/internal") {
        errMsg = "An internal server error occurred. We are looking into it.";
      } else if (error?.message) {
        errMsg = error.message;
      }
      setErrors({ submit: errMsg });
    } finally {
      setSubmitting(false);
    }
  }

  const isOffline = !isOnline;

  if (cartItems.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
          <h1 className={styles.headerTitle}>Checkout</h1>
        </header>
        <div className={styles.emptyCart}>
          <ShoppingBag size={48} className={styles.emptyIcon} />
          <p>Your cart is empty.</p>
          <button className={styles.browseBtn} onClick={() => navigate("/user")}>
            Browse Stores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Checkout</h1>
      </header>

      <main className={styles.main}>
        {/* Order summary */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <ShoppingBag size={18} />
            Order Summary
          </h2>
          <div className={styles.itemList}>
            {cartItems.map(({ item, quantity }) => (
              <div key={item.id} className={styles.orderItem}>
                <div className={styles.orderItemLeft}>
                  <span className={styles.orderItemQty}>{quantity}×</span>
                  <span className={styles.orderItemName}>{item.name}</span>
                </div>
                <span className={styles.orderItemPrice}>
                  ₹{(item.price * quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Item Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Tax ({TAX_PERCENTAGE_FALLBACK}%)</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Delivery Fee</span>
              <span>₹{DELIVERY_FEE.toFixed(2)}</span>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>Grand Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Delivery details */}
        <section className={styles.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              <MapPin size={18} />
              Delivery Address
            </h2>
            <button 
              className={styles.addAddrBtn} 
              style={{ background: "none", border: "none", color: "var(--color-accent-9)", fontWeight: "bold", cursor: "pointer" }}
              onClick={() => navigate("/user/profile")}
            >
              Manage
            </button>
          </div>

          <div className={styles.fieldGroup} style={{ marginTop: "16px" }}>
            {(!profile?.addresses || profile.addresses.length === 0) && (
              <div className={styles.offlineBanner} style={{ marginBottom: "16px", background: "var(--color-error-3)", color: "var(--color-error-11)", padding: "12px", borderRadius: "8px", fontSize: "14px" }}>
                You have no saved addresses. Please add a default address in your profile to continue.
              </div>
            )}
            <textarea
              id="address"
              className={`${styles.textarea} ${errors.address ? styles.fieldError : ""}`}
              placeholder="Delivery address autofilled from your profile..."
              rows={3}
              value={address}
              readOnly
              onClick={() => {
                if (!profile?.addresses || profile.addresses.length === 0) {
                  navigate("/user/profile");
                }
              }}
              style={{ cursor: (!profile?.addresses || profile.addresses.length === 0) ? "pointer" : "not-allowed", opacity: 0.8 }}
            />
            {errors.address && <span className={styles.errorMsg}>{errors.address}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="phone">
              <Phone size={14} />
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              className={`${styles.input} ${errors.phone ? styles.fieldError : ""}`}
              placeholder="10-digit mobile number"
              value={phone}
              maxLength={10}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
              }}
            />
            {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="instructions">
              <FileText size={14} />
              Delivery Instructions (optional)
            </label>
            <textarea
              id="instructions"
              className={styles.textarea}
              placeholder="e.g. Ring the bell twice, leave at door…"
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        </section>

        {/* Payment */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Banknote size={18} />
            Payment Method
          </h2>
          <div className={styles.paymentOption}>
            <div className={styles.paymentRadio} aria-checked="true">
              <div className={styles.radioInner} />
            </div>
            <div className={styles.paymentInfo}>
              <span className={styles.paymentLabel}>Cash on Delivery</span>
              <span className={styles.paymentSub}>Pay with cash when your order arrives</span>
            </div>
            <Banknote size={20} className={styles.paymentIcon} />
          </div>
        </section>

        {errors.submit && (
          <div className={styles.submitError}>{errors.submit}</div>
        )}
      </main>

      {/* Place order footer */}
      <div className={styles.footer}>
        {isOffline && (
          <div className={styles.offlineBanner}>
            You are offline. Please check your network to place an order.
          </div>
        )}
        <div className={styles.footerSummary}>
          <span className={styles.footerTotal}>₹{grandTotal.toFixed(2)}</span>
          <span className={styles.footerLabel}>Grand Total</span>
        </div>
        <button
          className={styles.placeOrderBtn}
          onClick={handlePlaceOrder}
          disabled={submitting || isOffline}
        >
          {submitting ? "Placing Order…" : isOffline ? "Network Offline" : "Place Order"}
        </button>
      </div>
    </div>
  );
}
