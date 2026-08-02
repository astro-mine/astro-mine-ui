/**
 * The **channel model** (view.md §3): the uniform, time-indexed abstraction every widget reads from.
 *
 * A channel is `(id, schema, samples[t])`, and it is fed identically by an MCAP replay today or a
 * live stream in Phase 2 — "one viewer, two clocks" (view.md §2 principle 2). Only the *source*
 * behind the channel differs; nothing downstream of here knows which it was.
 *
 * **An unknown channel renders generically rather than failing** (view.md §3, extension points). A
 * recording that grows a `/guard/verdicts` or `/mind/decisions` channel before View has a decoder
 * for it must still open, still scrub, and still draw its rovers — it simply reports the channel as
 * one it cannot interpret. That is a different thing from a *known* channel whose messages do not
 * match their schema, which `frames.ts` rejects loudly.
 */

import { SIM_FRAME_SCHEMA, SIM_FRAMES_TOPIC } from "./frames";

/** A channel declared in a recording's summary, and whether View can interpret it. */
export interface ReplayChannel {
  readonly id: number;
  readonly topic: string;
  /** The registered schema name, e.g. `astro_mine.sim.Frame`. Empty when a channel declares none. */
  readonly schemaName: string;
  /** The schema's own encoding — `jsonschema` for Sim's frames. */
  readonly schemaEncoding: string;
  /** The message encoding — `json` for Sim's frames. */
  readonly messageEncoding: string;
  /** Whether View has a decoder bound to this `(topic, schema)` pair. */
  readonly known: boolean;
}

/** Whether View has a decoder for a channel, keyed on the pair the producer registered. */
export function isKnownChannel(topic: string, schemaName: string): boolean {
  return topic === SIM_FRAMES_TOPIC && schemaName === SIM_FRAME_SCHEMA;
}

/**
 * A one-line account of what a recording contains, for a status chip.
 *
 * Naming the channels it *cannot* read is the point: silence would be indistinguishable from a
 * recording that carried nothing else.
 */
export function describeChannels(channels: readonly ReplayChannel[]): string {
  const unknown = channels.filter((channel) => !channel.known);
  if (channels.length === 0) return "recording declares no channels";

  const known = channels.length - unknown.length;
  if (unknown.length === 0) return `${known} channel${known === 1 ? "" : "s"}`;

  const topics = unknown.map((channel) => channel.topic).join(", ");
  return (
    `${known} of ${channels.length} channels rendered; ` +
    `${unknown.length} not interpreted (${topics})`
  );
}
