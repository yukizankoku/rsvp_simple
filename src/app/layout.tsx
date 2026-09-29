import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { eventInfo } from "@/lib/event";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export async function generateMetadata(): Promise<Metadata> {
  const event = eventInfo();
  return { title: `RSVP · ${event.name}`, description: `Konfirmasi kehadiran ${event.name}` };
}

export const viewport: Viewport = { themeColor: "#4f46e5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
