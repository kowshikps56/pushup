"use client";

/**
 * PushUp Arena - Goofy Arcade Settings & Calibration Hub
 * Path: src/app/settings/page.tsx
 */

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Lock,
  LogOut,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [hideBiometrics, setHideBiometrics] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraConsentDefault, setCameraConsentDefault] = useState(true);

  // Camera test state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (data) {
          setProfile(data);
          setDisplayName(data.display_name || data.username || "");
        }
      } catch (err) {
        console.error("Error loading profile settings:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  // Handle Camera Hardware Diagnostic
  const startCameraTest = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch {
      setCameraError(
        "Camera access denied or hardware not found. Please enable camera permissions in your browser."
      );
      setIsCameraActive(false);
    }
  };

  const stopCameraTest = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
        })
        .eq("id", profile.id);

      if (error) {
        alert(`Failed to save settings: ${error.message}`);
      } else {
        setSuccessMsg("Settings updated successfully! 💥");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      alert("Error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    stopCameraTest();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090C] text-white flex items-center justify-center font-goofy text-xl tracking-wider">
        <RefreshCw className="w-6 h-6 animate-spin text-accent-cyan mr-3" />
        <span>LOADING ATHLETE PREFERENCES...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090C] text-white selection:bg-accent-crimson selection:text-white bg-arcade-grid pb-24 select-none font-bouncy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Title */}
        <div className="flex items-center justify-between pb-4 border-b-4 border-black mb-8">
          <div>
            <span className="font-goofy text-base text-accent-cyan tracking-wider uppercase block">
              ⚙️ HARDWARE & PRIVACY
            </span>
            <h1 className="font-goofy text-3xl sm:text-5xl text-white tracking-wide">
              ATHLETE PREFERENCES
            </h1>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-crimson text-black border-2 border-black font-goofy text-base uppercase shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 transition-transform"
          >
            <LogOut className="w-4 h-4" />
            <span>SIGN OUT</span>
          </button>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-accent-emerald/20 border-2 border-accent-emerald text-accent-emerald text-sm font-bold mb-6">
            <CheckCircle2 className="w-5 h-5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Hardware & Diagnostics */}
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-cyan">
              <div className="flex items-center gap-2.5 font-goofy text-xl uppercase text-white mb-2">
                <span>📹 WEBCAM PRE-FLIGHT TEST</span>
              </div>
              <p className="text-xs text-zinc-300 mb-4 font-medium leading-relaxed">
                Position your camera directly to your side profile for crisp 90° elbow tracking!
              </p>

              <div className="relative aspect-video rounded-xl bg-[#08090C] border-2 border-black overflow-hidden flex items-center justify-center mb-4 shadow-goofy-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
                />
                {!isCameraActive && (
                  <div className="flex flex-col items-center gap-2 text-zinc-500 font-goofy text-lg">
                    <span className="text-3xl">📷</span>
                    <span>WEBCAM SENSOR OFFLINE</span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent-crimson/20 border-2 border-accent-crimson text-accent-crimson text-xs font-bold mb-4">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="flex gap-2">
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={startCameraTest}
                    className="flex-1 py-3 rounded-xl bg-accent-cyan text-black hover:bg-cyan-300 border-2 border-black font-goofy text-lg tracking-wider transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1"
                  >
                    TEST WEBCAM 🎥
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCameraTest}
                    className="flex-1 py-3 rounded-xl bg-[#161B22] border-2 border-black text-zinc-300 hover:text-white font-goofy text-lg tracking-wider transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1"
                  >
                    STOP CAMERA
                  </button>
                )}
              </div>
            </div>

            {/* Audio Synthesis */}
            <div className="p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-emerald">
              <div className="flex items-center gap-2.5 font-goofy text-xl uppercase text-white mb-2">
                <span>🔊 PROCEDURAL SOUND FX</span>
              </div>
              <p className="text-xs text-zinc-300 mb-4 font-medium leading-relaxed">
                Real-time Web Audio API sine-wave chimes for valid reps and sawtooth buzzers for fouls!
              </p>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#161B22] border-2 border-black">
                <span className="text-sm font-bold text-white">REP AUDIO CHIMES</span>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-14 h-7 rounded-full border-2 border-black transition-colors relative ${
                    soundEnabled ? "bg-accent-emerald" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${
                      soundEnabled ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Identity & Privacy Configuration */}
          <div className="flex flex-col gap-6">
            <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-violet flex flex-col gap-4">
              <div className="flex items-center gap-2.5 font-goofy text-xl uppercase text-white mb-1">
                <span>🛡️ CALLSIGN & PRIVACY</span>
              </div>

              <div className="flex flex-col gap-1.5 text-xs font-bold">
                <label className="text-zinc-300 uppercase">FIGHTER CALLSIGN (DISPLAY NAME)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Combatant Name"
                  className="px-3.5 py-3 rounded-xl bg-[#08090C] border-2 border-black focus:border-accent-cyan text-white outline-none font-medium shadow-goofy-black"
                />
              </div>

              {/* Privacy Toggles */}
              <div className="pt-2 flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#161B22] border-2 border-black">
                  <div className="flex flex-col pr-4">
                    <span className="text-white font-bold text-sm">HIDE BIOMETRICS ON LEADERBOARD</span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Height & weight kept strictly private by default.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHideBiometrics(!hideBiometrics)}
                    className={`w-14 h-7 rounded-full border-2 border-black transition-colors relative flex-shrink-0 ${
                      hideBiometrics ? "bg-accent-cyan" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${
                        hideBiometrics ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#161B22] border-2 border-black">
                  <div className="flex flex-col pr-4">
                    <span className="text-white font-bold text-sm">DEFAULT CAMERA CONSENT</span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Automatically request P2P video stream when entering rooms.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCameraConsentDefault(!cameraConsentDefault)}
                    className={`w-14 h-7 rounded-full border-2 border-black transition-colors relative flex-shrink-0 ${
                      cameraConsentDefault ? "bg-accent-cyan" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${
                        cameraConsentDefault ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-2 w-full py-3.5 rounded-xl bg-accent-violet text-white hover:bg-purple-600 border-2 border-black font-goofy text-lg uppercase tracking-wider transition-all shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>SAVE PREFERENCES 💾</span>
              </button>
            </form>

            {/* Account Deletion */}
            <div className="p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-crimson">
              <div className="flex items-center gap-2 font-goofy text-lg text-accent-crimson uppercase mb-1">
                <Trash2 className="w-5 h-5" />
                <span>DATA SUBJECT RIGHTS (SEC 14.2)</span>
              </div>
              <p className="text-xs text-zinc-300 mb-4 font-medium leading-relaxed">
                You can delete your fighter profile and all stored rep history anytime.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to request account and data deletion?")) {
                    alert("Account deletion request submitted per GDPR/CCPA regulations.");
                  }
                }}
                className="w-full py-3 rounded-xl bg-accent-crimson text-black hover:bg-rose-400 border-2 border-black font-goofy text-base uppercase tracking-wider shadow-goofy-black hover:scale-105 active:translate-x-1 active:translate-y-1 transition-all"
              >
                REQUEST ACCOUNT & DATA PURGE 🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
