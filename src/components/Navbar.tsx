import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import logo from "../../images/logo.png";

const navItems = [
  { label: "Solutions", href: "#solutions" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? "border-b border-slate-200/70 bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,.06)] backdrop-blur-2xl" : "bg-white/70 backdrop-blur-sm"
      }`}
    >
      <nav className="mx-auto flex h-[88px] max-w-[1720px] items-center justify-between px-5 sm:px-8 lg:px-16 xl:px-[140px]">
        <a href="/" className="flex items-center gap-3" aria-label="Synthora.AI home">
          <img src={logo} alt="" className="h-11 w-11" loading="eager" />
          <span className="text-xl font-bold tracking-normal text-[#0F172A] sm:text-2xl">Synthora.AI</span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-[#1E293B] transition hover:text-[#0EA5E9] xl:text-base"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="#login"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#1E293B] transition hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
          >
            Login
          </a>
          <a
            href="#get-started"
            className="rounded-full bg-[#1E293B] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_42px_rgba(30,41,59,.18)] transition hover:-translate-y-0.5 hover:bg-[#0F172A]"
          >
            Get Started
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-[#0F172A] shadow-[0_14px_34px_rgba(15,23,42,.08)] backdrop-blur lg:hidden"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="mx-5 mb-5 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-glass backdrop-blur-2xl lg:hidden"
        >
          <div className="grid gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-base font-semibold text-[#1E293B] hover:bg-sky-50 hover:text-[#0EA5E9]"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href="#login"
              className="rounded-full border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-[#1E293B]"
              onClick={() => setIsOpen(false)}
            >
              Login
            </a>
            <a
              href="#get-started"
              className="rounded-full bg-[#1E293B] px-4 py-3 text-center text-sm font-bold text-white"
              onClick={() => setIsOpen(false)}
            >
              Get Started
            </a>
          </div>
        </motion.div>
      ) : null}
    </header>
  );
}
