import Link from "next/link";

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="brand-lockup" aria-label="Vellora Saúde — página inicial">
      <span className="brand-mark" aria-hidden="true">
        <span className="relative inline-flex items-baseline font-bold leading-none">
          <span className="text-lg tracking-[-0.08em]">V</span>
          <span className="-ml-0.5 text-sm text-[#a8eee2]">+</span>
        </span>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[1.05rem] font-bold tracking-[-0.03em] text-[var(--foreground)]">
            Vellora Saúde
          </span>
        </span>
      )}
    </Link>
  );
}
