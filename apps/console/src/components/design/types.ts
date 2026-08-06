// The Studio shapes these pages read, named once (ui#15–ui#18).
//
// Aliases of the generated types, never copies — `conventions.md` §3.1 and the workspace gate.

import type { components } from "@astro-mine/api-client";

/** What the reader is composing before the backend turns it into an objective. */
export type IntentDraft = components["schemas"]["IntentDraft"];
export type TargetProduct = components["schemas"]["TargetProduct"];
export type HardConstraint = components["schemas"]["HardConstraint"];
export type PlanetaryCRS = components["schemas"]["PlanetaryCRS"];
export type AssetSelection = components["schemas"]["AssetSelection"];

/** The Core-validated objective the backend answers with, and its content address. */
export type CapturedObjective = components["schemas"]["CapturedObjective"];
export type ObjectiveDocument = components["schemas"]["ObjectiveDocument"];

/** One robot in the catalog, with the capability tags it declares. */
export type MenuEntry = components["schemas"]["MenuEntry"];

/** A candidate swarm, and what a study answers with. */
export type DesignCandidate = components["schemas"]["DesignCandidate"];
export type StudyResponse = components["schemas"]["StudyResponse"];
export type TradeStudy = components["schemas"]["TradeStudy"];

/** The comparison the backend computes — including the front, which the page never derives. */
export type ComparisonView = components["schemas"]["ComparisonView"];
export type ComparisonCandidate = components["schemas"]["ComparisonCandidate"];
export type MetricEstimate = components["schemas"]["MetricEstimate"];

/** Worlds, previews and published campaigns. */
export type WorldEntry = components["schemas"]["WorldEntry"];
export type WorldResponse = components["schemas"]["WorldResponse"];
export type AssetPreviewResponse = components["schemas"]["AssetPreviewResponse"];
export type Campaign = components["schemas"]["Campaign"];
export type CampaignPhase = components["schemas"]["CampaignPhase"];
export type PublishedArtifactRef = components["schemas"]["PublishedArtifactRef"];
