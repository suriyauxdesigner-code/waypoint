"use client";

import { useCallback, useState } from "react";
import type { z } from "zod";

/**
 * Minimal form state + zod validation. Values are kept as entered (strings for inputs);
 * the schema coerces and validates on submit. Errors are keyed by top-level field path.
 */
export function useZodForm<S extends z.ZodType, V extends Record<string, unknown>>(schema: S, initial: V) {
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = useCallback(<K extends keyof V>(key: K, value: V[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }, []);

  const validate = useCallback(
    (v: V = values): { ok: true; data: z.output<S> } | { ok: false } => {
      const res = schema.safeParse(v);
      if (res.success) {
        setErrors({});
        return { ok: true, data: res.data };
      }
      const errs: Record<string, string> = {};
      for (const issue of res.error.issues) {
        const key = issue.path.map(String).join(".") || "_form";
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return { ok: false };
    },
    [schema, values],
  );

  const handleSubmit = useCallback(
    (fn: (data: z.output<S>) => void) => (e?: React.FormEvent) => {
      e?.preventDefault();
      setSubmitted(true);
      const r = validate();
      if (r.ok) fn(r.data);
      else {
        // Bring the first invalid field into view on small screens.
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>("[aria-invalid='true']");
          el?.focus({ preventScroll: false });
        });
      }
    },
    [validate],
  );

  return { values, set, setValues, errors, setErrors, submitted, handleSubmit, validate };
}
