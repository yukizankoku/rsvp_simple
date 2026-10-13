import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { eventInfo } from "@/lib/event";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export async function generateMetadata(): Promise<Metadata> {
  const event = eventInfo();
  return { title: `RSVP · ${event.name}`, description: `Confirm your attendance at ${event.name}` };
}

export const viewport: Viewport = { themeColor: "#0b1120" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
