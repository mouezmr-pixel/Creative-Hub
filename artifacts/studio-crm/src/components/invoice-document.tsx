import React from "react";
import { Camera, FileText, CheckCheck, Receipt as ReceiptIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, CURRENCIES } from "@/lib/currency";

/**
 * Unified, print-safe document renderer for Pro-forma Invoices, Final
 * Invoices, and Payment Receipts.
 *
 * Design notes (read me before touching the print CSS):
 * - All three document types share ONE markup structure and ONE stylesheet.
 *   Only CSS variables change between types (see `.cs-doc--*` below). This
 *   means a future visual tweak only has to happen once.
 * - Colors are NOT driven by Tailwind utility classes for anything that
 *   must survive printing. Browsers strip most `bg-*`/`text-*` utility
 *   backgrounds when printing unless explicitly told not to — that is what
 *   broke the previous redesign attempt. Instead we use real CSS rules with
 *   `print-color-adjust: exact`, which forces backgrounds to print exactly
 *   as authored, with zero per-color override rules to maintain.
 * - The wrapper keeps the original DOM ids (`invoice-print` / `receipt-print`)
 *   so the existing `handlePrint()` clone-to-body mechanism in
 *   project-detail.tsx keeps working unchanged.
 */

export type InvoiceDocType = "proforma" | "final" | "receipt";

export interface InvoiceProjectData {
  id: number;
  title: string;
  clientName?: string | null;
  photographerName?: string | null;
  status: string;
  serviceName?: string | null;
  startDate?: string | null;
  deliveryDate?: string | null;
  expectedCost?: number | string | null;
  finalCost?: number | string | null;
  amountPaid?: number | string | null;
  discount?: number | string | null;
  currency?: string | null;
  proformaIssuedAt?: string | null;
  finalInvoiceIssuedAt?: string | null;
  remainingDebt?: number | string | null;
}

export interface InvoiceStudioData {
  studioName: string;
  studioDescription?: string;
  studioAddress?: string;
  studioPhone?: string;
  studioEmail?: string;
  studioWebsite?: string;
  studioTaxId?: string;
  invoicePrefix: string;
  proformaPrefix: string;
  paymentTerms?: string;
  invoiceFooter?: string;
  invoiceNotes?: string;
  studioLogoUrl?: string;
  studioStampUrl?: string;
  showStamp: boolean;
  showSignature: boolean;
}

interface InvoiceDocumentProps {
  type: InvoiceDocType;
  project: InvoiceProjectData;
  studio: InvoiceStudioData;
  /** translation function from useLanguage() */
  t: (key: string) => string;
}

const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
};

