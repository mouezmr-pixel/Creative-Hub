import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeArray(val: unknown): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val.map(cleanTag).filter(Boolean);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String).map(cleanTag).filter(Boolean);
        return [cleanTag(String(parsed))].filter(Boolean);
      } catch {}
    }
    return trimmed.split(",").map((s) => cleanTag(s.trim())).filter(Boolean);
  }
  return [];
}

function cleanTag(s: string): string {
  return s.replace(/^[\s{[\]"'`]+|[\s}\]]+"'`]+$/g, "").trim();
}

export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export function getColorFromName(name: string): string {
  if (!name) return "hsl(200, 30%, 50%)";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 30 + (Math.abs(hash >> 4) % 20);
  const l = 50 + (Math.abs(hash >> 8) % 15);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function getBgFromName(name: string): string {
  if (!name) return "hsl(200, 20%, 90%)";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 20 + (Math.abs(hash >> 4) % 20);
  const l = 88 + (Math.abs(hash >> 8) % 10);
  return `hsl(${h}, ${s}%, ${l}%)`;
}
