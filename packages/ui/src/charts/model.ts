// The vocabulary every chart in this package speaks (ui#4; ui.md §7.1, honesty rule 2).
//
// One file, because the rule that matters is a rule about a *shape*: a quantity is a value and,
// separately, whether anyone measured its spread. Every chart takes that shape, and every chart
// decides what to draw from {@link boundState} rather than from its own `== null` test — one place
// to read, one place to be wrong, one place asserted by test.

/**
 * What is known about a quantity's uncertainty. Two states, and the whole discipline is that they
 * are never collapsed:
 *
 * - `measured` — a bound was measured. It may be `0`: a quantity that did not vary across seeds is
 *   a result, and it draws a real (zero-length) interval, because that is what was found.
 * - `open` — **no bound was measured.** It draws an open mark: a line that leaves at both ends and
 *   terminates in nothing. Never a zero-length tick, which asserts a precision nobody measured.
 *
 * The distinction is the same one `UncertaintyValue` renders for a single number, and charts publish
 * it through the same `data-uncertainty-bound` attribute, so a page asserts one property either way.
 */
export type BoundState = "open" | "measured";

/**
 * Read a bound's state.
 *
 * `null` and `undefined` are the same answer — nobody measured — and `0` is emphatically not. The
 * `== null` this wraps is three characters; giving it a name is what stops the next chart from
 * writing `!bound`, which is the same three characters and silently wrong for zero.
 */
export function boundState(bound: number | null | undefined): BoundState {
  return bound === null || bound === undefined ? "open" : "measured";
}

/** A measured quantity: a value, and the ± half-width of its interval if one was measured. */
export interface Measured {
  /** The measured value. Rendered at full strength whether or not a bound is known. */
  readonly value: number;
  /**
   * The ± bound, typically a cross-seed spread. `null`/`undefined` means **no bound was measured**;
   * `0` means a bound of zero was measured.
   */
  readonly bound?: number | null;
}

/** One categorical bar: a labelled measurement. */
export interface BarDatum extends Measured {
  /** The category. Also the bar's identity, so it must be unique within the chart. */
  readonly label: string;
}

/**
 * One point of a trade-off scatter — a candidate design scored on two metrics.
 *
 * Both axes carry their own uncertainty, because they are different measurements: a candidate can
 * have a well-characterised mass and an unbounded yield, and drawing the second as if it were the
 * first is the failure this whole layer exists to prevent.
 */
export interface ScatterPoint {
  /** Stable identity — what selection reports and what a page uses to look the point up. */
  readonly id: string;
  /** What to call this point in the accessible description and the tooltip. */
  readonly label: string;
  readonly x: Measured;
  readonly y: Measured;
  /**
   * Whether the point is on the Pareto front.
   *
   * Rendered as a **shape** as well as a colour: "identity never rests on colour alone" is not
   * satisfied by two hues that a dichromat reads as one (ui.md §7 rule 7).
   */
  readonly onFront: boolean;
}

/** One axis of a parallel-coordinates plot: an independently scaled metric. */
export interface ParallelAxis {
  /** The key this axis reads out of each row's `values`. */
  readonly key: string;
  /** The axis label. */
  readonly label: string;
  /**
   * The unit, **required, and `null` written out** for a genuinely dimensionless quantity. Each
   * axis carries its own — that is what parallel coordinates are for, and it is not a second y-axis:
   * no two axes share a scale, so no reader can be induced to compare across them (ui.md §7.1).
   */
  readonly unit: string | null;
}

/** One polyline: a candidate's value on every axis. */
export interface ParallelRow {
  readonly id: string;
  readonly label: string;
  readonly onFront: boolean;
  /**
   * Values by axis key.
   *
   * `number | undefined` rather than `number`, because a candidate genuinely may not have scored a
   * metric and the type should say so — a `Record<string, number>` would let a caller index any key
   * and be handed a `number` that is not there. A row missing any axis is **excluded** by the chart
   * rather than imputed: a missing score is not a zero score, and threading a polyline through an
   * invented value draws a design that was never evaluated.
   */
  readonly values: Readonly<Record<string, number | undefined>>;
}
