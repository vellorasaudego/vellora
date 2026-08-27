export type LineIconName =
  | "activity"
  | "arrow"
  | "care"
  | "check"
  | "clock"
  | "home"
  | "medical"
  | "person"
  | "shield";

export function LineIcon({
  name,
  className = "h-5 w-5",
}: {
  name: LineIconName;
  className?: string;
}) {
  const content = (() => {
    switch (name) {
      case "activity":
        return <path d="M3 12h4l2.2-6 4.1 12 2.1-6H21" />;
      case "arrow":
        return <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>;
      case "care":
        return <><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" /><path d="M8 12h2l1-2 2 4 1-2h2" /></>;
      case "check":
        return <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>;
      case "clock":
        return <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>;
      case "home":
        return <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>;
      case "medical":
        return <><path d="M6 3v5a6 6 0 0 0 12 0V3" /><path d="M3 3h6" /><path d="M15 3h6" /><path d="M12 14v2a4 4 0 0 0 4 4h1" /><circle cx="19" cy="20" r="2" /></>;
      case "person":
        return <><circle cx="9" cy="8" r="4" /><path d="M2 21v-2a7 7 0 0 1 14 0v2" /><path d="m17 11 2 2 3-4" /></>;
      case "shield":
        return <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>;
    }
  })();

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {content}
    </svg>
  );
}
