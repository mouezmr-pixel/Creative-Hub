import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useListProjects, useListClientCampaigns } from "@workspace/api-client-react";
import { FileText, Briefcase, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "offers", labelKey: "yourProposals", href: "/client-portal/offers", icon: FileText },
  { key: "projects", labelKey: "yourProjects", href: "/client-portal/projects", icon: Briefcase },
  { key: "account-statement", labelKey: "accountStatement", href: "/client-portal/account-statement", icon: Wallet },
] as const;

export function ClientPortalTabs() {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [location] = useLocation();
  const { data: projects } = useListProjects();
  const { data: clientCampaigns = [] } = useListClientCampaigns();

  const sharedCampaigns = (clientCampaigns as any[]).filter((c: any) => c.shared);
  const hasCampaigns = sharedCampaigns.length > 0;
  const hasProjectProposals = (user as any)?.canViewProposal !== false && (projects ?? []).some((p: any) => p.finalProposedIdea);
  const hasProposals = hasCampaigns || hasProjectProposals;

  const visibleTabs = tabs.filter((t) => t.key !== "offers" || hasProposals);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight uppercase">
          {t("clientPortal")}
        </h1>
        <p className="text-muted-foreground">
          {t("welcome")}, {user?.name}. {t("hereIsYourProjects")}
        </p>
      </div>

      <div className="flex gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border w-fit" role="tablist">
        {visibleTabs.map((tab) => {
          const isActive = location === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap",
                isActive
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
              role="tab"
              aria-selected={isActive}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {t(tab.labelKey as any)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
