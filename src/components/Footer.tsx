import { ArrowRight, Github, Linkedin, Mail, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../images/logo.png";

const footerLinks = ["Solutions", "Features", "How It Works", "Pricing", "Resources"];

export default function Footer() {
  return (
    <footer className="bg-transparent px-5 pb-8 sm:px-8 lg:px-16 xl:px-[140px]">
      <div className="mx-auto max-w-[1440px] rounded-xl border border-synthora-border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.05)] sm:p-8 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <a href="/" className="inline-flex items-center gap-3" aria-label="Synthora.AI home">
              <img src={logo} alt="" className="h-11 w-11" loading="lazy" />
              <span className="text-2xl font-bold text-synthora-text">Synthora.AI</span>
            </a>
            <p className="mt-5 max-w-xl text-base font-normal leading-7 text-synthora-muted">
              Premium AI recruitment automation for teams that need faster screening, consistent interviews, and
              trustworthy shortlists.
            </p>
          </div>

          <div id="get-started" className="text-left lg:text-right">
            <p className="text-2xl font-black leading-tight text-synthora-text sm:text-3xl">Start hiring with AI precision.</p>
            <Link
              to="/assessment-demo"
              className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-synthora-blue px-6 text-base font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-synthora-blue-hover"
            >
              Book a Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-synthora-border pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {footerLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm font-semibold text-synthora-text transition hover:text-synthora-cyan"
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
                className="grid h-10 w-10 place-items-center rounded-full border border-synthora-border bg-white text-synthora-muted transition hover:border-synthora-cyan hover:text-synthora-cyan"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 rounded-xl bg-synthora-surface px-4 py-3 text-sm text-synthora-muted">
          © 2026 Synthora.AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
