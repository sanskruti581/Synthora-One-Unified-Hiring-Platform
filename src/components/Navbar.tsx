import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Globe2, Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import logo from "../../images/logo.png";

const navItems = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "AI Agents", href: "#features" },
  { label: "Solutions", href: "#solutions", hasDropdown: true },
  { label: "Pricing", href: "#pricing" },
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
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 px-3 pt-4 sm:px-5"
    >
      <nav
        className={`pointer-events-auto mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border border-synthora-border bg-white px-4 py-2.5 shadow-[0_18px_45px_rgba(15,23,42,.08)] transition-all duration-300 sm:px-5 lg:px-6 ${
          isScrolled ? "shadow-[0_20px_55px_rgba(15,23,42,.12)]" : ""
        }`}
      >
        <a href="/" className="flex min-w-0 items-center gap-2" aria-label="Synthora.AI home">
          <img src={logo} alt="" className="h-10 w-10 shrink-0" loading="eager" />
          <span className="truncate text-lg font-bold tracking-normal text-synthora-text sm:text-xl">Synthora.AI</span>
        </a>

        <div className="hidden items-center justify-center gap-7 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-1 text-sm font-medium text-synthora-muted transition hover:text-synthora-blue"
            >
              {item.label}
              {item.hasDropdown ? <ChevronDown size={15} strokeWidth={2.2} /> : null}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-synthora-muted transition hover:text-synthora-text"
            aria-label="Select language"
          >
            <Globe2 size={16} />
            <span>EN</span>
            <ChevronDown size={14} strokeWidth={2.2} />
          </button>
          <Link
            to="/login"
            className="text-sm font-medium text-synthora-muted transition hover:text-synthora-text"
          >
            Login
          </Link>
          <Link
            to="/company/register"
            className="rounded-full bg-synthora-blue px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-synthora-blue-hover hover:shadow-[0_18px_38px_rgba(37,99,235,.32)]"
          >
            Register Company
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-synthora-border bg-white text-synthora-text shadow-[0_12px_28px_rgba(15,23,42,.08)] lg:hidden"
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
          className="pointer-events-auto mx-auto mt-3 max-w-6xl rounded-xl border border-synthora-border bg-white p-4 shadow-[0_22px_55px_rgba(15,23,42,.12)] lg:hidden"
        >
          <div className="grid gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-synthora-muted transition hover:bg-blue-50 hover:text-synthora-blue"
                onClick={() => setIsOpen(false)}
              >
                <span>{item.label}</span>
                {item.hasDropdown ? <ChevronDown size={16} strokeWidth={2.2} /> : null}
              </a>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-synthora-muted">
            <span className="inline-flex items-center gap-2">
              <Globe2 size={16} />
              EN
            </span>
            <ChevronDown size={15} strokeWidth={2.2} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              to="/login"
              className="rounded-full px-4 py-3 text-center text-sm font-medium text-synthora-muted transition hover:bg-synthora-surface hover:text-synthora-text"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/company/register"
              className="rounded-full bg-synthora-blue px-4 py-3 text-center text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,.24)] transition hover:bg-synthora-blue-hover"
              onClick={() => setIsOpen(false)}
            >
              Register Company
            </Link>
          </div>
        </motion.div>
      ) : null}
    </header>
  );
}
