"use client";

/**
 * PushUp Arena - Goofy Arcade Edition
 * Path: src/app/page.tsx
 *
 * Full UI overhaul introducing goofy, punchy cartoon arcade typography,
 * wobbly stickers, interactive push-up physics simulator, and vibrant energy!
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Cpu,
  Crown,
  Flame,
  HelpCircle,
  Play,
  RotateCcw,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GOOFY_TIERS = [
  { name: "COUCH POTATO 🥔", range: "< 1100 ELO", desc: "Just getting off the couch!", color: "text-amber-400", border: "border-amber-500", bg: "bg-[#18120c]", shadow: "shadow-goofy-gold" },
  { name: "CAN OPENER 🥫", range: "1100 - 1399", desc: "Arms warming up nicely!", color: "text-zinc-200", border: "border-zinc-400", bg: "bg-[#161B22]", shadow: "shadow-goofy-black" },
  { name: "IRON FLEXER 🦾", range: "1400 - 1699", desc: "Solid 90° depth master!", color: "text-accent-gold", border: "border-accent-gold", bg: "bg-[#1c190a]", shadow: "shadow-goofy-gold" },
  { name: "GORILLA MODE 🦍", range: "1700 - 1999", desc: "Unstoppable rep machine!", color: "text-accent-emerald", border: "border-accent-emerald", bg: "bg-[#0b1c14]", shadow: "shadow-goofy-emerald" },
  { name: "SPACE TITAN 🛸", range: "2000 - 2299", desc: "Anti-gravity push-up alien!", color: "text-accent-cyan", border: "border-accent-cyan", bg: "bg-[#091a24]", shadow: "shadow-goofy-cyan" },
  { name: "GRAND OVERLORD 👑", range: "2300+ ELO", desc: "Certified push-up god!", color: "text-accent-crimson", border: "border-accent-crimson", bg: "bg-[#220c14]", shadow: "shadow-goofy-crimson" },
];

const FAQS = [
  {
    question: "IS MY WEBCAM STREAM RECORDED OR STORED BY CREEPY SERVERS? 🕵️",
    answer:
      "NOPE! ZERO video ever leaves your device. All MediaPipe pose detection runs locally in your browser through WebAssembly. In 1v1 matches, video travels direct peer-to-peer (WebRTC) with mutual consent. No weird server storage!",
  },
  {
    question: "HOW DOES THE AI CATCH HALF-REPPERS AND CHEATERS? 🤖",
    answer:
      "Our AI referee tracks 33 body landmarks in real-time. If you don't hit that juicy 90° elbow bend, no rep for you! If you sag like a ripe banana (hip angle <148°), FOUL! Full lockout (>158°) required at the top. Zero noodle arms permitted!",
  },
  {
    question: "CAN I SMACK TALK AND CHALLENGE MY FRIENDS? 🎮",
    answer:
      "ABSOLUTELY. Hit 'Create Private Room', get your goofy 6-character room code (like BANANA or ARENA1), shoot the WhatsApp invite to your buddy, and battle it out in 30s, 60s, or first-to-25 target mode!",
  },
  {
    question: "DO I NEED EXPENSIVE SMARTWATCHES OR FITNESS SENSORS? ⌚",
    answer:
      "Zero gadgets needed! Just your ordinary phone, laptop, or webcam. Prop it up to your side, start moving, and let the AI do the refereeing while you sweat it out.",
  },
  {
    question: "IS THIS REALLY 100% FREE? 💸",
    answer:
      "YES! Free random matches, free friend rooms, free solo lab, and free global leaderboard. Optional Pro Pass (₹99/mo) gives you funny profile badges and advanced joint fatigue reports.",
  },
];

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Goofy Biomechanics Simulator State
  const [simAngle, setSimAngle] = useState(165);
  const [simReps, setSimReps] = useState(0);
  const [simPhase, setSimPhase] = useState<"LOCKOUT" | "DOWN" | "BOTTOM" | "UP">("LOCKOUT");
  const [isSimulating, setIsSimulating] = useState(false);

  // Play fun procedural chime
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15); // C6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Run automated goofy rep cycle
  const runAutoSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    setSimPhase("DOWN");
    setSimAngle(130);

    setTimeout(() => {
      setSimPhase("BOTTOM");
      setSimAngle(78);

      setTimeout(() => {
        setSimPhase("UP");
        setSimAngle(125);

        setTimeout(() => {
          setSimPhase("LOCKOUT");
          setSimAngle(165);
          setSimReps((prev) => prev + 1);
          playChime();
          setIsSimulating(false);
        }, 300);
      }, 300);
    }, 300);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#08090C] text-white selection:bg-accent-crimson selection:text-white bg-arcade-grid select-none pb-24">
      {/* --------------------------------------------------------------------- */}
      {/* 1. GOOFY HERO SECTION & ULTRA-PROMINENT LOGO */}
      {/* --------------------------------------------------------------------- */}
      <section className="relative pt-8 pb-16 md:pt-12 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Floating Wacky Stickers */}
        <div className="hidden lg:block absolute top-8 left-6 rotate-[-8deg] px-4 py-2 rounded-xl bg-accent-gold text-black border-3 border-black font-goofy text-base shadow-goofy-black hover-wobble cursor-pointer">
          🍌 NO BANANA SPINES!
        </div>
        <div className="hidden lg:block absolute top-14 right-6 rotate-[8deg] px-4 py-2 rounded-xl bg-accent-crimson text-white border-3 border-black font-goofy text-base shadow-goofy-black hover-wobble cursor-pointer">
          💥 90° OR IT DIDN&apos;T HAPPEN!
        </div>

        {/* Operational Brand Emblem */}
        <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-[#0E1117] border-3 border-accent-cyan shadow-goofy-cyan mb-8 hover-wobble cursor-pointer">
          <span className="text-3xl">🦾</span>
          <span className="font-goofy text-3xl sm:text-4xl text-white tracking-wider text-shadow-arcade">
            PUSHUP ARENA
          </span>
          <span className="px-2 py-0.5 rounded bg-accent-crimson text-white font-mono font-black text-xs border border-black shadow-sm">
            OFFICIAL v1.0
          </span>
        </div>

        {/* Goofy Ultra Title & Brand Name */}
        <div className="mb-8">
          <span className="font-goofy text-2xl sm:text-3xl text-accent-gold uppercase tracking-widest block text-shadow-arcade mb-3">
            DON&apos;T JUST WORK OUT... COMPETE!
          </span>
          <h1 className="font-goofy text-6xl sm:text-8xl lg:text-9xl tracking-wider text-white mt-1 mb-4 leading-none text-shadow-arcade-lg">
            PUSHUP <span className="text-accent-cyan underline decoration-accent-emerald decoration-wavy decoration-4">ARENA</span>
          </h1>
          <p className="font-goofy text-2xl sm:text-3xl text-accent-emerald tracking-wide text-shadow-arcade mb-4">
            ⚡ REAL-TIME 1V1 AI FITNESS SHOWDOWNS ⚡
          </p>
          <p className="font-bouncy text-base sm:text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed font-semibold">
            Challenge gym friends or battle global athletes in live head-to-head push-up showdowns. Refereed in real-time by browser-based 3D computer vision with zero wearables required!
          </p>
        </div>

        {/* Chunky Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-2">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-accent-emerald text-black hover:bg-emerald-300 border-3 border-black font-goofy text-2xl tracking-wider transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2.5"
          >
            <span>JOIN THE BATTLE 🚀</span>
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </Link>
          <Link
            href="/arena/solo"
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-[#161B22] hover:bg-zinc-800 border-3 border-black text-white font-goofy text-2xl tracking-wider transition-all shadow-goofy-cyan hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2.5"
          >
            <span>TRY SOLO LAB 🧪</span>
          </Link>
        </div>

        {/* Hero Ultra-Clear Metrics HUD (High-Contrast Numbers) */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full">
          <div className="p-4 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-cyan flex flex-col items-center text-center">
            <span className="font-mono text-4xl sm:text-5xl font-black text-accent-cyan leading-none text-shadow-arcade">
              33
            </span>
            <span className="font-bouncy text-xs font-black text-white uppercase tracking-wider mt-2">
              Body Landmarks
            </span>
            <span className="text-[11px] text-zinc-400 font-bold">Sub-mm 3D tracking</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-emerald flex flex-col items-center text-center">
            <span className="font-mono text-4xl sm:text-5xl font-black text-accent-emerald leading-none text-shadow-arcade">
              90°
            </span>
            <span className="font-bouncy text-xs font-black text-white uppercase tracking-wider mt-2">
              Strict Form Depth
            </span>
            <span className="text-[11px] text-zinc-400 font-bold">Zero half-reps allowed</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-gold flex flex-col items-center text-center">
            <span className="font-mono text-4xl sm:text-5xl font-black text-accent-gold leading-none text-shadow-arcade">
              60s
            </span>
            <span className="font-bouncy text-xs font-black text-white uppercase tracking-wider mt-2">
              Lightning Rounds
            </span>
            <span className="text-[11px] text-zinc-400 font-bold">Anti-cheat server clock</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-crimson flex flex-col items-center text-center">
            <span className="font-mono text-4xl sm:text-5xl font-black text-accent-crimson leading-none text-shadow-arcade">
              0%
            </span>
            <span className="font-bouncy text-xs font-black text-white uppercase tracking-wider mt-2">
              Stored Video
            </span>
            <span className="text-[11px] text-zinc-400 font-bold">100% Client-side WASM</span>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 2. GOOFY INTERACTIVE AI SKELETON DEMO */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-8">
          <span className="font-goofy text-lg text-accent-emerald tracking-wider uppercase block text-shadow-arcade">
            🧪 THE BIO-MECHANICAL GIZMO
          </span>
          <h2 className="font-goofy text-4xl sm:text-5xl text-white tracking-wide text-shadow-arcade">
            TEST THE AI REFEREE LIVE!
          </h2>
          <p className="font-bouncy text-base text-zinc-300 max-w-xl mx-auto mt-1 font-semibold">
            Drag the slider down to 90° or click &apos;SIMULATE REP&apos; to watch the goofy skeleton flex and credit a valid rep!
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-[#0E1117] border-4 border-black shadow-goofy-cyan">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visualizer Canvas */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-xl bg-[#08090C] border-3 border-black relative min-h-[320px]">
              {/* Goofy State Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className={cn(
                  "font-goofy text-sm tracking-wide px-3.5 py-1.5 rounded-xl border-2 border-black shadow-goofy-black uppercase text-shadow-arcade",
                  simPhase === "BOTTOM"
                    ? "bg-accent-emerald text-black"
                    : simPhase === "LOCKOUT"
                    ? "bg-accent-cyan text-black"
                    : "bg-accent-gold text-black"
                )}>
                  {simPhase === "BOTTOM" ? "🎉 BOOM! DEPTH HIT (≤90°)" : simPhase === "LOCKOUT" ? "🔒 LOCKED & LOADED (175°)" : "⬇️ LOWERING..."}
                </span>
              </div>

              {/* Ultra-Prominent Illuminated Digital Score Box */}
              <div className="absolute top-4 right-4 flex flex-col items-center bg-black border-3 border-accent-emerald rounded-2xl px-5 py-2.5 shadow-goofy-emerald min-w-[125px]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald animate-pulse" />
                  <span className="font-goofy text-xs text-accent-emerald uppercase tracking-widest font-black">
                    VALID REPS
                  </span>
                </div>
                <span className="font-mono text-5xl sm:text-6xl font-black text-white text-shadow-arcade leading-none tracking-tight">
                  {simReps.toString().padStart(2, "0")}
                </span>
              </div>

              {/* Goofy Stick Skeleton */}
              <svg viewBox="0 0 400 240" className="w-full max-w-md h-auto mt-10 sm:mt-6">
                {/* Surface datum */}
                <line x1="20" y1="210" x2="380" y2="210" stroke="#FFD700" strokeWidth="4" strokeDasharray="8 6" />
                <text x="30" y="228" fill="#FFD700" fontSize="13" fontWeight="900" fontFamily="monospace">FLOOR LEVEL 🛹</text>

                {/* Torso & Legs */}
                <line x1="120" y1="100" x2="240" y2="115" stroke="#00F2FE" strokeWidth="6" strokeLinecap="round" />
                <line x1="240" y1="115" x2="340" y2="190" stroke="#00F2FE" strokeWidth="6" strokeLinecap="round" />

                {/* Head with silly sweat drop */}
                <circle cx="95" cy="85" r="16" fill="#FFD700" stroke="#000" strokeWidth="3" />
                <circle cx="90" cy="82" r="2.5" fill="#000" />
                <circle cx="100" cy="82" r="2.5" fill="#000" />
                <path d="M 88 92 Q 95 98 102 92" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                {/* Dynamic Arm Chain */}
                {(() => {
                  const rad = ((180 - simAngle) * Math.PI) / 180;
                  const elbowX = 120 + Math.sin(rad) * 45;
                  const elbowY = 100 + Math.cos(rad) * 45;

                  const isDepth = simAngle <= 90;
                  const armColor = isDepth ? "#00FF87" : simAngle < 140 ? "#FFD700" : "#FF3366";

                  return (
                    <g>
                      <line x1="120" y1="100" x2={elbowX} y2={elbowY} stroke={armColor} strokeWidth="8" strokeLinecap="round" />
                      <line x1={elbowX} y1={elbowY} x2="110" y2="205" stroke={armColor} strokeWidth="8" strokeLinecap="round" />

                      {/* Joints */}
                      <circle cx="120" cy="100" r="7" fill="#00F2FE" stroke="#000" strokeWidth="2" />
                      <circle cx={elbowX} cy={elbowY} r="9" fill={armColor} stroke="#000" strokeWidth="3" />
                      <circle cx="110" cy="205" r="7" fill="#00F2FE" stroke="#000" strokeWidth="2" />
                      <circle cx="240" cy="115" r="7" fill="#00F2FE" stroke="#000" strokeWidth="2" />
                      <circle cx="340" cy="190" r="7" fill="#00F2FE" stroke="#000" strokeWidth="2" />

                      {/* Goofy speech tag with large, crystal-clear numbers */}
                      <rect x={elbowX + 10} y={elbowY - 18} width="72" height="34" rx="8" fill="#000000" stroke={armColor} strokeWidth="3" />
                      <text x={elbowX + 46} y={elbowY + 6} fill="#FFFFFF" fontSize="20" fontWeight="900" fontFamily="monospace" textAnchor="middle">
                        {Math.round(simAngle)}°
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Goofy Controls with Large Number Readouts */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Arm Bend Gauge Readout Card */}
              <div className="p-4 rounded-xl bg-black border-3 border-accent-cyan shadow-goofy-cyan flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bouncy text-xs font-black text-zinc-400 uppercase tracking-wider">
                    LIVE JOINT ANGLE
                  </span>
                  <span className="font-bouncy text-sm font-bold text-white">
                    {simAngle <= 90 ? "🎉 VALID REP CRITERIA MET!" : "⬇️ LOWER CHEST BELOW 90°"}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-[#161B22] border-2 border-black rounded-xl px-4 py-1.5 shadow-inner">
                  <span className="font-mono text-3xl sm:text-4xl font-black text-accent-cyan">
                    {Math.round(simAngle)}°
                  </span>
                </div>
              </div>

              {/* Range Slider & Illuminated Bounds */}
              <div className="flex flex-col gap-2.5">
                <input
                  type="range"
                  min="70"
                  max="175"
                  value={simAngle}
                  disabled={isSimulating}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimAngle(val);
                    if (val <= 90) setSimPhase("BOTTOM");
                    else if (val >= 158) {
                      if (simPhase === "BOTTOM" || simPhase === "UP") {
                        setSimReps((r) => r + 1);
                        playChime();
                      }
                      setSimPhase("LOCKOUT");
                    } else if (simPhase === "LOCKOUT" && val < 145) {
                      setSimPhase("DOWN");
                    } else if (simPhase === "BOTTOM" && val > 108) {
                      setSimPhase("UP");
                    }
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-3.5 bg-black rounded-lg border-2 border-black"
                />

                {/* High-Contrast Bounds Markers */}
                <div className="flex justify-between items-center gap-2 pt-1">
                  <div className="px-3 py-1.5 rounded-lg bg-black border-2 border-zinc-700 text-center flex-1">
                    <span className="font-mono font-black text-sm sm:text-base text-white block">70°</span>
                    <span className="text-[10px] font-bouncy font-bold text-zinc-400 uppercase">Mega Deep</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-black border-2 border-accent-emerald text-center flex-1 shadow-goofy-emerald">
                    <span className="font-mono font-black text-base sm:text-lg text-accent-emerald block">90°</span>
                    <span className="text-[10px] font-bouncy font-black text-accent-emerald uppercase">Target ⭐</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-black border-2 border-accent-cyan text-center flex-1">
                    <span className="font-mono font-black text-sm sm:text-base text-accent-cyan block">175°</span>
                    <span className="text-[10px] font-bouncy font-bold text-zinc-400 uppercase">Lockout</span>
                  </div>
                </div>
              </div>

              {/* Plank Status */}
              <div className="p-3.5 rounded-xl bg-[#161B22] border-2 border-black flex items-center justify-between font-bouncy">
                <div>
                  <span className="text-white font-black text-sm block">PLANK ALIGNMENT:</span>
                  <span className="text-xs text-zinc-400 font-semibold">Core locked straight, no hip sag! 🍌</span>
                </div>
                <div className="flex items-center gap-2 bg-black border-2 border-accent-emerald px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="font-mono text-xl font-black text-accent-emerald">175°</span>
                  <span className="font-bouncy font-black text-[11px] text-black bg-accent-emerald px-2 py-0.5 rounded">
                    PERFECT
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={runAutoSimulation}
                  className="flex-1 py-3.5 rounded-xl bg-accent-cyan text-black hover:bg-cyan-300 border-3 border-black font-goofy text-xl tracking-wider transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>SIMULATE REP 💥</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimReps(0);
                    setSimAngle(165);
                    setSimPhase("LOCKOUT");
                  }}
                  className="p-3.5 rounded-xl bg-[#161B22] border-3 border-black text-zinc-400 hover:text-white shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none"
                  title="Reset Counter"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 3. GOOFY COMPETITION MODES */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="font-goofy text-lg text-accent-gold uppercase tracking-wider block text-shadow-arcade">
            🎮 PICK YOUR ARENA
          </span>
          <h2 className="font-goofy text-4xl sm:text-5xl text-white tracking-wide text-shadow-arcade">
            TWO WAYS TO BROWBEAT OPPONENTS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mode 1 */}
          <div className="p-8 rounded-2xl bg-[#0E1117] border-4 border-black shadow-goofy-cyan flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-goofy text-base text-accent-cyan tracking-wider text-shadow-arcade">
                  ⚡ RANKED MATCHMAKING
                </span>
                <span className="text-3xl">🥊</span>
              </div>

              <h3 className="font-goofy text-3xl sm:text-4xl text-white mb-2 tracking-wide text-shadow-arcade">
                GLOBAL RANKED QUEUE
              </h3>
              <p className="font-bouncy text-sm sm:text-base text-zinc-300 font-semibold mb-6 leading-relaxed">
                Step into the matchmaking ring! We pair you with another human anywhere in the world with similar skill Elo in an all-out sprint!
              </p>

              {/* Prominent Match Duration Tag */}
              <div className="inline-flex items-center gap-2.5 bg-black border-2 border-accent-cyan px-3.5 py-1.5 rounded-xl mb-6 shadow-goofy-cyan">
                <Clock className="w-4 h-4 text-accent-cyan" />
                <span className="font-mono text-lg font-black text-accent-cyan">60s</span>
                <span className="font-bouncy text-xs font-black text-white uppercase tracking-wider">OFFICIAL CLOCK</span>
              </div>

              <div className="flex flex-col gap-2.5 font-bouncy text-xs sm:text-sm font-bold text-zinc-300 mb-8">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-accent-cyan stroke-[3]" />
                  <span>Real-time anti-cheat countdown clock</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-accent-cyan stroke-[3]" />
                  <span>Earn or lose official Elo rating points</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-accent-cyan stroke-[3]" />
                  <span>Mutual video consent required before starting</span>
                </div>
              </div>
            </div>

            <Link
              href="/arena/ranked"
              className="w-full py-4 rounded-xl bg-accent-cyan text-black hover:bg-cyan-300 border-3 border-black font-goofy text-xl tracking-wider text-center transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              FIND RANDOM OPPONENT 🥊
            </Link>
          </div>

          {/* Mode 2 */}
          <div className="p-8 rounded-2xl bg-[#0E1117] border-4 border-black shadow-goofy-emerald flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-goofy text-base text-accent-emerald tracking-wider text-shadow-arcade">
                  👥 FRIEND SHOWDOWN
                </span>
                <span className="text-3xl">🍕</span>
              </div>

              <h3 className="font-goofy text-3xl sm:text-4xl text-white mb-2 tracking-wide text-shadow-arcade">
                6-CHAR FRIEND ROOMS
              </h3>
              <p className="font-bouncy text-sm sm:text-base text-zinc-300 font-semibold mb-6 leading-relaxed">
                Create a private room with a 6-letter code (like &apos;ARENA1&apos;), send the WhatsApp invite link to your gym buddy or college friend, and challenge them to multiple target options!
              </p>

              {/* Prominent Friend Mode Durations Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <div className="bg-black border-2 border-accent-emerald px-3 py-1 rounded-lg">
                  <span className="font-mono text-sm sm:text-base font-black text-accent-emerald">30s</span>
                </div>
                <div className="bg-black border-2 border-accent-emerald px-3 py-1 rounded-lg">
                  <span className="font-mono text-sm sm:text-base font-black text-accent-emerald">60s</span>
                </div>
                <div className="bg-black border-2 border-accent-emerald px-3 py-1 rounded-lg">
                  <span className="font-mono text-sm sm:text-base font-black text-accent-emerald">120s</span>
                </div>
                <div className="bg-black border-2 border-accent-gold px-3 py-1 rounded-lg">
                  <span className="font-mono text-sm sm:text-base font-black text-accent-gold">25 REPS TARGET</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 font-bouncy text-xs sm:text-sm font-bold text-zinc-300 mb-8">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-accent-emerald stroke-[3]" />
                  <span>One-click WhatsApp invite link generation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-accent-emerald stroke-[3]" />
                  <span>Casual mode (no Elo risk with friends)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-accent-emerald stroke-[3]" />
                  <span>First-to-25 speed target or custom timers</span>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-4 rounded-xl bg-accent-emerald text-black hover:bg-emerald-300 border-3 border-black font-goofy text-xl tracking-wider text-center transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              CREATE PRIVATE ROOM 👥
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 4. GOOFY TIERS LADDER (HIGH-CONTRAST ELO NUMBERS) */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="font-goofy text-lg text-accent-gold uppercase tracking-wider block text-shadow-arcade">
            🏆 THE HALL OF FLEX
          </span>
          <h2 className="font-goofy text-4xl sm:text-5xl text-white tracking-wide text-shadow-arcade">
            OFFICIAL COMPETITIVE TIERS
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {GOOFY_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "p-4 rounded-2xl border-3 border-black text-center flex flex-col justify-between transition-transform hover:-translate-y-1.5 shadow-goofy-black",
                tier.bg,
                tier.shadow
              )}
            >
              <div>
                <h4 className={cn("font-goofy text-lg tracking-wide uppercase text-shadow-arcade", tier.color)}>
                  {tier.name}
                </h4>
                {/* High Contrast Obsidian Pill for Elo Numbers */}
                <div className="my-2.5 py-1 px-2 bg-black rounded-lg border-2 border-white/20 shadow-inner">
                  <span className="font-mono text-xs sm:text-sm font-black text-white tracking-wider block">
                    {tier.range}
                  </span>
                </div>
              </div>
              <p className="font-bouncy text-xs text-zinc-200 font-semibold mt-1">
                {tier.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 5. GOOFY FAQ ACCORDION */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="font-goofy text-4xl sm:text-5xl text-white tracking-wide">
            STILL CONFUSED? READ THIS! 🤔
          </h2>
        </div>

        <div className="flex flex-col gap-3 font-bouncy">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="border-3 border-black rounded-xl bg-[#0E1117] overflow-hidden shadow-goofy-black"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 flex items-center justify-between text-left font-goofy text-lg text-zinc-200 hover:text-accent-cyan transition-colors"
                >
                  <span>{faq.question}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-accent-cyan" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 font-bouncy text-sm text-zinc-300 border-t-2 border-black/40 font-medium leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 6. CALL TO ACTION FOOTER BANNER */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="p-10 rounded-2xl bg-[#0E1117] border-4 border-black shadow-goofy-cyan relative overflow-hidden">
          <span className="text-5xl block mb-2">🦾</span>
          <h2 className="font-goofy text-4xl sm:text-5xl uppercase text-white tracking-wide mb-3 text-shadow-arcade">
            STOP READING. START DROPPING!
          </h2>
          <p className="font-bouncy text-base text-zinc-300 max-w-md mx-auto mb-6 font-semibold">
            Ready to test your upper body against real competitors worldwide? Hop in, it takes 5 seconds!
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-9 py-4 rounded-xl bg-accent-cyan text-black hover:bg-cyan-300 border-3 border-black font-goofy text-2xl tracking-wider shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 transition-all"
          >
            <span>ENLIST FREE NOW 💥</span>
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 7. ARCADE FOOTER & BRAND LOGO */}
      {/* --------------------------------------------------------------------- */}
      <footer className="pt-8 pb-12 border-t-4 border-black bg-[#060709] text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🦾</span>
            <span className="font-goofy text-3xl text-white tracking-wider text-shadow-arcade">
              PUSHUP ARENA
            </span>
            <span className="px-2 py-0.5 rounded bg-accent-emerald text-black font-mono font-black text-xs border border-black shadow-sm">
              ONLINE
            </span>
          </div>
          <p className="font-bouncy text-xs font-bold text-zinc-400">
            &copy; {new Date().getFullYear()} PUSHUP ARENA • REAL-TIME AI FITNESS REFEREE • NO WEARABLES NEEDED
          </p>
        </div>
      </footer>
    </div>
  );
}
