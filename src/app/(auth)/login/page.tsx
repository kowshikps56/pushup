"use client";

/**
 * PushUp Arena - Goofy Arcade Athlete Login
 * Path: src/app/(auth)/login/page.tsx
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  Zap,
} from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
      }
    } catch {
      setErrorMsg("Authentication request failed. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-[#08090C] text-white selection:bg-accent-crimson selection:text-white bg-arcade-grid select-none">
      <div className="flex flex-col max-w-md w-full p-8 rounded-2xl bg-[#0E1117] border-4 border-black shadow-goofy-cyan relative font-bouncy">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="self-start flex items-center gap-1.5 text-zinc-400 hover:text-white font-goofy text-sm uppercase mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO ARENA 🛹</span>
        </button>

        {/* Goofy Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent-cyan border-2 border-black text-black shadow-goofy-black rotate-[-4deg]">
            <span className="text-2xl">🥊</span>
          </div>
          <div>
            <h1 className="font-goofy text-3xl tracking-wide text-white leading-none">
              ATHLETE CHECK-IN
            </h1>
            <span className="text-xs font-black text-accent-cyan uppercase tracking-widest">
              DROP YOUR CREDENTIALS 💥
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

        <form onSubmit={handleSignIn} className="flex flex-col gap-4 text-xs font-bold">
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-300 uppercase tracking-wider">
              YOUR FIGHTER EMAIL 📧
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@arena.gg"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#08090C] border-2 border-black focus:border-accent-cyan text-white outline-none font-medium placeholder:text-zinc-600 shadow-goofy-black"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-300 uppercase tracking-wider">
              SECRET PASSWORD 🔒
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#08090C] border-2 border-black focus:border-accent-cyan text-white outline-none font-medium placeholder:text-zinc-600 shadow-goofy-black"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-3 w-full py-3.5 rounded-xl bg-accent-cyan text-black hover:bg-cyan-300 border-2 border-black font-goofy text-xl tracking-wider uppercase transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>ENTER ARENA 🚀</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t-2 border-black text-center text-xs text-zinc-400 font-bold">
          <span>NEW CONTENDER? </span>
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="text-accent-cyan hover:underline font-black font-goofy text-base tracking-wider"
          >
            ENLIST FREE HERE 💥
          </button>
        </div>
      </div>
    </div>
  );
}
