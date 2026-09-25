/** Inline banner for form-level failures (bad credentials, duplicate email,
 *  backend unreachable). Field-level messages render on the inputs instead. */
export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[3px] border border-neg/25 bg-neg/5 px-3 py-2.5"
    >
      <span
        aria-hidden="true"
        className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full border border-neg/40 text-[0.625rem] font-bold text-neg"
      >
        !
      </span>
      <p className="text-[0.8125rem] leading-relaxed text-ink">{message}</p>
    </div>
  );
}
