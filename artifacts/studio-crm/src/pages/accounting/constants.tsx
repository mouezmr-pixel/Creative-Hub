export const EXPENSE_CATEGORIES = [
  "Equipment", "Software", "Marketing", "Transport",
  "Studio Rent", "Utilities", "Staff", "creative_payout", "Other",
];

export const CATEGORY_COLORS: Record<string, string> = {
  Equipment: "bg-blue-50 text-blue-700 border-blue-200",
  Software: "bg-violet-50 text-violet-700 border-violet-200",
  Marketing: "bg-amber-50 text-amber-700 border-amber-200",
  Transport: "bg-orange-50 text-orange-700 border-orange-200",
  "Studio Rent": "bg-pink-50 text-pink-700 border-pink-200",
  Utilities: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Staff: "bg-indigo-50 text-indigo-700 border-indigo-200",
  creative_payout: "bg-rose-50 text-rose-700 border-rose-200",
  Other: "bg-slate-50 text-slate-600 border-slate-200",
};

export const PIE_COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#0891b2", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

import React from "react";
import { Sector } from "recharts";

export function ActiveShape(props: any) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent,
  } = props;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="currentColor" className="text-sm font-bold text-slate-900 dark:text-slate-100" fontSize={13} fontWeight={700}>
        {payload.serviceName.length > 16 ? payload.serviceName.substring(0, 14) + "…" : payload.serviceName}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="currentColor" className="text-violet-600 dark:text-violet-400" fontSize={15} fontWeight={800}>
        {(percent * 100).toFixed(0)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}
