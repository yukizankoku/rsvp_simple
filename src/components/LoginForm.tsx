"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { Alert } from "./Alert";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="card space-y-5 p-6">
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" required autoFocus
          autoComplete="current-password" className="input" />
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Masuk…" : "Masuk"}
      </button>
    </form>
  );
}
