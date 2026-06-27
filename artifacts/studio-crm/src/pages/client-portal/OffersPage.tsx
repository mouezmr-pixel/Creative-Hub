import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useListProjects, useListClientCampaigns } from "@workspace/api-client-react";
import { FileText } from "lucide-react";
import { CampaignView } from "./CampaignView";
import { ProjectProposals } from "./ProjectProposals";
import { ClientPortalTabs } from "./ClientPortalTabs";

export default function OffersPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const { data: clientCampaigns = [] } = useListClientCampaigns();

  if (projectsLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <ClientPortalTabs />
        <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  const sharedCampaigns = (clientCampaigns as any[]).filter((c: any) => c.shared);
  const hasCampaigns = sharedCampaigns.length > 0;
  const hasProjectProposals = (user as any)?.canViewProposal !== false && (projects ?? []).some((p: any) => p.finalProposedIdea);
  const hasProposals = hasCampaigns || hasProjectProposals;

  if (!hasProposals) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <ClientPortalTabs />
        <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
          {t("noActiveProjects")}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ClientPortalTabs />
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t("yourProposals")}</h2>
        </div>
        {hasCampaigns && (
          <div className="space-y-6">
            {sharedCampaigns.map((campaign) => (
              <CampaignView key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
        <ProjectProposals projects={projects ?? []} />
      </section>
    </div>
  );
}
