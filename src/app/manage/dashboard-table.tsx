"use client";

import Link from "next/link";
import { useState } from "react";
import { VideoStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { Sparkline } from "@/components/charts/sparkline";

export interface DashboardRow {
  id: string;
  title: string;
  status: VideoStatus;
  views: number;
  sparkline: number[];
}

type SortKey = "title" | "views";

export function DashboardTable({ rows }: { rows: DashboardRow[] }) {
  const [sort, setSort] = useState<SortKey>("views");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = [...rows].sort((a, b) => {
    const m = dir === "asc" ? 1 : -1;
    if (sort === "title") return a.title.localeCompare(b.title) * m;
    return (a.views - b.views) * m;
  });

  function toggle(key: SortKey) {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(key === "title" ? "asc" : "desc");
    }
  }

  const arrow = (key: SortKey) => (sort === key ? (dir === "asc" ? " ↑" : " ↓") : "");

  if (rows.length === 0) {
    return <p className="text-sm text-fg-lo">Nenhum vídeo ainda.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-fg-lo">
            <th className="py-2 pr-4 font-medium">
              <button type="button" onClick={() => toggle("title")} className="hover:text-fg-hi">
                Vídeo{arrow("title")}
              </button>
            </th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 text-right font-medium">
              <button type="button" onClick={() => toggle("views")} className="hover:text-fg-hi">
                Views{arrow("views")}
              </button>
            </th>
            <th className="py-2 font-medium">Tendência</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => (
            <tr key={v.id} className="border-b border-[var(--border)]/60">
              <td className="py-2 pr-4">
                <Link href={`/manage/videos/${v.id}`} className="font-medium hover:text-brand">
                  {v.title}
                </Link>
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={v.status} />
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{v.views}</td>
              <td className="py-2">
                <Sparkline values={v.sparkline} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
