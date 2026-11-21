import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoggingIn, forgotPassword, resetPassword } =
    useAuthStore() as any;

  // Forgot Password Modal States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [devCodeTip, setDevCodeTip] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    login(formData);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your registered email");
      return;
    }
    setIsSendingCode(true);
    const res = await forgotPassword(forgotEmail);
    setIsSendingCode(false);
    if (res.success) {
      if (res.code) {
        setDevCodeTip(res.code);
      }
      setForgotStep(2);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsResetting(true);
    const success = await resetPassword({
      email: forgotEmail,
      code: resetCode.trim(),
      newPassword,
    });
    setIsResetting(false);

    if (success) {
      setFormData((prev) => ({ ...prev, email: forgotEmail }));
      setIsForgotModalOpen(false);
      setForgotStep(1);
      setForgotEmail("");
      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setDevCodeTip(null);
    }
  };

  return (
    <div className="min-h-screen pt-16 lg:pt-0 grid lg:grid-cols-2">
      {/* Left Side - Image/Pattern */}
      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={
          "Sign in to continue your conversations and catch up with your messages."
        }
      />

      {/* Right Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <img
                src="/logo.png"
                alt="ChitChat"
                className="w-14 h-14 rounded-2xl shadow-md object-cover hover:scale-105 transition-transform"
              />
              <h1 className="text-2xl font-bold mt-2">
                Have a Gossip, Discuss it with friends
              </h1>
              <p className="text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40 z-10" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10 z-0"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-control">
              <div className="flex items-center justify-between pb-1">
                <span className="label-text font-medium text-sm">Password</span>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(formData.email);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/40 z-10" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-10 z-0"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-base-content/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsForgotModalOpen(false)}
        >
          <div
            className="bg-base-100 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-base-300 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-base-300 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Reset Password</h3>
                  <p className="text-xs text-base-content/60">
                    {forgotStep === 1
                      ? "Enter your email to receive a reset code"
                      : "Enter code & set your new password"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* STEP 1: Enter Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="form-control">
                  <label className="label-text font-medium text-xs block mb-1">
                    Your Registered Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="size-4 text-base-content/40" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="input input-bordered input-sm sm:input-md w-full pl-9 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="btn btn-ghost btn-sm rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingCode}
                    className="btn btn-primary btn-sm rounded-xl text-xs flex items-center gap-2"
                  >
                    {isSendingCode ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      "Send Reset Code"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter Code & New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {devCodeTip && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Verification code generated:</span>
                    </div>
                    <span className="font-mono font-bold bg-base-100 px-2 py-0.5 rounded-lg border border-primary/30 tracking-widest text-primary">
                      {devCodeTip}
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-base-content/70 block mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="input input-bordered input-sm sm:input-md w-full rounded-xl text-center font-mono tracking-widest text-base font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-base-content/70 block mb-1">
                    New Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="size-4 text-base-content/40" />
                    </div>
                    <input
                      type={showForgotNewPass ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input input-bordered input-sm sm:input-md w-full pl-9 pr-10 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content"
                    >
                      {showForgotNewPass ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-base-content/70 block mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="size-4 text-base-content/40" />
                    </div>
                    <input
                      type={showForgotConfirmPass ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="input input-bordered input-sm sm:input-md w-full pl-9 pr-10 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowForgotConfirmPass(!showForgotConfirmPass)
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content"
                    >
                      {showForgotConfirmPass ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="btn btn-ghost btn-sm rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <ArrowLeft className="size-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="btn btn-primary btn-sm rounded-xl text-xs flex items-center gap-2"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      "Set New Password"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
