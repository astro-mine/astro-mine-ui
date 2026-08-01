"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";
import { useSyncExternalStore } from "react";

import { MoonGlyph, SunGlyph, SystemGlyph } from "./components/icons.js";

/**
 * The light / dark control (ui#3; ui.md §5, D6).
 *
 * **Three states, not two.** A two-way switch can express "light" and "dark" but not "whichever the
 * machine is set to", so the first time a user touches it they lose the system preference and have
 * no way to ask for it back. Following the system is the default and must stay reachable — which is
 * what makes the explicit choice an *override* rather than a one-way door.
 *
 * An explicit choice persists (MUI writes it to `localStorage`) and **beats the operating system in
 * both directions**: choosing light on a dark-mode machine gives light, and choosing dark on a
 * light-mode machine gives dark. That symmetry is the acceptance criterion, and it is the half that
 * a naive "prefers-color-scheme with a dark toggle" implementation gets wrong.
 */
export interface ColorModeToggleProps {
  /** Rendered smaller for a dense top bar. */
  readonly size?: "small" | "medium";
}

const OPTIONS = [
  { value: "light", label: "Light", Glyph: SunGlyph },
  { value: "system", label: "Follow the system", Glyph: SystemGlyph },
  { value: "dark", label: "Dark", Glyph: MoonGlyph },
] as const;

export function ColorModeToggle({ size = "small" }: ColorModeToggleProps) {
  const { mode, setMode } = useColorScheme();

  // `mode` is undefined until the provider has read storage on the client. Rendering a guess would
  // paint the wrong button as selected and then correct itself — a flicker on exactly the control
  // whose job is to make the mode unambiguous. So the group renders disabled until it knows, which
  // also keeps the prerendered markup identical to the first client render.
  //
  // `useSyncExternalStore` rather than a `useState` + `useEffect` mounted flag: it is React's own
  // answer to "server render and client render must differ here", it gives the two snapshots
  // explicitly instead of relying on an effect firing, and it does not set state during an effect
  // — which cascades a render and which `react-hooks/set-state-in-effect` rejects.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <ToggleButtonGroup
      exclusive
      size={size}
      value={ready ? (mode ?? "system") : null}
      disabled={!ready}
      aria-label="Colour mode"
      onChange={(_event, next: "light" | "dark" | "system" | null) => {
        // `null` arrives when the selected button is pressed again. Honouring it would leave no
        // button selected and no mode chosen, so the current choice stands.
        if (next !== null) setMode(next);
      }}
    >
      {OPTIONS.map(({ value, label, Glyph }) => (
        <Tooltip key={value} title={label}>
          {/* The tooltip needs a real element to hold; `span` keeps the button's own semantics. */}
          <span>
            <ToggleButton value={value} aria-label={label} disabled={!ready}>
              <Glyph />
            </ToggleButton>
          </span>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
}
