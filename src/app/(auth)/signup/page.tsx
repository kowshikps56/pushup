"use client";

/**
 * PushUp Arena - Goofy Arcade Athlete Enlistment
 * Path: src/app/(auth)/signup/page.tsx
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";

const FITNESS_LEVELS: { id: FitnessLevel; label: string; emoji: string; benchmark: string }[] = [
  { id: "beginner", label: "POTATO", emoji: "🥔", benchmark: "< 15 REPS" },
  { id: "intermediate", label: "WARRIOR", emoji: "🦾", benchmark: "15-35 REPS" },
  { id: "advanced", label: "GORILLA", emoji: "🦍", benchmark: "35-55 REPS" },
  { id: "elite", label: "TITAN", emoji: "👑", benchmark: "55+ REPS" },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("intermediate");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      setErrorMsg("Username must be between 3 and 20 alphanumeric characters.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            fitness_level: fitnessLevel,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
      } else {
        setIsSuccess(true);
      }
    } catch {
      setErrorMsg("Registration failed. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-[#08090C] text-white selection:bg-accent-crimson selection:text-white bg-arcade-grid select-none">
      <div className="flex flex-col max-w-md w-full p-8 rounded-2xl bg-[#0E1117] border-4 border-black shadow-goofy-emerald relative font-bouncy">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="self-start flex items-center gap-1.5 text-zinc-400 hover:text-white font-goofy text-sm uppercase mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO ARENA 🛹</span>
        </button>

        {/* Brand Icon Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent-emerald border-2 border-black text-black shadow-goofy-black rotate-[4deg]">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h1 className="font-goofy text-3xl tracking-wide text-white leading-none">
              ENLIST FIGHTER!
            </h1>
            <span className="text-xs font-black text-accent-emerald uppercase tracking-widest">
              CREATE YOUR BATTLE TAG 💥
            </span>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-xl bg-accent-crimson/20 border-2 border-accent-crimson text-accent-crimson text-xs font-bold mb-4"
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <CheckCircle2 className="w-14 h-14 text-accent-emerald drop-shadow-goofy-emerald" />
            <h3 className="font-goofy text-2xl text-white uppercase tracking-wider">
              VERIFICATION DISPATCHED! 🎉
            </h3>
            <p className="text-xs text-zinc-300 font-medium max-w-xs">
              Check your inbox at <strong className="text-accent-cyan">{email}</strong> to activate your fighter ranking!
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-4 px-6 py-3 rounded-xl bg-accent-cyan text-black font-goofy text-lg uppercase shadow-goofy-black border-2 border-black hover:scale-105 active:translate-x-1 active:translate-y-1 transition-all"
            >
              PROCEED TO LOGIN 🚀
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4 text-xs font-bold">
            {/* Username Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-300 uppercase tracking-wider">
                COMPETITOR TAG (@handle) 🏷️
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-goofy text-lg font-black">@</span>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="flex_monster"
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#08090C] border-2 border-black focus:border-accent-emerald text-white outline-none font-medium placeholder:text-zinc-600 shadow-goofy-black"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-300 uppercase tracking-wider">
                ATHLETE EMAIL 📧
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@arena.gg"
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#08090C] border-2 border-black focus:border-accent-emerald text-white outline-none font-medium placeholder:text-zinc-600 shadow-goofy-black"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-300 uppercase tracking-wider">
                SECRET PASSWORD 🔒
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#08090C] border-2 border-black focus:border-accent-emerald text-white outline-none font-medium placeholder:text-zinc-600 shadow-goofy-black"
                />
              </div>
            </div>

            {/* Fitness Level Pill Selector */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-zinc-300 uppercase tracking-wider">
                ESTIMATED FITNESS TIER:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FITNESS_LEVELS.map((lvl) => {
                  const isSelected = fitnessLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setFitnessLevel(lvl.id)}
                      className={cn(
                        "flex flex-col items-center justify-center py-2 px-2.5 rounded-xl border-2 text-center transition-all",
                        isSelected
                          ? "bg-accent-emerald text-black border-black shadow-goofy-black"
                          : "bg-[#161B22] border-black text-zinc-400 hover:text-white"
                      )}
                    >
                      <span className="font-goofy text-base tracking-wider flex items-center gap-1">
                        <span>{lvl.emoji}</span>
                        <span>{lvl.label}</span>
                      </span>
                      <span className="text-[10px] font-bold tracking-wider">{lvl.benchmark}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 w-full py-3.5 rounded-xl bg-accent-emerald text-black hover:bg-emerald-300 border-2 border-black font-goofy text-xl tracking-wider uppercase transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>ENLIST IN ARENA 🔥</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t-2 border-black text-center text-xs text-zinc-400 font-bold">
          <span>ALREADY IN THE CLUB? </span>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-accent-emerald hover:underline font-black font-goofy text-base tracking-wider"
          >
            SIGN IN HERE 👋
          </button>
        </div>
      </div>
    </div>
  );
}
