"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building2,
  Briefcase,
  Users,
  Key,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@ai-social/shared";

type WorkspaceType = "creator" | "business" | "agency" | "team";

export default function SignupPage() {
  const router = useRouter();

  // Step state (1 = Account, 2 = Workspace)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Workspace setup states
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("creator");

  // UX & Error states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setAuthError(null);

    // Validate Account fields with Zod
    const validation = signupSchema.safeParse({
      name,
      email,
      password,
      confirmPassword: password,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setValidationErrors(fieldErrors);
      return;
    }

    // Prefill workspace name if empty
    if (!workspaceName) {
      setWorkspaceName(`${name.trim()}'s Workspace`);
    }

    // Transition to Step 2
    setCurrentStep(2);
  };

  // Step 2 Complete Registration
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!workspaceName.trim()) {
      setValidationErrors({ workspaceName: "Workspace name is required" });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim(),
            workspace_name: workspaceName.trim(),
            workspace_type: workspaceType,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          setAuthError("An account with this email already exists. Please sign in.");
        } else if (error.message.includes("Failed to fetch")) {
          setAuthError("Unable to connect to the authentication server. Please check your connection.");
        } else {
          setAuthError(error.message || "Failed to create account.");
        }
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
    } catch {
      setAuthError("An unexpected error occurred during signup.");
      setIsLoading(false);
    }
  };

  const workspaceTypeOptions: {
    id: WorkspaceType;
    label: string;
    desc: string;
    icon: React.ElementType;
  }[] = [
    {
      id: "creator",
      label: "Creator",
      desc: "For personal content and audience growth",
      icon: Sparkles,
    },
    {
      id: "business",
      label: "Business",
      desc: "For a brand or company",
      icon: Building2,
    },
    {
      id: "agency",
      label: "Agency",
      desc: "For managing multiple brands or clients",
      icon: Briefcase,
    },
    {
      id: "team",
      label: "Team",
      desc: "For collaborative content production",
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F5F4F0] relative flex flex-col justify-between p-4 sm:p-6 md:p-10 selection:bg-[#D4AF37]/30 overflow-x-hidden">
      {/* Subtle Ambient Gold Glow Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#D4AF37]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* TOP HEADER: BRAND + BACK TO HOME */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/logo.jpg"
            alt="AI Social Media Studio"
            className="h-10 w-auto object-contain rounded-xl border border-white/[0.08] shadow-md shadow-[#D4AF37]/15 group-hover:scale-105 transition-all"
          />
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#9E9D98] hover:text-[#F5F4F0] transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to home</span>
        </Link>
      </header>

      {/* CENTERED CONTAINER */}
      <main className="relative z-10 w-full max-w-[460px] mx-auto my-auto py-8">
        <div className="bg-[#151618] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          
          {/* STEP PROGRESS INDICATOR */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                  currentStep === 1
                    ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
                    : "bg-white/5 text-[#9E9D98]"
                }`}
              >
                01 Account
              </span>
              <span className="text-xs text-[#9E9D98]">─────</span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                  currentStep === 2
                    ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
                    : "bg-white/5 text-[#9E9D98]"
                }`}
              >
                02 Workspace
              </span>
            </div>
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-[11px] text-[#9E9D98] hover:text-[#F5F4F0] underline font-mono"
              >
                Edit Account
              </button>
            )}
          </div>

          {/* AUTH ERROR ALERT */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* SUCCESS ALERT */}
          {isSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold">Workspace Created</div>
                <div className="text-[11px] text-[#9E9D98]">Redirecting to your dashboard...</div>
              </div>
            </div>
          )}

          {/* STEP 1: CREATE ACCOUNT */}
          {currentStep === 1 && (
            <div className="space-y-5 transition-all duration-300">
              <div className="space-y-1 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-[#F5F4F0]">
                  Create your account
                </h1>
                <p className="text-xs text-[#9E9D98]">
                  Start your workspace in a few seconds.
                </p>
              </div>

              <form onSubmit={handleProceedToWorkspace} className="space-y-4 text-left">
                {/* FULL NAME */}
                <div>
                  <label className="block text-xs font-medium text-[#9E9D98] mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#9E9D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full bg-[#0B0C0E] border rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none transition-all ${
                        validationErrors.name ? "border-red-500/60" : "border-white/[0.08]"
                      }`}
                      disabled={isLoading}
                    />
                  </div>
                  {validationErrors.name && (
                    <p className="text-[11px] text-red-400 mt-1">{validationErrors.name}</p>
                  )}
                </div>

                {/* EMAIL */}
                <div>
                  <label className="block text-xs font-medium text-[#9E9D98] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9E9D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-[#0B0C0E] border rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none transition-all ${
                        validationErrors.email ? "border-red-500/60" : "border-white/[0.08]"
                      }`}
                      disabled={isLoading}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="text-[11px] text-red-400 mt-1">{validationErrors.email}</p>
                  )}
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="block text-xs font-medium text-[#9E9D98] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9E9D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-[#0B0C0E] border rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none transition-all ${
                        validationErrors.password ? "border-red-500/60" : "border-white/[0.08]"
                      }`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9E9D98] hover:text-[#F5F4F0] focus:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-[11px] text-red-400 mt-1">{validationErrors.password}</p>
                  )}
                </div>

                {/* PROCEED BUTTON */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-semibold text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-3"
                >
                  <span>Create account</span>
                  <ArrowRight className="w-4 h-4 text-[#0B0C0E]" />
                </button>
              </form>

              {/* SIGN IN LINK */}
              <div className="text-center text-xs text-[#9E9D98] pt-4 border-t border-white/[0.08]">
                Already have an account?{" "}
                <Link href="/login" className="text-[#D4AF37] hover:underline font-medium ml-1">
                  Sign in
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: WORKSPACE SETUP */}
          {currentStep === 2 && (
            <div className="space-y-5 transition-all duration-300">
              <div className="space-y-1 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-[#F5F4F0]">
                  Create your workspace
                </h1>
                <p className="text-xs text-[#9E9D98]">
                  Your workspace keeps your content, channels and creative projects organized.
                </p>
              </div>

              <form onSubmit={handleCompleteSetup} className="space-y-5 text-left">
                {/* WORKSPACE NAME */}
                <div>
                  <label className="block text-xs font-medium text-[#9E9D98] mb-1.5">
                    Workspace name
                  </label>
                  <input
                    type="text"
                    placeholder="My Brand / Creator Studio"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className={`w-full bg-[#0B0C0E] border rounded-xl px-4 py-2.5 text-xs text-[#F5F4F0] placeholder-[#9E9D98]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none transition-all ${
                      validationErrors.workspaceName ? "border-red-500/60" : "border-white/[0.08]"
                    }`}
                    disabled={isLoading}
                  />
                  {validationErrors.workspaceName && (
                    <p className="text-[11px] text-red-400 mt-1">{validationErrors.workspaceName}</p>
                  )}
                </div>

                {/* WORKSPACE TYPE SELECTION */}
                <div>
                  <label className="block text-xs font-medium text-[#9E9D98] mb-2">
                    What best describes how you work?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {workspaceTypeOptions.map((option) => {
                      const IconComp = option.icon;
                      const isSelected = workspaceType === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setWorkspaceType(option.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#D4AF37]/10 border-[#D4AF37] shadow-sm shadow-[#D4AF37]/10"
                              : "bg-[#0B0C0E] border-white/[0.08] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-bold ${isSelected ? "text-[#D4AF37]" : "text-[#F5F4F0]"}`}>
                              {option.label}
                            </span>
                            <IconComp className={`w-3.5 h-3.5 ${isSelected ? "text-[#D4AF37]" : "text-[#9E9D98]"}`} />
                          </div>
                          <p className="text-[11px] text-[#9E9D98] leading-tight">
                            {option.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* BYOK INFORMATIONAL PANEL */}
                <div className="p-3.5 rounded-xl bg-[#0B0C0E] border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37]">
                    <Key className="w-3.5 h-3.5" />
                    <span>Bring your own providers</span>
                  </div>
                  <p className="text-[11px] text-[#9E9D98] leading-relaxed">
                    Connect your own AI providers and social accounts when you&apos;re ready. Your credentials stay associated with your workspace.
                  </p>
                </div>

                {/* FINAL ACTION BUTTON */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0B0C0E] font-semibold text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0B0C0E]" />
                      <span>Creating workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete setup</span>
                      <ArrowRight className="w-4 h-4 text-[#0B0C0E]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono text-[#9E9D98]/60 py-2 px-2">
        <span>© 2026 AI Social Media Studio. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-[#F5F4F0] transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-[#F5F4F0] transition-colors">
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}

