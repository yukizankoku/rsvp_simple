"use client";

import { removeGuestFromList } from "@/app/admin/actions";

/** Confirmation shown before deleting a guest, here and on the edit page. */
export function confirmDelete(name: string, company: string, plusOneName?: string) {
  const extra = plusOneName ? ` Pendampingnya (${plusOneName}) juga ikut terhapus.` : "";
  return confirm(`Hapus ${name} (${company})? QR code tamu ini tidak akan berlaku lagi.${extra}`);
}

/** Small delete button for a row in the guest list. */
export function DeleteGuestButton({
  id,
  name,
  company,
  plusOneName,
}: {
  id: string;
  name: string;
  company: string;
  plusOneName?: string;
}) {
  return (
    <form action={removeGuestFromList} onSubmit={(e) => { if (!confirmDelete(name, company, plusOneName)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button aria-label={`Hapus ${name}`}
        className="min-h-10 rounded-lg px-3 text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600">
        Hapus
      </button>
    </form>
  );
}
