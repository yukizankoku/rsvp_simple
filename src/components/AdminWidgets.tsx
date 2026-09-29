"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Keeps the dashboard numbers fresh during the event. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

export function CopyLink() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.origin + "/"), []);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-500">Link RSVP untuk dikirim ke tamu</p>
        <p className="truncate font-mono text-sm">{url || " "}</p>
      </div>
      <button type="button" onClick={copy} className="btn btn-ghost w-full sm:w-auto">
        {copied ? "Tersalin ✓" : "Salin link"}
      </button>
    </div>
  );
}