const assetUrl = (path?: string) => {
  if (!path) return "";
  const base = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path}`;
};

export function InvoiceDocument({ type, project, studio, t }: InvoiceDocumentProps) {
  const currency = project.currency ?? "DZD";
  const fmt = (v: number) => formatCurrency(v, currency);

  const finalCost = num(project.finalCost);
  const expectedCost = num(project.expectedCost) || finalCost;
  const amountPaid = num(project.amountPaid);
  const discount = num(project.discount);
  const hasDebt = num(project.remainingDebt) > 0;

  // Inherited from the original logic: the "has debt" pill reflects the
  // project's overall remaining debt, while the amount shown next to it is
  // computed per document type below.
  const baseCost = type === "proforma" ? expectedCost : finalCost;
  const balanceDue = Math.max(0, baseCost - discount - amountPaid);

  const docNumber =
    type === "proforma"
      ? `${studio.proformaPrefix}${String(project.id).padStart(4, "0")}`
      : type === "final"
        ? `${studio.invoicePrefix}${String(project.id).padStart(4, "0")}`
        : `RCT-${String(project.id).padStart(4, "0")}`;

  const issuedAt =
    type === "proforma"
      ? project.proformaIssuedAt
      : type === "final"
        ? project.finalInvoiceIssuedAt
        : null;
  const issuedDate = issuedAt ? new Date(issuedAt) : new Date();

  const domId = type === "receipt" ? "receipt-print" : "invoice-print";

  const badgeIcon =
    type === "proforma" ? <FileText className="cs-doc__badge-icon" /> :
    type === "final" ? <CheckCheck className="cs-doc__badge-icon" /> :
    <ReceiptIcon className="cs-doc__badge-icon" />;

  const badgeLabel =
    type === "proforma" ? t("proFormaBadge") :
    type === "final" ? t("finalInvoiceBadge") :
    t("paymentReceiptBadge");

  const titleLine =
    type === "proforma" ? t("invoiceProFormaTitle") :
    type === "final" ? t("invoiceFinalTitle") :
    t("paymentReceiptTitle");

  const showTermsAndNotes = type !== "receipt" && (studio.paymentTerms || studio.invoiceNotes);

  return (
    <div className={`cs-doc cs-doc--${type}`} id={domId} data-print-root={type === "receipt" ? "receipt" : "invoice"}>
      {type === "proforma" && (
        <div className="cs-doc__watermark" aria-hidden="true">{t("proForma")}</div>
      )}

      <div className="cs-doc__page">
        <div className="cs-doc__accent-bar" />

        {/* Header */}
        <div className="cs-doc__header">
          <div className="cs-doc__brand">
            <div className="cs-doc__logo">
              {studio.studioLogoUrl ? (
                <img src={assetUrl(studio.studioLogoUrl)} alt={studio.studioName} />
              ) : (
                <Camera className="cs-doc__logo-fallback" />
              )}
            </div>
            <div>
              <div className="cs-doc__brand-name">{studio.studioName}</div>
              <div className="cs-doc__brand-tagline">{studio.studioDescription || t("studioTagline")}</div>
            </div>
          </div>
          <div className="cs-doc__meta">
            <div className="cs-doc__badge">{badgeIcon}{badgeLabel}</div>
            <div className="cs-doc__doc-number">{docNumber}</div>
            <div className="cs-doc__doc-date">{t("datePrefix")}{format(issuedDate, "dd MMM yyyy")}</div>
          </div>
        </div>
        <p className="cs-doc__title-line">{titleLine}</p>

        {/* Status pills */}
        <div className="cs-doc__pills">
          <span className={`cs-doc__pill ${hasDebt ? "cs-doc__pill--debt" : "cs-doc__pill--paid"}`}>
            {hasDebt ? t("balanceDue") : t("fullyPaidLabel")}
          </span>
          <span className="cs-doc__pill cs-doc__pill--neutral">
            {CURRENCIES.find((c) => c.value === currency)?.flag} {currency}
          </span>
          {type !== "receipt" && (
            <span className="cs-doc__pill cs-doc__pill--neutral">{t(project.status as any) || project.status}</span>
          )}
        </div>

        {/* Parties */}
        <div className="cs-doc__parties">
          <div className="cs-doc__party">
            <div className="cs-doc__party-label">{t("billedTo")}</div>
            <div className="cs-doc__party-name">{project.clientName ?? t("clientFallback")}</div>
            <div className="cs-doc__party-sub">{t("clientLabel")}</div>
          </div>
          <div className="cs-doc__party">
            <div className="cs-doc__party-label">{t("issuedBy")}</div>
            <div className="cs-doc__party-name">{project.photographerName ?? studio.studioName}</div>
            <div className="cs-doc__party-contact">
              {studio.studioAddress && <div>{studio.studioAddress}</div>}
              {studio.studioPhone && <div>{studio.studioPhone}</div>}
              {studio.studioEmail && <div>{studio.studioEmail}</div>}
              {studio.studioWebsite && <div>{studio.studioWebsite}</div>}
              {studio.studioTaxId && <div className="cs-doc__party-taxid">{t("invoiceTaxId")}: {studio.studioTaxId}</div>}
            </div>
          </div>
        </div>

        {/* Project info bar */}
        <div className="cs-doc__infobar">
          <div>
            <span className="cs-doc__infobar-label">{t("projectLabel")}</span>
            <div className="cs-doc__infobar-value">{project.title}</div>
          </div>
          {project.serviceName && (
            <div>
              <span className="cs-doc__infobar-label">{t("serviceLabel")}</span>
              <div className="cs-doc__infobar-value">{project.serviceName}</div>
            </div>
          )}
          {project.startDate && (
            <div>
              <span className="cs-doc__infobar-label">{t("startDateLabel")}</span>
              <div className="cs-doc__infobar-value">{format(new Date(project.startDate), "dd/MM/yyyy")}</div>
            </div>
          )}
          {project.deliveryDate && (
            <div>
              <span className="cs-doc__infobar-label">{t("deliveryLabel")}</span>
              <div className="cs-doc__infobar-value">{format(new Date(project.deliveryDate), "dd/MM/yyyy")}</div>
            </div>
          )}
        </div>

        {/* Line items table */}
        <table className="cs-doc__table">
          <thead>
            <tr>
              <th>{t("descriptionLabel")}</th>
              <th className="cs-doc__amount-col">{t("amountLabel")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {project.serviceName || t("photographyService")}
                <div className="cs-doc__line-sub">{project.title}</div>
              </td>
              <td className="cs-doc__amount-col">{fmt(baseCost)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="cs-doc__row-muted">
              <td>{t("subtotal")}</td>
              <td className="cs-doc__amount-col">{fmt(baseCost)}</td>
            </tr>
            {discount > 0 && (
              <tr className="cs-doc__row-discount">
                <td>{t("discountOnInvoice")}</td>
                <td className="cs-doc__amount-col">&minus; {fmt(discount)}</td>
              </tr>
            )}
            {(amountPaid > 0 || type === "receipt") && (
              <tr className="cs-doc__row-paid">
                <td>{type === "receipt" ? t("amountReceived") : t("paidDeposit")}</td>
                <td className="cs-doc__amount-col">
                  {type === "receipt" ? fmt(amountPaid) : <>&minus; {fmt(amountPaid)}</>}
                </td>
              </tr>
            )}
            <tr className={`cs-doc__row-grand ${hasDebt ? "cs-doc__row-grand--debt" : "cs-doc__row-grand--paid"}`}>
              <td>{hasDebt ? t("balanceDue") : t("fullyPaidLabel")}</td>
              <td className="cs-doc__amount-col">{fmt(balanceDue)}</td>
            </tr>
          </tfoot>
        </table>

        {type === "proforma" && (
          <div className="cs-doc__notice">
            <Clock className="cs-doc__notice-icon" />
            <p>{t("proFormaDisclaimer")}</p>
          </div>
        )}

        {showTermsAndNotes && (
          <div className="cs-doc__terms">
            {studio.paymentTerms && (
              <div>
                <div className="cs-doc__terms-label">{t("paymentTermsDocLabel")}</div>
                <p>{studio.paymentTerms}</p>
              </div>
            )}
            {studio.invoiceNotes && (
              <div>
                <div className="cs-doc__terms-label">{t("invoiceNotesDocLabel")}</div>
                <p>{studio.invoiceNotes}</p>
              </div>
            )}
          </div>
        )}

        {(studio.showStamp || studio.showSignature) && (
          <div className="cs-doc__signoff">
            {studio.showSignature && (
              <div className="cs-doc__sign-box">
                <div className="cs-doc__sign-line" />
                <p>{t("clientSignature")}</p>
              </div>
            )}
            {studio.showStamp && (
              <div className="cs-doc__sign-box">
                {studio.studioStampUrl ? (
                  <div className="cs-doc__stamp-img">
                    <img src={assetUrl(studio.studioStampUrl)} alt="Stamp" />
                  </div>
                ) : (
                  <div className="cs-doc__sign-line" />
                )}
                <p>{t("studioStamp")}</p>
              </div>
            )}
          </div>
        )}

        <div className="cs-doc__footer">
          <div className="cs-doc__footer-contact">
            {studio.studioPhone && <span>{studio.studioPhone}</span>}
            {studio.studioEmail && <span>{studio.studioEmail}</span>}
            {studio.studioWebsite && <span>{studio.studioWebsite}</span>}
            {studio.studioAddress && <span className="cs-doc__footer-address">{studio.studioAddress}</span>}
          </div>
          <div className="cs-doc__footer-thanks">
            {studio.invoiceFooter || t("thankYou")}
          </div>
        </div>
        <div className="cs-doc__retain">{t("retainDocument")}</div>
      </div>

      <style>{`
        .cs-doc {
          --cs-accent: #b45309;
          --cs-accent-soft: #fffbeb;
          --cs-accent-border: #fde68a;
          --cs-accent-on: #92400e;
          position: relative;
          max-width: 210mm;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 0.75rem;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-adjust: exact;
        }
        .cs-doc--final { --cs-accent: #0f172a; --cs-accent-soft: #f8fafc; --cs-accent-border: #e2e8f0; --cs-accent-on: #0f172a; }
        .cs-doc--receipt { --cs-accent: #1d4ed8; --cs-accent-soft: #eff6ff; --cs-accent-border: #bfdbfe; --cs-accent-on: #1d4ed8; }

        .cs-doc__watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 90px;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: var(--cs-accent-border);
          opacity: 0.35;
          transform: rotate(-30deg);
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          overflow: hidden;
          border-radius: inherit;
        }
        .cs-doc__page { position: relative; padding: 30px 34px; }
        .cs-doc__accent-bar {
          height: 6px;
          margin: -30px -34px 22px;
          border-radius: 0.75rem 0.75rem 0 0;
          background: linear-gradient(to right, var(--cs-accent), var(--cs-accent-on));
        }
        .cs-doc__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .cs-doc__brand { display: flex; align-items: center; gap: 14px; }
        .cs-doc__logo {
          width: 48px; height: 48px; border-radius: 0.75rem; overflow: hidden;
          background: var(--cs-accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cs-doc__logo img { width: 100%; height: 100%; object-fit: contain; }
        .cs-doc__logo-fallback { width: 24px; height: 24px; color: #fff; }
        .cs-doc__brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.1; }
        .cs-doc__brand-tagline { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
        .cs-doc__meta { text-align: right; }
        .cs-doc__badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 0.4rem;
          background: var(--cs-accent-soft); color: var(--cs-accent-on); font-weight: 700; font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .cs-doc__badge-icon { width: 12px; height: 12px; }
        .cs-doc__doc-number { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; margin-top: 6px; line-height: 1.1; }
        .cs-doc__doc-date { font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 4px; }
        .cs-doc__title-line { font-size: 10px; color: #94a3b8; margin: 6px 0 16px; }

        .cs-doc__pills { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
        .cs-doc__pill {
          display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 0.3rem;
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid transparent;
        }
        .cs-doc__pill--debt { background: #fff1f2; color: #be123c; border-color: #fecdd3; }
        .cs-doc__pill--paid { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .cs-doc__pill--neutral { background: #f8fafc; color: #475569; border-color: #e2e8f0; }

        .cs-doc__parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
        .cs-doc__party { border-left: 3px solid var(--cs-accent); padding: 2px 0 2px 14px; }
        .cs-doc__party-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 4px; }
        .cs-doc__party-name { font-size: 14px; font-weight: 700; line-height: 1.25; }
        .cs-doc__party-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .cs-doc__party-contact { margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; font-size: 10.5px; color: #64748b; line-height: 1.5; }
        .cs-doc__party-taxid { font-weight: 600; color: #475569; margin-top: 2px; }

        .cs-doc__infobar {
          background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 0.5rem; padding: 12px 16px; margin-bottom: 18px;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
        }
        .cs-doc__infobar-label { font-size: 10px; color: #94a3b8; }
        .cs-doc__infobar-value { font-size: 12px; font-weight: 600; margin-top: 1px; line-height: 1.3; }

        .cs-doc__table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; margin-bottom: 14px; font-size: 12px; }
        .cs-doc__table thead th {
          background: var(--cs-accent-on); color: #fff; text-align: left; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em; padding: 9px 14px;
        }
        .cs-doc__amount-col { text-align: right !important; }
        .cs-doc__table tbody td { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 500; }
        .cs-doc__line-sub { font-size: 10.5px; color: #94a3b8; margin-top: 2px; font-weight: 400; }
        .cs-doc__table tfoot td { padding: 8px 14px; font-size: 11px; }
        .cs-doc__row-muted td { color: #94a3b8; }
        .cs-doc__row-discount td { background: #fffbeb; color: #b45309; font-weight: 600; }
        .cs-doc__row-paid td { background: #ecfdf5; color: #047857; font-weight: 600; }
        .cs-doc__row-grand td { padding: 13px 14px; font-size: 15px; font-weight: 800; border-top: 2px solid #e2e8f0; }
        .cs-doc__row-grand--debt td { background: #fff1f2; color: #be123c; }
        .cs-doc__row-grand--paid td { background: #ecfdf5; color: #047857; }

        .cs-doc__notice {
          display: flex; align-items: flex-start; gap: 8px; background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 0.4rem; padding: 9px 12px; margin-bottom: 14px;
        }
        .cs-doc__notice-icon { width: 14px; height: 14px; color: #b45309; flex-shrink: 0; margin-top: 1px; }
        .cs-doc__notice p { font-size: 10.5px; font-weight: 600; color: #92400e; margin: 0; line-height: 1.4; }

        .cs-doc__terms { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; padding-top: 14px; border-top: 1px solid #f1f5f9; }
        .cs-doc__terms-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px; }
        .cs-doc__terms p { font-size: 11px; color: #475569; line-height: 1.5; margin: 0; white-space: pre-wrap; }

        .cs-doc__signoff { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 18px 0 4px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .cs-doc__sign-box { text-align: center; }
        .cs-doc__sign-line { height: 46px; border-bottom: 1px solid #e2e8f0; margin-bottom: 6px; }
        .cs-doc__stamp-img { height: 46px; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
        .cs-doc__stamp-img img { max-height: 46px; object-fit: contain; opacity: 0.85; }
        .cs-doc__sign-box p { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; margin: 0; }

        .cs-doc__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; padding-top: 10px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; }
        .cs-doc__footer-contact { display: flex; align-items: center; gap: 10px; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; flex-wrap: wrap; }
        .cs-doc__footer-contact span + span { border-left: 1px solid #e2e8f0; padding-left: 10px; }
        .cs-doc__footer-address { text-transform: none !important; letter-spacing: normal !important; }
        .cs-doc__footer-thanks { font-size: 9px; color: #cbd5e1; }
        .cs-doc__retain { font-size: 8.5px; color: #cbd5e1; text-align: center; margin-top: 10px; }

        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { background: #fff !important; }
          body > *:not(#print-root) { display: none !important; }
          #print-root {
            display: block !important;
            position: static !important;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-root .cs-doc { box-shadow: none !important; border-radius: 0 !important; max-width: 100%; }
          #print-root .cs-doc__accent-bar { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

export default InvoiceDocument;
