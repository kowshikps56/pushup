"use client";

/**
 * PushUp Arena - Goofy Arcade HUD Navigation Bar
 * Path: src/components/Navbar.tsx
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  Crown,
  Dumbbell,
  Flame,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  User,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Profile, UserRating } from "@/types/database";

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
  isPro?: boolean;
}

const NAV_LINKS: NavLinkItem[] = [
  { href: "/dashboard", label: "COMMAND", emoji: "🕹️", icon: Swords },
  { href: "/arena/solo", label: "SOLO LAB", emoji: "🧪", icon: Compass },
  { href: "/arena/ranked", label: "RANKED", emoji: "⚡", icon: Zap },
  { href: "/leaderboard", label: "LEADERBOARD", emoji: "🏆", icon: Trophy },
  { href: "/pricing", label: "PRO PASS", emoji: "👑", icon: Sparkles, isPro: true },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rating, setRating] = useState<UserRating | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function checkUserSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          setUser({ id: session.user.id });

          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (prof && isMounted) {
            setProfile(prof);
          }

          const { data: rat } = await supabase
            .from("ratings")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("exercise_id", "pushups")
            .single();

          if (rat && isMounted) {
            setRating(rat);
          }
        } else if (isMounted) {
          setUser(null);
          setProfile(null);
          setRating(null);
        }
      } catch (err) {
        console.error("[Navbar] Auth check error:", err);
      }
    }

    checkUserSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id });
        checkUserSession();
      } else {
        setUser(null);
        setProfile(null);
        setRating(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Don't render full navbar during active full-screen match arena sessions
  const isInMatch = pathname.startsWith("/arena/room/");
  if (isInMatch) {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    router.push("/login");
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#08090C]/95 backdrop-blur-md border-b-4 border-black select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Goofy High-Contrast Typography */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-3 group transition-transform hover:scale-105"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-cyan border-3 border-black text-black shadow-goofy-black rotate-[-3deg] group-hover:rotate-[3deg] transition-transform flex-shrink-0">
            <span className="text-2xl">🦾</span>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="font-goofy text-3xl sm:text-4xl tracking-wider text-white group-hover:text-accent-cyan transition-colors leading-none text-shadow-arcade">
                PUSHUP ARENA
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-accent-crimson text-white font-mono font-black text-[10px] border border-black uppercase tracking-wider shadow-sm">
                AI 1V1
              </span>
            </div>
            <span className="text-[11px] font-bouncy font-black uppercase tracking-widest text-accent-gold mt-0.5 flex items-center gap-1">
              <span>⚡</span>
              <span>DON&apos;T JUST WORK OUT. COMPETE.</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 font-bouncy font-bold text-xs uppercase transition-all",
                  isActive
                    ? "bg-accent-cyan text-black border-black shadow-goofy-black rotate-[-1deg]"
                    : link.isPro
                    ? "bg-accent-violet/20 border-accent-violet text-purple-300 hover:bg-accent-violet hover:text-white hover:border-black shadow-goofy-black"
                    : "bg-[#161B22] border-transparent text-zinc-300 hover:border-black hover:bg-zinc-800 hover:text-white"
                )}
              >
                <span>{link.emoji}</span>
                <span className="tracking-wide">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Identity or Auth Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {/* Division Badge & Rating */}
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161B22] border-2 border-black shadow-goofy-gold hover:scale-105 transition-transform"
              >
                <span className="text-base">🏆</span>
                <span className="font-goofy text-sm text-accent-gold uppercase tracking-wider">
                  {rating?.tier || "Bronze"}
                </span>
                <span className="font-mono text-xs font-black text-accent-cyan bg-black px-2 py-0.5 rounded border border-white/20">
                  {rating ? Math.round(rating.mu) : 1200}
                </span>
              </Link>

              {/* Profile Avatar Pill */}
              <Link
                href="/profile"
                className="flex items-center gap-2 p-1.5 pr-3 rounded-lg bg-[#1F242C] border-2 border-black shadow-goofy-black hover:scale-105 transition-transform"
              >
                <div className="w-7 h-7 rounded-md bg-accent-cyan text-black border border-black flex items-center justify-center font-goofy text-sm font-black">
                  {profile?.username?.substring(0, 2).toUpperCase() || "GO"}
                </div>
                <span className="font-bouncy font-black text-xs text-white max-w-[100px] truncate">
                  {profile?.display_name || profile?.username || "Champ"}
                </span>
              </Link>

              {/* Settings Icon */}
              <Link
                href="/settings"
                title="Settings & Privacy"
                className="p-2 rounded-lg bg-[#161B22] border-2 border-black text-zinc-400 hover:text-white shadow-goofy-black hover:scale-105 transition-transform"
              >
                <Settings className="w-4 h-4" />
              </Link>

              {/* Sign Out */}
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 rounded-lg bg-[#161B22] border-2 border-black text-accent-crimson hover:bg-accent-crimson hover:text-black shadow-goofy-black hover:scale-105 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-[#161B22] hover:bg-zinc-800 border-2 border-black text-white font-goofy text-base tracking-wider transition-transform hover:scale-105 shadow-goofy-black"
              >
                LOGIN
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-lg bg-accent-emerald text-black hover:bg-emerald-300 border-2 border-black font-goofy text-base tracking-wider transition-transform hover:scale-105 shadow-goofy-black"
              >
                JOIN THE FIGHT 💥
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-accent-cyan text-black border-2 border-black shadow-goofy-black"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0D0F14] border-b-4 border-black px-4 pt-3 pb-6 flex flex-col gap-3 font-bouncy">
          {user && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#161B22] border-2 border-black shadow-goofy-black mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white uppercase">
                    {profile?.display_name || profile?.username || "Athlete"}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    TIER: <strong className="text-accent-cyan font-goofy text-sm">{rating?.tier || "Bronze"}</strong> ({rating ? Math.round(rating.mu) : 1200} ELO)
                  </span>
                </div>
              </div>
              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg bg-[#1F242C] border border-black text-zinc-300"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg border-2 text-sm font-black uppercase transition-all",
                    isActive
                      ? "bg-accent-cyan text-black border-black shadow-goofy-black"
                      : link.isPro
                      ? "bg-accent-violet/20 border-accent-violet text-purple-300"
                      : "bg-[#161B22] border-black text-zinc-200"
                  )}
                >
                  <span className="text-lg">{link.emoji}</span>
                  <span className="font-goofy tracking-wide text-base">{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t-2 border-black flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-crimson text-black border-2 border-black font-goofy text-base tracking-wider shadow-goofy-black"
              >
                <LogOut className="w-4 h-4" />
                <span>SIGN OUT 👋</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2.5 rounded-lg text-center bg-[#161B22] border-2 border-black text-white font-goofy text-base shadow-goofy-black"
                >
                  LOGIN
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2.5 rounded-lg text-center bg-accent-emerald text-black border-2 border-black font-goofy text-base shadow-goofy-black"
                >
                  JOIN NOW 🔥
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
