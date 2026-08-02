import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TimelineProvider } from "./TimelineProvider";
import { TimelineScrubber } from "./TimelineScrubber";
import { useTimeline } from "./context";

function Readout() {
  const { clock } = useTimeline();
  return <span data-testid="t">{clock.tS.toFixed(3)}</span>;
}

function Rate() {
  const { clock } = useTimeline();
  return <span data-testid="rate">{clock.rate}</span>;
}

function mount(window: { startS: number; endS: number } | null, epoch = null, rate?: number) {
  return render(
    <TimelineProvider window={window} rate={rate}>
      <TimelineScrubber epoch={epoch} />
      <Readout />
      <Rate />
    </TimelineProvider>,
  );
}

describe("<TimelineScrubber>", () => {
  it("starts paused at the beginning of the recording", () => {
    mount({ startS: 0, endS: 720 });
    expect(screen.getByTestId("timeline-scrubber")).toHaveAttribute("data-playing", "false");
    expect(screen.getByTestId("t")).toHaveTextContent("0.000");
    expect(screen.getByTestId("timeline-toggle")).toHaveTextContent("Play");
  });

  it("scrubs the shared clock, and every subscriber sees the same instant", () => {
    mount({ startS: 100, endS: 1100 });
    const range = screen.getByTestId("timeline-range");

    // The scrubber works in 1000 steps over the window, so step 250 is a quarter of the way in.
    fireEvent.change(range, { target: { value: "250" } });
    expect(screen.getByTestId("t")).toHaveTextContent("350.000");
    expect(screen.getByTestId("timeline-scrubber")).toHaveAttribute("data-time-s", "350");

    fireEvent.change(range, { target: { value: "1000" } });
    expect(screen.getByTestId("t")).toHaveTextContent("1100.000");
  });

  it("scrubbing does not start or stop playback", async () => {
    mount({ startS: 0, endS: 1000 });
    await userEvent.click(screen.getByTestId("timeline-toggle"));
    fireEvent.change(screen.getByTestId("timeline-range"), { target: { value: "500" } });
    expect(screen.getByTestId("timeline-scrubber")).toHaveAttribute("data-playing", "true");
  });

  it("toggles play/pause", async () => {
    mount({ startS: 0, endS: 720 });
    const toggle = screen.getByTestId("timeline-toggle");

    await userEvent.click(toggle);
    expect(screen.getByTestId("timeline-scrubber")).toHaveAttribute("data-playing", "true");
    expect(toggle).toHaveTextContent("Pause");

    await userEvent.click(toggle);
    expect(screen.getByTestId("timeline-scrubber")).toHaveAttribute("data-playing", "false");
  });

  it("is inert over an unresolved recording, rather than pretending to have a timeline", () => {
    mount(null);
    expect(screen.getByTestId("timeline-toggle")).toBeDisabled();
    expect(screen.getByTestId("timeline-range")).toBeDisabled();
  });

  it("re-speeds the clock when the rate prop changes, without rewinding it", () => {
    const { rerender } = mount({ startS: 0, endS: 1000 }, null, 1);
    fireEvent.change(screen.getByTestId("timeline-range"), { target: { value: "300" } });
    expect(screen.getByTestId("t")).toHaveTextContent("300.000");

    // A host wiring `rate` to a speed control must not send the operator back to t = 0.
    rerender(
      <TimelineProvider window={{ startS: 0, endS: 1000 }} rate={4}>
        <TimelineScrubber epoch={null} />
        <Readout />
        <Rate />
      </TimelineProvider>,
    );
    expect(screen.getByTestId("rate")).toHaveTextContent("4");
    expect(screen.getByTestId("t")).toHaveTextContent("300.000");
  });

  it("rebuilds the clock when the recording changes — t = 12 s means nothing in a new episode", () => {
    const { rerender } = mount({ startS: 0, endS: 1000 });
    fireEvent.change(screen.getByTestId("timeline-range"), { target: { value: "300" } });
    expect(screen.getByTestId("t")).toHaveTextContent("300.000");

    rerender(
      <TimelineProvider window={{ startS: 0, endS: 500 }}>
        <TimelineScrubber epoch={null} />
        <Readout />
        <Rate />
      </TimelineProvider>,
    );
    expect(screen.getByTestId("t")).toHaveTextContent("0.000");
  });

  it("refuses to invent a clock outside a provider", () => {
    // React logs the thrown error; the assertion is that it throws rather than defaulting to t = 0.
    expect(() => render(<Readout />)).toThrow(/must be used inside a <TimelineProvider>/);
  });

  describe("the readout", () => {
    it("labels an epoch TDB, and never renders a UTC 'Z'", () => {
      mount({ startS: 0, endS: 720 }, { tdb_seconds: 8e8, scale: "tdb" } as never);
      const readout = screen.getByTestId("timeline-readout");
      expect(readout).toHaveTextContent(/TDB$/);
      expect(readout.textContent).not.toMatch(/Z/);
    });

    it("falls back to simulated seconds, and says that is what they are", () => {
      mount({ startS: 0, endS: 720 });
      expect(screen.getByTestId("timeline-readout")).toHaveTextContent("t = 0.0 s (simulated)");
    });
  });
});
