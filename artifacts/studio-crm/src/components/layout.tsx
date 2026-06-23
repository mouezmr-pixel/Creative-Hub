import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useStudio } from "@/lib/use-studio";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Camera,
  Settings,
  LogOut,
  Menu,
  Globe,
  ChevronLeft,
  ChevronRight,
  Layers,
  TrendingUp,
  Calculator,
  Workflow,
  UserCog,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { studioName } = useStudio();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await logout();
  };

  const canSeeLeads = user.role === "admin" || !!(user as any).canViewLeads;
  const canSeeAccounting = user.role === "admin" || !!(user as any).canViewAccounting;

  const roleLabel = user.role === "admin" ? t("roleAdmin") : user.role === "photographer" ? t("rolePhotographer") : t("roleClient");

  const navItems = [
    { label: t("dashboard"), icon: LayoutDashboard, href: "/dashboard", roles: ["admin", "photographer"], show: true },
    { label: t("clientPortal"), icon: LayoutDashboard, href: "/client-portal", roles: ["client"], show: true },
    { label: t("clients"), icon: Users, href: "/clients", roles: ["admin", "photographer"], show: true },
    { label: t("projects"), icon: Briefcase, href: "/projects", roles: ["admin", "photographer"], show: true },
    { label: t("services"), icon: Layers, href: "/services", roles: ["admin", "photographer"], show: true },
    { label: t("leads"), icon: TrendingUp, href: "/leads", roles: ["admin", "photographer"], show: canSeeLeads },
    { label: t("accounting"), icon: Calculator, href: "/accounting", roles: ["admin", "photographer"], show: canSeeAccounting },
    { label: t("photographers"), icon: Camera, href: "/photographers", roles: ["admin"], show: true },
    { label: t("workflows"), icon: Workflow, href: "/workflow-templates", roles: ["admin"], show: true },
    { label: t("clientAccounts"), icon: UserCog, href: "/client-accounts", roles: ["admin"], show: true },
    { label: t("settings"), icon: Settings, href: "/settings", roles: ["admin"], show: true },
  ];

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role) && item.show);

  const NavItem = ({ item, isCollapsed }: { item: typeof navItems[0]; isCollapsed: boolean }) => {
    const isActive = location.startsWith(item.href);
    const content = (
      <Link href={item.href}>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
            isActive
              ? "bg-primary text-white shadow-sm shadow-primary/25"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700")} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </button>
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center h-14 px-4 border-b border-border flex-shrink-0", isCollapsed ? "justify-center" : "justify-between")}>
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Camera className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{studioName}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">{roleLabel}</div>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute right-0 translate-x-full top-4 z-10 w-5 h-8 bg-white dark:bg-slate-800 border border-border border-l-0 rounded-r-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 py-4 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
        <div className="space-y-1">
          {filteredNavItems.map((item) => (
            <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className={cn("border-t border-border py-3 flex-shrink-0", isCollapsed ? "px-2" : "px-3")}>
        {!isCollapsed && (
          <div className="px-3 py-2 mb-1 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{user.name}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{roleLabel}</div>
            </div>
          </div>
        )}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("signOut")}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{t("logout")}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "relative hidden md:flex flex-col bg-white border-r border-border flex-shrink-0 transition-all duration-200",
          collapsed ? "w-[64px]" : "w-[220px]"
        )}
      >
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden w-9 h-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-slate-900">
                <SidebarContent isCollapsed={false} />
              </SheetContent>
            </Sheet>
            {/* Mobile brand */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{studioName}</span>
            </div>
          </div>

          {/* Theme + Language switcher */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-lg h-8 w-8 border-border bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={toggleTheme} title={theme === "dark" ? t("themeLight") : t("themeDark")}>
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" /> : <Moon className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
            </Button>

            {/* Language switcher */}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-lg h-8 text-xs font-semibold border-border bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
                <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="uppercase text-slate-600 dark:text-slate-400">{language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setLanguage("en")} className="rounded-lg text-sm font-medium">
                🇬🇧 {t("langEn")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("fr")} className="rounded-lg text-sm font-medium">
                🇫🇷 {t("langFr")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("ar")} className="rounded-lg text-sm font-medium">
                🇸🇦 {t("langAr")}
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-5 md:p-8 bg-[#FAFAFA] dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
