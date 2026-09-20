import { demoMode, demoRequest, saveDemoSession } from "../services/demo";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  signIn,
  signUp,
  confirmSignIn,
  confirmSignUp,
  autoSignIn,
  resendSignUpCode,
} from "aws-amplify/auth";
import { Topline } from "../components/Brand";
import { OtpInput } from "../components/OtpInput";
import { cloudConfigured, errorMessage } from "../services/api";
import { useAppState } from "../state/useAppState";
export function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAppState();
  const role = params.get("role") === "patient" ? "patient" : "doctor";
  const [demoCode, setDemoCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "signin" | "signup">("phone");
  const [newAccount, setNewAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const username = `+91${phone.replace(/\D/g, "")}`;
  async function finish() {
    const data = await refresh();
    navigate(
      data.profile
        ? `/${data.profile.role}/home`
        : `/${role}/${role === "doctor" ? "credentials" : "onboarding"}`,
    );
  }
  async function start() {
    if (!cloudConfigured)
      throw new Error(
        "Account services are being connected. Sign-in is unavailable until setup completes.",
      );
    if (!/^\+91\d{10}$/.test(username))
      throw new Error("Enter a 10-digit Indian mobile number");
    if (demoMode) {
      const result = await demoRequest<{ challenge: string; code: string }>(
        "auth/start",
        { phone: username },
      );
      setChallenge(result.challenge);
      setDemoCode(result.code);
      setStage("signin");
      setCode("");
      setCooldown(30);
      return;
    }
    if (newAccount) {
      await signUp({
        username,
        options: {
          userAttributes: { phone_number: username },
          autoSignIn: { authFlowType: "USER_AUTH" },
        },
      });
      setStage("signup");
    } else {
      const result = await signIn({
        username,
        options: { authFlowType: "USER_AUTH", preferredChallenge: "SMS_OTP" },
      });
      if (result.isSignedIn) {
        await finish();
        return;
      }
      if (result.nextStep.signInStep !== "CONFIRM_SIGN_IN_WITH_SMS_CODE")
        throw new Error(
          "SMS sign-in is not available for this account. Check account setup.",
        );
      setStage("signin");
    }
    setCode("");
    setCooldown(30);
  }
  async function verify() {
    if (demoMode) {
      const result = await demoRequest<{ token: string }>("auth/verify", {
        challenge,
        code,
      });
      saveDemoSession(result.token);
      await finish();
      return;
    }
    if (stage === "signup") {
      const result = await confirmSignUp({ username, confirmationCode: code });
      if (result.nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
        const session = await autoSignIn();
        if (session.isSignedIn) {
          await finish();
          return;
        }
      }
      const session = await signIn({
        username,
        options: { authFlowType: "USER_AUTH", preferredChallenge: "SMS_OTP" },
      });
      if (session.isSignedIn) {
        await finish();
        return;
      }
      setStage("signin");
      setCode("");
      setCooldown(30);
      return;
    }
    const result = await confirmSignIn({ challengeResponse: code });
    if (!result.isSignedIn)
      throw new Error("Verification is incomplete. Please try again.");
    await finish();
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <Topline />
      <main className="auth-shell">
        <section className="auth-aside">
          <Link to="/">← Back to MedPal</Link>
          <div>
            <p className="eyebrow">Your {role} account</p>
            <h1>Your care starts here.</h1>
            <p>One account. Your details, prescriptions and care history.</p>
          </div>
        </section>
        <form
          className="paper auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(stage === "phone" ? start : verify);
          }}
        >
          <h2>
            {stage === "phone" ? "Welcome to MedPal" : demoMode ? "Your demo login code" : "Check your phone"}
          </h2>
          {demoMode ? (
            <div className="demo-login-code" role="status" aria-live="polite">
              <p>Demo login · no SMS is sent.</p>
              {demoCode && stage !== "phone" ? (
                <>
                  <strong aria-label={`Your demo login code: ${demoCode}`}>{demoCode}</strong>
                  <button type="button" className="button dark" onClick={() => setCode(demoCode)} disabled={busy}>Use this code</button>
                  <small>Valid for five minutes. Enter it below or choose “Use this code”.</small>
                </>
              ) : <p>Enter a fictional 10-digit number. Your code will appear here.</p>}
            </div>
          ) : (
            <p className="soft-note">This screen uses real SMS login, not demo codes. <a href="https://demo.dperk24dvwjgp.amplifyapp.com/sign-in">Open the working demo</a>, or run <code>npm run demo</code> and open port 4180.</p>
          )}
          {!cloudConfigured && (
            <p role="status" className="soft-note">
              Account services are temporarily unavailable. Please try again
              once setup is complete.
            </p>
          )}
          {stage === "phone" ? (
            <>
              <div className="segmented">
                <button
                  type="button"
                  className={!newAccount ? "active" : ""}
                  onClick={() => setNewAccount(false)}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={newAccount ? "active" : ""}
                  onClick={() => setNewAccount(true)}
                >
                  Create account
                </button>
              </div>
              <label>
                Mobile number
                <div className="phone-field">
                  <span>+91</span>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel-national"
                    maxLength={14}
                  />
                </div>
              </label>
              <button
                disabled={busy || !cloudConfigured}
                className="button dark wide"
              >
                {busy ? "Getting code…" : demoMode ? "Show demo code" : "Send code"}
              </button>
            </>
          ) : (
            <>
              <p>
                {demoMode ? "Enter the demo code shown above for +91 •••••" : "Enter the code sent to +91 •••••"}{" "}
                {phone.replace(/\D/g, "").slice(-5)}.
              </p>
              <OtpInput value={code} onChange={setCode} disabled={busy} />
              <button
                className="button dark wide"
                disabled={busy || !/^\d{6}$/.test(code)}
              >
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy || cooldown > 0}
                onClick={() =>
                  void run(async () => {
                    if (stage === "signup")
                      await resendSignUpCode({ username });
                    else await start();
                    setCooldown(30);
                  })
                }
              >
                {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setStage("phone");
                  setDemoCode("");
                  setCode("");
                  setError("");
                }}
              >
                Change number
              </button>
            </>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
