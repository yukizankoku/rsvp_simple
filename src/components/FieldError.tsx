export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
      <span aria-hidden>⚠</span> {message}
    </p>
  );
}
