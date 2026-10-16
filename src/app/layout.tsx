import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { eventInfo } from "@/lib/event";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export async function generateMetadata(): Promise<Metadata> {
  const event = eventInfo();
  const description = `You're invited to ${event.name}. Confirm your attendance and get your QR code for registration.`;
  return {
    title: `RSVP · ${event.name}`,
    description,
    // Absolute URL of the poster in link previews (src/app/opengraph-image.jpg). Vercel fills this in by itself.
    metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
    openGraph: { title: `Invitation: ${event.name}`, description },
  };
}

export const viewport: Viewport = { themeColor: "#0b1120" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
