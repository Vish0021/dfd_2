import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bike, Phone, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import type { ConfirmationResult } from "firebase/auth";
import {
  setupRecaptcha,
  sendOtp,
  confirmOtp,
  signInWithEmail,
  signUpWithEmail,
} from "~/lib/firebase/auth";
import { getUser, createUser } from "~/lib/firebase/services/users.service";
import { useAuth } from "~/hooks/use-auth";
import { Button } from "~/components/ui/button/button";
import styles from "./login.module.css";

type LoginMode = "phone" | "email";
type PhoneStep = "phone" | "otp";
type EmailMode = "signin" | "signup";

export function meta() {
  return [{ title: "Sign In — DFD" }];
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { firebaseUser, profile, loading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && firebaseUser && profile) {
      navigate(profile.role === "admin" ? "/merchant/dashboard" : "/user", {
        replace: true,
      });
    }
  }, [loading, firebaseUser, profile, navigate]);

  const [mode, setMode] = useState<LoginMode>("phone");

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Bike size={36} />
          <span>DFD</span>
        </div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to continue to DFD</p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === "phone" ? styles.tabActive : ""}`}
            onClick={() => setMode("phone")}
          >
            <Phone size={16} /> Phone OTP
          </button>
          <button
            className={`${styles.tab} ${mode === "email" ? styles.tabActive : ""}`}
            onClick={() => setMode("email")}
          >
            <Mail size={16} /> Email
          </button>
        </div>

        {mode === "phone" ? <PhoneLogin /> : <EmailLogin />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone OTP Login
// ---------------------------------------------------------------------------

function PhoneLogin() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<ReturnType<typeof setupRecaptcha> | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const [step, setStep] = useState<PhoneStep>("phone");
  const [phone, setPhone] = useState("+91"); // Default to India for your project
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
          recaptchaRef.current = null;
        } catch {}
      }
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Simple validation
    if (!phone.trim() || phone.trim().length < 10) {
      return setError("Please enter a valid phone number with country code.");
    }
    
    setLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = setupRecaptcha("recaptcha-container");
      }
      const result = await sendOtp(phone.trim(), recaptchaRef.current);
      confirmationRef.current = result;
      setStep("otp");
    } catch (err: unknown) {
      console.error("Phone Auth Error:", err);
      setError(getErrorMessage(err));
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); recaptchaRef.current = null; } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) return setError("Please enter the OTP.");
    setLoading(true);
    try {
      const cred = await confirmOtp(confirmationRef.current!, otp);
      const uid = cred.user.uid;

      // Upsert user profile in Firestore
      let profile = await getUser(uid);
      if (!profile) {
        const displayName = name.trim() || cred.user.displayName || "User";
        await createUser(uid, { name: displayName, phone, role: "user" });
        profile = await getUser(uid);
      }

      await refreshProfile();
      navigate(profile?.role === "admin" ? "/merchant/dashboard" : "/user", {
        replace: true,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.form}>
      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label}>Phone Number</label>
            <input
              className={styles.input}
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
            <p className={styles.hint}>Include country code (e.g. +91)</p>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div id="recaptcha-container" ref={recaptchaContainerRef} />
          <Button type="submit" disabled={loading} className={styles.submit}>
            {loading ? "Sending OTP…" : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className={styles.fields}>
          <button
            type="button"
            className={styles.back}
            onClick={() => setStep("phone")}
          >
            <ArrowLeft size={16} /> Change number
          </button>
          <p className={styles.hint}>
            Code sent to <strong>{phone}</strong>
          </p>
          <div className={styles.field}>
            <label className={styles.label}>Your Name (first time only)</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>6-digit OTP</label>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" disabled={loading} className={styles.submit}>
            {loading ? "Verifying…" : "Verify & Sign In"}
          </Button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email Login / Signup
// ---------------------------------------------------------------------------

function EmailLogin() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [emailMode, setEmailMode] = useState<EmailMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let uid: string;

      if (emailMode === "signup") {
        if (!name.trim()) {
          setError("Please enter your name.");
          setLoading(false);
          return;
        }
        const cred = await signUpWithEmail(email, password);
        uid = cred.user.uid;
        await createUser(uid, { name: name.trim(), phone: "", role: "user" });
      } else {
        const cred = await signInWithEmail(email, password);
        uid = cred.user.uid;
      }

      await refreshProfile();
      const profile = await getUser(uid);
      navigate(profile?.role === "admin" ? "/merchant/dashboard" : "/user", {
        replace: true,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.emailModeTabs}>
        <button
          className={`${styles.modeTab} ${emailMode === "signin" ? styles.modeTabActive : ""}`}
          onClick={() => setEmailMode("signin")}
          type="button"
        >
          Sign In
        </button>
        <button
          className={`${styles.modeTab} ${emailMode === "signup" ? styles.modeTabActive : ""}`}
          onClick={() => setEmailMode("signup")}
          type="button"
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.fields}>
        {emailMode === "signup" && (
          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <div className={styles.passwordWrapper}>
            <input
              className={styles.input}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" disabled={loading} className={styles.submit}>
          {loading
            ? emailMode === "signup"
              ? "Creating account…"
              : "Signing in…"
            : emailMode === "signup"
              ? "Create Account"
              : "Sign In"}
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    const messages: Record<string, string> = {
      "auth/invalid-phone-number": "Invalid phone number. Include country code.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/invalid-verification-code": "Incorrect OTP. Please try again.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/email-already-in-use": "This email is already registered. Sign in instead.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/invalid-email": "Invalid email address.",
      "auth/network-request-failed": "Network error. Check your connection.",
    };
    return messages[code] ?? `Error: ${code}`;
  }
  return "Something went wrong. Please try again.";
}
