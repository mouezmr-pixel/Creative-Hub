import { useLanguage } from "@/lib/i18n";
import { useListProjects } from "@workspace/api-client-react";
import { AccountStatementSection } from "./AccountStatementSection";
import { ClientPortalTabs } from "./ClientPortalTabs";

export default function AccountStatementPage() {
  const { t } = useLanguage();
  const { data: projects, isLoading } = useListProjects();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <ClientPortalTabs />
        <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ClientPortalTabs />
      <AccountStatementSection projects={projects ?? []} />
    </div>
  );
}
