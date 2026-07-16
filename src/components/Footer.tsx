import { ArrowRight, Github, Linkedin, Mail, Twitter } from "lucide-react";
import logo from "../assets/images/logo.svg";

const footerLinks = ["Solutions", "Features", "How It Works", "Pricing", "Resources"];

export default function Footer() {
  return (
    <footer className="px-5 pb-8 sm:px-8 lg:px-16 xl:px-[140px]">
      <div className="mx-auto max-w-[1440px] rounded-[32px] border border-white/15 bg-white/[.08] p-6 shadow-glass backdrop-blur-2xl sm:p-8 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <a href="/" className="inline-flex items-center gap-3" aria-label="Synthora.AI home">
              <img src={logo} alt="" className="h-11 w-11" loading="lazy" />
              <span className="text-2xl font-bold text-white">Synthora.AI</span>
            </a>
            <p className="mt-5 max-w-xl text-base font-light leading-7 text-white/70">
              Premium AI recruitment automation for teams that need faster screening, consistent interviews, and
              trustworthy shortlists.
            </p>
          </div>

          <div id="get-started" className="rounded-[26px] border border-white/15 bg-white/[.08] p-5">
            <p className="text-2xl font-black leading-tight text-white">Start hiring with AI precision.</p>
            <a
              href="#demo"
              className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-semibold text-[#5A22E6] transition hover:-translate-y-0.5"
            >
              Book a Demo
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {footerLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm font-medium text-white/65 hover:text-white">
                {link}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {[Mail, Linkedin, Twitter, Github].map((Icon, index) => (
              <a
                key={index}
                href="#resources"
                aria-label="Synthora.AI social link"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[.08] text-white/70 transition hover:bg-white hover:text-[#5A22E6]"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 text-sm text-white/45">© 2026 Synthora.AI. All rights reserved.</p>
      </div>
    </footer>
  );
}
