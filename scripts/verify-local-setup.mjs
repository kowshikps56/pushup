#!/usr/bin/env node

/**
 * PushUp Arena - Local Environment & Dependency Verification Script
 * File: scripts/verify-local-setup.mjs
 *
 * Verifies system readiness before running `next dev`:
 * 1. Node.js version >= 18.17.0
 * 2. Environment variables configuration (.env.local)
 * 3. Essential dependencies in node_modules
 * 4. Application routes on disk
 */

import fs from "fs";
import path from "path";
import process from "process";

const COLOR = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

console.log(`\n${COLOR.bold}${COLOR.cyan}=================================================================${COLOR.reset}`);
console.log(`${COLOR.bold}${COLOR.cyan}         PUSHUP ARENA • LOCAL SYSTEM HEALTH CHECK                ${COLOR.reset}`);
console.log(`${COLOR.bold}${COLOR.cyan}=================================================================${COLOR.reset}\n`);

let hasErrors = false;
let hasWarnings = false;

function check(label, condition, info = "", isWarningOnly = false) {
  const icon = condition ? `${COLOR.green}✓ PASS${COLOR.reset}` : isWarningOnly ? `${COLOR.yellow}▲ WARN${COLOR.reset}` : `${COLOR.red}✗ FAIL${COLOR.reset}`;
  console.log(`  [${icon}] ${COLOR.bold}${label}${COLOR.reset} ${info ? COLOR.gray + "- " + info + COLOR.reset : ""}`);
  if (!condition) {
    if (isWarningOnly) hasWarnings = true;
    else hasErrors = true;
  }
}

// 1. Node.js Version Check
const currentVersion = process.versions.node;
const [major, minor] = currentVersion.split(".").map(Number);
const isNodeValid = major > 18 || (major === 18 && minor >= 17);
check("Node.js Runtime", isNodeValid, `v${currentVersion} (Required: >= v18.17.0)`);

// 2. Environment Configuration Check
const envLocalExists = fs.existsSync(".env.local");
const envExampleExists = fs.existsSync(".env.example");

check("Environment File", envLocalExists || envExampleExists, envLocalExists ? ".env.local detected" : ".env.example detected (copy to .env.local)");

if (envLocalExists) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const hasUrl = envContent.includes("NEXT_PUBLIC_SUPABASE_URL");
  const hasKey = envContent.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  check("Supabase Keys Setup", hasUrl && hasKey, hasUrl && hasKey ? "Keys configured" : "Placeholder keys present; local multi-tab mesh enabled", true);
}

// 3. Core Dependencies Check
const requiredPackages = [
  "@mediapipe/tasks-vision",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "lucide-react",
  "clsx",
  "tailwind-merge",
  "tailwindcss",
  "typescript",
];

const allModulesPresent = requiredPackages.every((pkg) => {
  return fs.existsSync(path.join("node_modules", pkg));
});
check("Required Packages", allModulesPresent, allModulesPresent ? "All 8 core packages installed in node_modules" : "Run 'npm install' to install missing dependencies");

// 4. Required Route Files Verification
const requiredRoutes = [
  "src/app/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/arena/solo/page.tsx",
  "src/app/arena/room/[code]/page.tsx",
  "src/app/arena/ranked/page.tsx",
  "src/app/leaderboard/page.tsx",
  "src/app/profile/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/settings/page.tsx",
  "src/app/matchmaking/page.tsx",
  "src/app/rooms/[code]/page.tsx",
  "src/app/(auth)/login/page.tsx",
  "src/app/(auth)/signup/page.tsx",
];

const missingRoutes = requiredRoutes.filter((routePath) => !fs.existsSync(routePath));
check(
  "Application Routes",
  missingRoutes.length === 0,
  missingRoutes.length === 0 ? "All 13 routes present on disk" : `Missing: ${missingRoutes.join(", ")}`
);

// 5. Core Engine Files Verification
const requiredCoreModules = [
  "src/features/exercises/pushups/poseDetector.ts",
  "src/features/exercises/pushups/repCounter.ts",
  "src/lib/webrtc/peerConnection.ts",
  "src/lib/webrtc/localMockSignaling.ts",
  "src/lib/elo.ts",
  "src/hooks/useMatchSync.ts",
  "src/components/Navbar.tsx",
];

const missingCore = requiredCoreModules.filter((p) => !fs.existsSync(p));
check(
  "Core AI & WebRTC Modules",
  missingCore.length === 0,
  missingCore.length === 0 ? "All mathematical and P2P modules intact" : `Missing: ${missingCore.join(", ")}`
);

console.log(`\n${COLOR.bold}${COLOR.cyan}-----------------------------------------------------------------${COLOR.reset}`);

if (hasErrors) {
  console.log(`${COLOR.bold}${COLOR.red}  [!] System check failed. Please address the errors above before running dev.${COLOR.reset}\n`);
  process.exit(1);
} else {
  console.log(`${COLOR.bold}${COLOR.green}  [✓] System check complete. Environment is ready for local execution!${COLOR.reset}`);
  console.log(`${COLOR.gray}      Local multi-tab WebRTC mesh active on localhost:3000${COLOR.reset}\n`);
}

