import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import logo from "../assets/images/logo.svg";

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
        isScrolled ? "bg-[#5F50B8]/72 shadow-[0_18px_48px_rgba(48,38,112,.16)] backdrop-blur-2xl" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[88px] max-w-[1720px] items-center justify-between px-5 sm:px-8 lg:px-16 xl:px-[140px]">
        <a href="/" className="flex items-center gap-3" aria-label="Synthora.AI home">
          <img src={logo} alt="" className="h-11 w-11" loading="eager" />
          <span className="text-xl font-bold tracking-normal text-white sm:text-2xl">Synthora.AI</span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-white/75 transition hover:text-white xl:text-base"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="#login"
            className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
          >
            Login
          </a>
          <a
            href="#get-started"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#5A22E6] shadow-[0_18px_46px_rgba(255,255,255,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_58px_rgba(255,255,255,.32)]"
          >
            Get Started
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur lg:hidden"
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
          className="mx-5 mb-5 rounded-[28px] border border-white/15 bg-[#5F50B8]/92 p-4 shadow-glass backdrop-blur-2xl lg:hidden"
        >
          <div className="grid gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-base font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href="#login"
              className="rounded-full border border-white/35 px-4 py-3 text-center text-sm font-semibold text-white"
              onClick={() => setIsOpen(false)}
            >
              Login
            </a>
            <a
              href="#get-started"
              className="rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-[#5A22E6]"
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
