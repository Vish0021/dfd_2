import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "./config";

function requireAuth() {
  if (!auth) throw new Error("Firebase Auth is only available in the browser.");
  return auth;
}

// ---------------------------------------------------------------------------
// Email / Password
// ---------------------------------------------------------------------------

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(requireAuth(), email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(requireAuth(), email, password);
}

// ---------------------------------------------------------------------------
// Phone OTP
// ---------------------------------------------------------------------------

/** Sets up an invisible reCAPTCHA on the given container element ID. */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  const authInstance = requireAuth();
  return new RecaptchaVerifier(authInstance, containerId, { size: "invisible" });
}

/**
 * Send OTP to phone number (e.g. "+911234567890").
 * Returns a ConfirmationResult to pass to confirmOtp().
 */
export async function sendOtp(
  phone: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(requireAuth(), phone, recaptchaVerifier);
}

/** Confirm the 6-digit OTP received via SMS. */
export async function confirmOtp(
  confirmationResult: ConfirmationResult,
  otp: string
) {
  return confirmationResult.confirm(otp);
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut() {
  return firebaseSignOut(requireAuth());
}

// ---------------------------------------------------------------------------
// Auth state observer
// ---------------------------------------------------------------------------

export function onAuthState(callback: (user: User | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
