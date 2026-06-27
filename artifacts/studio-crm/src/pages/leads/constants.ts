import { Instagram, Users, MessageCircle, Globe, Zap } from "lucide-react";

export const SOURCES = [
  { value: "instagram", labelKey: "sourceInstagram" as const, icon: Instagram },
  { value: "referral", labelKey: "sourceReferral" as const, icon: Users },
  { value: "whatsapp", labelKey: "sourceWhatsApp" as const, icon: MessageCircle },
  { value: "website", labelKey: "sourceWebsite" as const, icon: Globe },
  { value: "other", labelKey: "sourceOther" as const, icon: Zap },
];

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-violet-50 text-violet-700 border-violet-200" },
  proposal_sent: { label: "Proposal Sent", color: "bg-amber-50 text-amber-700 border-amber-200" },
  negotiating: { label: "Negotiating", color: "bg-orange-50 text-orange-700 border-orange-200" },
  won: { label: "Won ✓", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost: { label: "Lost", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export const DEFAULT_LOST_REASONS = [
  "ليس عميلنا المثالي",
  "السعر مرتفع جداً",
  "لا رد",
  "اختار منافساً آخر",
  "التوقيت غير مناسب",
  "أخرى",
];

export function formatCurrency(n: number | null | undefined) {
  if (!n) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
