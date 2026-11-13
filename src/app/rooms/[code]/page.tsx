"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RoomRedirect({ params }: { params: { code: string } }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/arena/room/${params.code}`);
  }, [router, params.code]);

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex items-center justify-center font-mono text-xs">
      <span>CONNECTING TO ARENA ROOM {params.code}...</span>
    </div>
  );
}

