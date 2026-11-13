"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MatchmakingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/arena/ranked");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex items-center justify-center font-mono text-xs">
      <span>CONNECTING TO MATCHMAKING LOBBY...</span>
    </div>
  );
}

