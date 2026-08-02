import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requireEntry } from "@/shell/navigation";

const ENTRY = requireEntry("/bench/leaderboard");

const IDENTITY = ["scenario"] as const;

export const metadata: Metadata = { title: ENTRY.label };

export default function LeaderboardPage() {
  return (
    <PagePlaceholder title={ENTRY.label} summary={ENTRY.summary} issue={12} identity={IDENTITY} />
  );
}
