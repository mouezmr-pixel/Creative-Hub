import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface StudioSettings {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  invoicePrefix: string;
  proformaPrefix: string;
  paymentTerms: string;
  invoiceFooter: string;
  invoiceNotes: string;
  logoUrl: string;
  stampUrl: string;
  showStamp: boolean;
  showSignature: boolean;
}

async function fetchSettings(): Promise<StudioSettings> {
  const res = await fetch(`${BASE}/api/settings`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export function useStudio() {
  const { data, isLoading } = useQuery<StudioSettings>({
    queryKey: ["studio-settings"],
    queryFn: fetchSettings,
    staleTime: 60_000,
  });
  return {
    studioName: data?.name || "Creative Studio",
    studioDescription: data?.description || "",
    studioAddress: data?.address || "",
    studioPhone: data?.phone || "",
    studioEmail: data?.email || "",
    studioWebsite: data?.website || "",
    studioTaxId: data?.taxId || "",
    invoicePrefix: data?.invoicePrefix || "INV-",
    proformaPrefix: data?.proformaPrefix || "PF-",
    paymentTerms: data?.paymentTerms || "",
    invoiceFooter: data?.invoiceFooter || "",
    invoiceNotes: data?.invoiceNotes || "",
    studioLogoUrl: data?.logoUrl || "",
    studioStampUrl: data?.stampUrl || "",
    showStamp: data?.showStamp !== false,
    showSignature: data?.showSignature !== false,
    isLoading,
  };
}
