import type { Metadata } from "next";
import { Chakra_Petch, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PushUp Arena | AI-Powered 1v1 Fitness Battles",
  description:
    "Real-time, computer-vision refereed push-up battles with zero hardware.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${chakraPetch.variable} ${outfit.variable} ${jetBrainsMono.variable}`}
    >
      <body className="antialiased selection:bg-accent-cyan/25 font-sans">
        <main className="min-h-screen bg-canvas text-white flex flex-col">
          <Navbar />
          <div className="flex-1 flex flex-col pt-20">{children}</div>
        </main>
      </body>
    </html>
  );
}
