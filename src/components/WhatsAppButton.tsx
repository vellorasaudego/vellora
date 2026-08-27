export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/5562981355553?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20os%20servi%C3%A7os%20da%20Vellora%20Sa%C3%BAde."
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco pelo WhatsApp"
      className="fixed bottom-5 right-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(21,94,51,0.28)] transition hover:-translate-y-0.5 hover:bg-[#20bd5a] focus:outline-none focus:ring-4 focus:ring-[#25D366]/25 sm:bottom-6 sm:right-6"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 11.5a8 8 0 0 1-11.8 7l-4.2 1.1 1.1-4A8 8 0 1 1 20 11.5Z" />
        <path d="M8.7 8.2c.3 2.8 2.4 5 5.1 5.7l1.1-1.2c.2-.2.5-.3.8-.1l1.6.7c.3.1.4.4.4.7-.2 1.4-1.4 2.3-2.8 2.2-4.7-.4-8.4-4.1-8.8-8.8-.1-1.4.8-2.6 2.2-2.8.3 0 .6.1.7.4l.7 1.6c.1.3.1.6-.1.8L8.7 8.2Z" />
      </svg>
      <span>Fale conosco</span>
    </a>
  );
}
