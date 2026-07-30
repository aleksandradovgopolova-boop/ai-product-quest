import Link from "next/link";
import { cn } from "@/src/lib/utils";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/journey", label: "Путь" },
  { href: "/codex", label: "Codex" },
  { href: "/artifacts", label: "Артефакты" },
  { href: "/profile", label: "Профиль" },
] as const;

export function AppShell({
  activeRoute,
  children,
  subtitle,
  title = "AI PRODUCT QUEST",
}: {
  activeRoute: string;
  children: React.ReactNode;
  subtitle?: string;
  title?: string;
}) {
  return (
    <main className="platform-shell">
      <div className="flow-field" aria-hidden="true" />
      <div className="flow-noise" aria-hidden="true" />
      <header className="platform-topbar">
        <Link className="platform-brand" href="/">
          {title}
        </Link>
        <span>{subtitle ?? "ЕДИНАЯ ПЛАТФОРМА"}</span>
      </header>
      <section className="platform-viewport">{children}</section>
      <nav className="platform-routes" aria-label="Карта маршрутов">
        {navItems.map((item) => (
          <Link className={cn("platform-route", activeRoute === item.href && "platform-route-active")} href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
