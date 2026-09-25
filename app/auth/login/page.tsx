"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useShopName } from "@/hooks/useShopName";
import TurnstileWidget from "@/components/ui/TurnstileWidget";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

type Mode = "login" | "forgot" | "reset";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const year = new Date().getFullYear();
  const shopName = useShopName();

  useEffect(() => {
    document.title = `${shopName} POS`;
  }, [shopName]);

  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetInfo, setResetInfo] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [forgotToken, setForgotToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loginToken, setLoginToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginToken) {
      setError("Please complete the verification challenge.");
      return;
    }
    setLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken: loginToken }),
      });
      if (!verifyRes.ok) {
        setError("Verification failed. Please try again.");
        setLoginToken("");
        return;
      }
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err?.code === "auth/user-disabled"
          ? "Your account has been disabled. Contact your administrator."
          : "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  const goToForgot = () => {
    setResetEmail(email);
    setResetError("");
    setResetInfo("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotToken("");
    setResetToken("");
    setMode("forgot");
  };

  const backToLogin = () => {
    setResetError("");
    setResetInfo("");
    setMode("login");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetInfo("");
    if (!forgotToken) {
      setResetError("Please complete the verification challenge.");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, turnstileToken: forgotToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reset code.");
      setResetInfo(`A 6-digit code was sent to ${resetEmail}.`);
      setResetToken("");
      setMode("reset");
    } catch (err: any) {
      setResetError(err.message || "Failed to send reset code.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetInfo("");
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("New password must be at least 6 characters.");
      return;
    }
    if (!resetToken) {
      setResetError("Please complete the verification challenge.");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp, newPassword, turnstileToken: resetToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");
      setResetInfo("Password reset. You can sign in now.");
      setEmail(resetEmail);
      setPassword("");
      setTimeout(() => setMode("login"), 1200);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden font-poppins bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200">
      <main className="flex-1 flex items-start sm:items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
        <div className="relative w-full max-w-[440px] lg:max-w-[900px] grid lg:grid-cols-2 rounded-3xl bg-white shadow-[0_30px_80px_-30px_rgba(10,10,10,0.3)]">
          {/* Brand panel: compact header on mobile/tablet, left half on desktop */}
          <div className="relative overflow-hidden rounded-t-3xl lg:rounded-tr-none lg:rounded-l-3xl bg-[#e30613] text-white px-6 py-8 sm:px-10 lg:px-12 lg:py-14 flex flex-col justify-center items-center text-center lg:items-start lg:text-left">
            <div className="absolute -top-16 -left-16 h-40 w-40 lg:h-48 lg:w-48 rounded-full border-[24px] lg:border-[28px] border-white/10" />
            <div className="absolute -bottom-20 -right-10 lg:right-10 h-40 w-40 rounded-full bg-white/10" />

            <div className="relative flex flex-col items-center lg:items-start">
              <Image
                src="/shop_logo/logo-white.png"
                alt="M-Fixpro"
                width={1200}
                height={362}
                className="h-12 sm:h-14 lg:h-[72px] w-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                priority
              />

              <h2 className="mt-5 lg:mt-8 text-lg sm:text-xl lg:text-2xl font-semibold">Welcome to {shopName}</h2>
              <span className="mt-2 lg:mt-3 block h-[3px] w-10 lg:w-12 rounded-full bg-white" />
              <p className="hidden sm:block mt-4 lg:mt-5 max-w-xs text-sm leading-relaxed text-white/80">
                Manage repairs, sales and billing for your shop from one simple dashboard.
              </p>
            </div>
          </div>

          {/* Decorative ring on the divider (desktop only) */}
          <div className="hidden lg:block absolute left-1/2 bottom-12 -translate-x-1/2 h-24 w-24 rounded-full border-[18px] border-white shadow-[0_10px_30px_-10px_rgba(10,10,10,0.25)] pointer-events-none" />
          {/* Decorative shape on the right edge (desktop only) */}
          <div className="hidden lg:block absolute -right-8 top-10 h-20 w-20 rotate-45 rounded-[22px] border-[14px] border-zinc-100 pointer-events-none" />

          {/* Form */}
          <div className="relative px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-14">
          <div className="mx-auto w-full max-w-[320px]">

          {mode === "login" && (
            <>
              <Header title="Sign in" subtitle="Enter your credentials to continue" />

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email">
                  <TextInput
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>

                <Field
                  label="Password"
                  action={
                    <button
                      type="button"
                      onClick={goToForgot}
                      className="text-xs text-zinc-500 hover:text-ink transition-colors"
                    >
                      Forgot password?
                    </button>
                  }
                >
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </Field>

                <TurnstileWidget className="flex justify-center" onVerify={setLoginToken} onExpire={() => setLoginToken("")} />

                {error && <Message>{error}</Message>}

                <SubmitButton loading={loading} disabled={!loginToken} loadingText="Signing in">
                  Sign in
                </SubmitButton>
              </form>
            </>
          )}

          {mode === "forgot" && (
            <>
              <BackLink onClick={backToLogin} />
              <Header
                title="Reset password"
                subtitle="Enter your email and we'll send you a 6-digit code."
              />

              <form onSubmit={handleSendOtp} className="space-y-4">
                <Field label="Email">
                  <TextInput
                    type="email"
                    value={resetEmail}
                    onChange={setResetEmail}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>

                <TurnstileWidget className="flex justify-center" onVerify={setForgotToken} onExpire={() => setForgotToken("")} />

                {resetError && <Message>{resetError}</Message>}

                <SubmitButton loading={resetLoading} disabled={!forgotToken} loadingText="Sending">
                  Send code
                </SubmitButton>
              </form>
            </>
          )}

          {mode === "reset" && (
            <>
              <BackLink onClick={backToLogin} />
              <Header title="New password" subtitle={`Enter the code sent to ${resetEmail}.`} />

              <form onSubmit={handleResetPassword} className="space-y-4">
                <Field label="6-digit code">
                  <TextInput
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(v) => setOtp(v.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center tracking-[0.4em]"
                  />
                </Field>

                <Field label="New password">
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                </Field>

                <Field label="Confirm password">
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                </Field>

                <TurnstileWidget className="flex justify-center" onVerify={setResetToken} onExpire={() => setResetToken("")} />

                {resetError && <Message>{resetError}</Message>}
                {resetInfo && !resetError && <Message tone="success">{resetInfo}</Message>}

                <SubmitButton loading={resetLoading} disabled={!resetToken} loadingText="Resetting">
                  Reset password
                </SubmitButton>
              </form>
            </>
          )}
          </div>
          </div>
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-zinc-400 space-y-0.5">
        <p>© {year} {shopName}</p>
        <p>Design &amp; Developed by plexCode</p>
      </footer>
    </div>
  );
}

const inputBase =
  "h-11 w-full border-0 border-b border-zinc-300 bg-transparent px-0.5 text-sm text-ink outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#e30613] focus:ring-0";

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <span className="mx-auto mt-2 block h-[3px] w-8 rounded-full bg-[#e30613]" />
      <p className="mt-3 text-sm text-zinc-500">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[13px] font-medium text-zinc-700">{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  onChange,
  className = "",
  ...props
}: {
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <input
      {...props}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} ${className}`}
      required
    />
  );
}

function PasswordInput({
  onChange,
  ...props
}: {
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} pr-11`}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-zinc-400 hover:text-ink transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SubmitButton({
  loading,
  disabled,
  loadingText,
  children,
}: {
  loading: boolean;
  disabled: boolean;
  loadingText: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#e30613] text-sm font-semibold uppercase tracking-wide text-white shadow-[0_10px_20px_-8px_rgba(227,6,19,0.6)] transition-colors hover:bg-[#b8050f] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </button>
  );
}

function Message({ tone = "error", children }: { tone?: "error" | "success"; children: React.ReactNode }) {
  return (
    <p className={`text-sm ${tone === "error" ? "text-red-600" : "text-green-600"}`}>{children}</p>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-ink transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to sign in
    </button>
  );
}
