import { Link, NavLink, useNavigate } from "react-router-dom";
import { BarChart3, BriefcaseBusiness, Building2, ClipboardList, LogOut, PanelLeft, Trophy, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import ThemeToggle from "../components/ThemeToggle";
import logo from "../../images/logo.png";

const sidebarItems = [
  { label: "Dashboard", to: "/company/dashboard", icon: BarChart3 },
  { label: "Create Hiring Drive", to: "/company/create-drive", icon: BriefcaseBusiness },
  { label: "Previous Drives", to: "/company/dashboard", icon: ClipboardList },
  { label: "Results", to: "/company/dashboard", icon: Trophy },
  { label: "Profile", to: "/company/dashboard", icon: UserRound },
];

type DashboardLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function DashboardLayout({ title, subtitle, children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    window.localStorage.removeItem("synthora-token");
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-synthora-radial font-inter text-synthora-text">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(0,163,255,.14),transparent_30%),radial-gradient(circle_at_84%_4%,rgba(6,182,212,.12),transparent_26%)]" />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-synthora-border bg-white/90 px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur-2xl transition lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link to="/" className="mb-8 flex items-center gap-3 px-2">
          <img src={logo} alt="" className="h-10 w-10" />
          <span className="text-xl font-extrabold text-synthora-text">Synthora.AI</span>
        </Link>

        <nav className="grid gap-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-synthora-blue text-white shadow-[0_14px_30px_rgba(37,99,235,.24)]"
                      : "text-synthora-muted hover:bg-blue-50 hover:text-synthora-blue"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-4 right-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-50"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {isOpen ? <button type="button" aria-label="Close sidebar" className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)} /> : null}

      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-synthora-border bg-white/80 px-5 py-4 shadow-[0_12px_35px_rgba(15,23,42,.04)] backdrop-blur-2xl sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-synthora-border bg-white text-synthora-text shadow-sm transition hover:border-synthora-cyan hover:text-synthora-blue lg:hidden"
                aria-label="Open sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-synthora-cyan">
                  <Building2 className="h-4 w-4" />
                  Company Workspace
                </p>
                <h1 className="truncate text-2xl font-extrabold text-synthora-text">{title}</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-synthora-muted">{subtitle}</p>
        </header>

        <div className="p-5 sm:p-8">{children}</div>
      </section>
    </main>
  );
}
