import { ArrowRight, Github, Linkedin, Mail, Twitter } from "lucide-react";
import logo from "../../images/logo.png";

const footerLinks = ["Solutions", "Features", "How It Works", "Pricing", "Resources"];

export default function Footer() {
  return (
    <footer className="bg-white px-5 pb-8 sm:px-8 lg:px-16 xl:px-[140px]">
      <div className="mx-auto max-w-[1440px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.05)] sm:p-8 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <a href="/" className="inline-flex items-center gap-3" aria-label="Synthora.AI home">
              <img src={logo} alt="" className="h-11 w-11" loading="lazy" />
              <span className="text-2xl font-bold text-[#0F172A]">Synthora.AI</span>
            </a>
            <p className="mt-5 max-w-xl text-base font-normal leading-7 text-[#475569]">
              Premium AI recruitment automation for teams that need faster screening, consistent interviews, and
              trustworthy shortlists.
            </p>
          </div>

          <div id="get-started" className="text-left lg:text-right">
            <p className="text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl">Start hiring with AI precision.</p>
            <a
              href="#demo"
              className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#1E293B] px-6 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0F172A]"
            >
              Book a Demo
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-slate-200 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {footerLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm font-semibold text-[#1E293B] transition hover:text-[#0EA5E9]"
              >
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
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-[#475569] transition hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-[#64748B]">
          © 2026 Synthora.AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
