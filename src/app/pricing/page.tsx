"use client";

/**
 * PushUp Arena - Goofy Arcade Pro Membership
 * Path: src/app/pricing/page.tsx
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Crown,
  HelpCircle,
  Minus,
  ShieldCheck,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureRow {
  title: string;
  free: boolean | string;
  pro: boolean | string;
  category: string;
}

const COMPARISON_MATRIX: FeatureRow[] = [
  { category: "Competition", title: "Random 1v1 Skill Matchmaking", free: true, pro: true },
  { category: "Competition", title: "Private Friend Rooms (30s, 60s, 120s)", free: true, pro: true },
  { category: "Competition", title: "Target Rep Challenge Mode", free: true, pro: true },
  { category: "Competition", title: "Browser-based AI 3D Pose Detection", free: true, pro: true },
  { category: "Competition", title: "Global Competitive Elo Ladder", free: true, pro: true },
  { category: "Competition", title: "Priority Matchmaking Queue", free: false, pro: true },
  { category: "Competition", title: "Custom Tournaments & Large Rooms", free: false, pro: true },
  { category: "AI & Biomechanics", title: "Real-time 90° Depth Verification", free: true, pro: true },
  { category: "AI & Biomechanics", title: "Basic Foul Detection (Plank Sag/Pike)", free: true, pro: true },
  { category: "AI & Biomechanics", title: "Post-match Biomechanical Diagnostic Report", free: false, pro: true },
  { category: "AI & Biomechanics", title: "Kinetic Angular Fatigue Breakdown", free: false, pro: true },
  { category: "AI & Biomechanics", title: "AI Push-up Form Coaching Insights", free: false, pro: true },
  { category: "Profile & Social", title: "Public Athlete Profile", free: true, pro: true },
  { category: "Profile & Social", title: "Career Match Ledger (Last 20 Matches)", free: "20 Matches", pro: "Unlimited" },
  { category: "Profile & Social", title: "Exclusive Neon Gold Profile Frame", free: false, pro: true },
  { category: "Profile & Social", title: "Verified Pro Athlete Combat Badge", free: false, pro: true },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("pro");

  return (
    <div className="min-h-screen bg-[#08090C] text-white selection:bg-accent-crimson selection:text-white bg-arcade-grid pb-24 select-none font-bouncy">
      {/* Header Banner */}
      <div className="relative pt-12 pb-12 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-violet/20 border-2 border-accent-violet text-purple-300 font-goofy text-base tracking-wider uppercase mb-4 shadow-goofy-black rotate-[-2deg]">
          <span>👑 ZERO PAY-TO-WIN • 100% FAIR COMPETITION</span>
        </div>

        <h1 className="font-goofy text-5xl sm:text-7xl uppercase text-white mb-3 tracking-wide">
          LEVEL UP TO <span className="text-accent-violet drop-shadow-goofy-cyan">PRO PASS! 💥</span>
        </h1>
        <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto font-medium">
          Basic 1v1 matchmaking and private rooms are free forever! Upgrade to Pro Pass for juicy joint diagnostics, AI form coaching, and tournament hosting!
        </p>

        {/* Billing Switcher */}
        <div className="mt-8 inline-flex items-center p-1.5 rounded-xl bg-[#161B22] border-3 border-black shadow-goofy-black font-goofy text-base">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "px-5 py-2 rounded-lg transition-all uppercase tracking-wider",
              billingCycle === "monthly"
                ? "bg-accent-violet text-white shadow-goofy-black"
                : "text-zinc-400 hover:text-white"
            )}
          >
            MONTHLY
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={cn(
              "flex items-center gap-1.5 px-5 py-2 rounded-lg transition-all uppercase tracking-wider",
              billingCycle === "annual"
                ? "bg-accent-violet text-white shadow-goofy-black"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <span>ANNUAL</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-accent-emerald text-black font-bouncy font-black">
              SAVE 17%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* FREE CARD */}
        <div
          onClick={() => setSelectedPlan("free")}
          className={cn(
            "flex flex-col p-8 rounded-2xl bg-[#0E1117] border-4 transition-all cursor-pointer relative",
            selectedPlan === "free"
              ? "border-accent-cyan shadow-goofy-cyan"
              : "border-black shadow-goofy-black hover:border-zinc-500"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-goofy text-sm uppercase tracking-widest text-zinc-400">
              TIER 01 // ROOKIE
            </span>
            <span className="text-3xl">🥔</span>
          </div>

          <h2 className="font-goofy text-4xl uppercase text-white mb-2 tracking-wide">
            FREE COMBATANT
          </h2>
          <p className="text-xs text-zinc-300 mb-6 font-medium">
            Everything needed to battle friends and climb the global push-up ladder!
          </p>

          <div className="flex items-baseline gap-1 mb-8">
            <span className="font-goofy text-6xl text-white">₹0</span>
            <span className="font-goofy text-lg text-zinc-500">/ FOREVER</span>
          </div>

          <div className="flex flex-col gap-3.5 mb-8 flex-1 text-xs text-zinc-200 font-bold">
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-emerald flex-shrink-0" />
              <span>Unlimited Random 1v1 Battles</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-emerald flex-shrink-0" />
              <span>Private Rooms with 6-char codes</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-emerald flex-shrink-0" />
              <span>Full MediaPipe 3D Landmark Tracking</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-emerald flex-shrink-0" />
              <span>Competitive Elo Global Ranking</span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-600">
              <Minus className="w-5 h-5 flex-shrink-0" />
              <span>Advanced Joint Fatigue Telemetry</span>
            </div>
          </div>

          <Link
            href="/signup"
            className="w-full py-3.5 rounded-xl bg-[#161B22] hover:bg-zinc-800 border-2 border-black text-white font-goofy text-lg uppercase tracking-wider text-center shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 transition-all"
          >
            START FREE NOW 🚀
          </Link>
        </div>

        {/* PRO CARD */}
        <div
          onClick={() => setSelectedPlan("pro")}
          className={cn(
            "flex flex-col p-8 rounded-2xl bg-[#12101A] border-4 transition-all cursor-pointer relative",
            selectedPlan === "pro"
              ? "border-accent-violet shadow-goofy-violet"
              : "border-black shadow-goofy-black hover:border-purple-600"
          )}
        >
          <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-lg bg-accent-violet text-white border-2 border-black font-goofy text-xs uppercase tracking-widest shadow-goofy-black">
            🔥 RECOMMENDED
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="font-goofy text-sm uppercase tracking-widest text-accent-violet">
              TIER 02 // PRO PASS
            </span>
            <span className="text-3xl">👑</span>
          </div>

          <h2 className="font-goofy text-4xl uppercase text-white mb-2 tracking-wide">
            PUSHUP ARENA PRO
          </h2>
          <p className="text-xs text-zinc-300 mb-6 font-medium">
            For serious contenders demanding high-fidelity biomechanical feedback & custom events!
          </p>

          <div className="flex items-baseline gap-1 mb-8">
            <span className="font-goofy text-6xl text-white">
              {billingCycle === "monthly" ? "₹99" : "₹999"}
            </span>
            <span className="font-goofy text-lg text-zinc-500">
              {billingCycle === "monthly" ? "/ MONTH" : "/ YEAR"}
            </span>
          </div>

          <div className="flex flex-col gap-3.5 mb-8 flex-1 text-xs text-zinc-200 font-bold">
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-emerald flex-shrink-0" />
              <span className="text-accent-emerald">Everything in Free Arena</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-violet flex-shrink-0" />
              <span>Full Biomechanical Rep Diagnostic Reports</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-violet flex-shrink-0" />
              <span>AI Form Coaching & Plank Sag Analysis</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-violet flex-shrink-0" />
              <span>Custom Community Tournament Hosting</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-accent-violet flex-shrink-0" />
              <span>Exclusive Golden Pro Frame & Avatar Badge</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => alert("PushUp Arena Pro checkout simulated. Beta preview mode active.")}
            className="w-full py-3.5 rounded-xl bg-accent-violet hover:bg-purple-600 border-2 border-black text-white font-goofy text-lg uppercase tracking-wider text-center shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 transition-all"
          >
            GET PRO PASS ({billingCycle === "monthly" ? "₹99/MO" : "₹999/YR"}) 👑
          </button>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="text-center mb-8">
          <h3 className="font-goofy text-3xl sm:text-4xl uppercase tracking-wider text-white">
            COMPLETE CAPABILITY MATRIX 📊
          </h3>
        </div>

        <div className="border-3 border-black rounded-2xl overflow-hidden bg-[#0E1117] shadow-goofy-black">
          <div className="grid grid-cols-12 bg-[#161B22] p-4 border-b-2 border-black font-goofy text-base uppercase text-zinc-300">
            <div className="col-span-6 sm:col-span-8">CAPABILITY</div>
            <div className="col-span-3 sm:col-span-2 text-center text-zinc-300">FREE</div>
            <div className="col-span-3 sm:col-span-2 text-center text-accent-violet">PRO</div>
          </div>

          <div className="divide-y-2 divide-black/40 text-xs font-bold">
            {COMPARISON_MATRIX.map((row, i) => (
              <div key={i} className="grid grid-cols-12 p-3.5 items-center hover:bg-[#161B22]/60 transition-colors">
                <div className="col-span-6 sm:col-span-8 text-zinc-300 flex items-center gap-2">
                  <span>{row.title}</span>
                </div>
                <div className="col-span-3 sm:col-span-2 flex justify-center text-zinc-400">
                  {typeof row.free === "boolean" ? (
                    row.free ? (
                      <Check className="w-5 h-5 text-accent-emerald" />
                    ) : (
                      <Minus className="w-4 h-4 text-zinc-600" />
                    )
                  ) : (
                    <span>{row.free}</span>
                  )}
                </div>
                <div className="col-span-3 sm:col-span-2 flex justify-center font-bold text-accent-violet">
                  {typeof row.pro === "boolean" ? (
                    row.pro ? (
                      <Check className="w-5 h-5 text-accent-violet" />
                    ) : (
                      <Minus className="w-4 h-4 text-zinc-600" />
                    )
                  ) : (
                    <span>{row.pro}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strict Anti-Pay-to-Win Pledge */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-2xl bg-[#161B22] border-3 border-black shadow-goofy-gold flex flex-col sm:flex-row items-center gap-5">
          <span className="text-4xl">🛡️</span>
          <div>
            <h4 className="font-goofy text-xl uppercase text-accent-gold tracking-wide mb-1">
              STRICT COMPETITIVE FAIRNESS GUARANTEE (SEC 9.2)
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              Paid membership never gives extra score points, easier opponents, or ranking shields. All athletes are judged strictly by the exact same 3D kinematic referee!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
