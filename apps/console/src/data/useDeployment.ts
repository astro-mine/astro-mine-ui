"use client";

// What this deployment actually mounted (Wave 29; ui#18, ui#9).
//
// **`GET /healthz` names the surfaces**, which is the only thing in the contract that lets a page
// know what a deployment can do *before* it tries. That matters for one acceptance criterion in
// particular — ui#18's *"the control reflects that state before it is clicked rather than erroring
// on click"* — and it is worth being precise about what it can and cannot support.
//
// **What it supports:** a surface that is not mounted cannot serve anything, so a control that
// depends on it can be disabled with a real reason rather than a guess.
//
// **What it does not:** a mounted surface can still refuse. Studio may be mounted and have no
// registry wiring, in which case publishing fails with the backend's own cause. So this is a
// *pre*-check that removes the clearly-impossible case; it is not a promise, and every control that
// uses it still renders the refusal it gets. Anything more would be the front end predicting a
// server's answer, which is exactly the kind of second source of truth the one-contract rule
// exists to prevent.

import { useApiQuery, type ApiQuery } from "./useApiQuery";

/** The surfaces this application knows how to ask for. */
export type Surface = "hub" | "bench" | "studio" | "cloud";

export interface Deployment {
  readonly component: string;
  readonly version: string;
  readonly surfaces: readonly string[];
}

/** Read the deployment's health once. Every page that shows what is configured shares this shape. */
export function useDeployment(): ApiQuery<Deployment> {
  return useApiQuery((client, signal) => client.healthz({ signal }), []);
}

/**
 * Is this surface mounted?
 *
 * `undefined` — not "false" — while the answer is unknown, so a caller can tell "we have not asked"
 * from "we asked and it is not there". A control that treats the first as the second is disabled
 * for a moment on every cold load, which reads as a broken deployment.
 */
export function hasSurface(query: ApiQuery<Deployment>, surface: Surface): boolean | undefined {
  if (query.status !== "ready") return undefined;
  return query.data.surfaces.includes(surface);
}
