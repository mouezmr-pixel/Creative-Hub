import React from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Gift, Clock, CheckCircle2, XCircle, DollarSign } from "lucide-react";

interface CelebrityOffer {
  id: number;
  title: string;
  description: string | null;
  budget: number | null;
  status: string;
  scenario: string | null;
  script: string | null;
  idea: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchOffers(): Promise<CelebrityOffer[]> {
  const res = await fetch(`${BASE}/api/celebrity-portal/offers`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch offers");
  return res.json();
}

export default function OffersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: offers = [], isLoading } = useQuery<CelebrityOffer[]>({
    queryKey: ["celebrity-portal-offers"],
    queryFn: fetchOffers,
    enabled: user?.role === "celebrity",
  });

  const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-amber-500" />,
    approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    rejected: <XCircle className="h-4 w-4 text-red-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
  };

  const statusColor: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
  };

  if (user?.role !== "celebrity") {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        {t("accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t("yourOffers")}
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {t("offersDescription")}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">{t("loading")}</div>
      ) : offers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
          <Gift className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>{t("noOffersFound")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {offers.map((offer) => (
            <Card key={offer.id} className="border-border bg-white dark:bg-slate-900 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{offer.title}</h3>
                  <Badge className={statusColor[offer.status] || "bg-slate-50 text-slate-700"}>
                    <span className="flex items-center gap-1">
                      {statusIcon[offer.status]}
                      {t(`offerStatus_${offer.status}` as any)}
                    </span>
                  </Badge>
                </div>

                {offer.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{offer.description}</p>
                )}

                {offer.budget != null && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span dir="ltr">{Number(offer.budget).toLocaleString()} DZD</span>
                  </div>
                )}

                {(offer.scenario || offer.script || offer.idea) && (
                  <div className="pt-2 border-t border-border space-y-2">
                    {offer.scenario && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("scenario")}</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{offer.scenario}</p>
                      </div>
                    )}
                    {offer.script && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("script")}</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{offer.script}</p>
                      </div>
                    )}
                    {offer.idea && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("idea")}</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{offer.idea}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
