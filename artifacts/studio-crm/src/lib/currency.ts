import { useState, useEffect } from "react";

export type Currency = "USD" | "EUR" | "DZD";

export const CURRENCIES: { value: Currency; label: string; symbol: string; flag: string }[] = [
  { value: "DZD", label: "Algerian Dinar", symbol: "DA", flag: "🇩🇿" },
  { value: "USD", label: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { value: "EUR", label: "Euro", symbol: "€", flag: "🇪🇺" },
];

export function formatCurrency(amount: number, currency: Currency | string = "DZD"): string {
  const cur = (currency || getDefaultCurrency()) as Currency;
  if (cur === "DZD") {
    return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " DA";
  }
  if (cur === "EUR") {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function getCurrencySymbol(currency: Currency | string = "DZD"): string {
  return CURRENCIES.find((c) => c.value === currency)?.symbol ?? "DA";
}

const STORAGE_KEY = "studio_crm_display_currency";

export function getDefaultCurrency(): Currency {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["USD", "EUR", "DZD"].includes(stored)) return stored as Currency;
  } catch {}
  return "DZD";
}

export function useDisplayCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(() => getDefaultCurrency());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && ["USD", "EUR", "DZD"].includes(e.newValue)) {
        setCurrencyState(e.newValue as Currency);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch {}
  };

  return { currency, setCurrency };
}
