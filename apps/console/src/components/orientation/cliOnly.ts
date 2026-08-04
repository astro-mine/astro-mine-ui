// What has no page, and what does it instead (ui#34; ui.md §5).
//
// **`ui.md` §5 claims that "nothing is GUI-unreachable by construction".** That is a real claim and
// it needs somewhere to land: a capability with no GUI has to be *discoverable from* the GUI, or
// the claim is a sentence nobody can check. This list is where it lands, and `CliAnswers` renders
// it.
//
// **Asserted against the navigation table**, so it cannot rot as pages land: if one of these ever
// gains a route, the test fails and the entry has to go.

/** One capability with no page: what it is, why there is none, and what does it instead. */
export interface CliOnly {
  readonly capability: string;
  readonly why: string;
  readonly command: string;
}

export const CLI_ONLY: readonly CliOnly[] = [
  {
    capability: "Authoring a robot",
    why: "Fleet has no REST surface. SADF authoring is a file-and-validate loop, and the platform's best-served workflow is its 14-subcommand lifecycle.",
    command: "astro-mine fleet new",
  },
  {
    capability: "Authoring a world",
    why: "Worlds has no REST surface. Building one is a data pipeline over rasters and kernels, measured in hours rather than requests.",
    command: "astro-mine new world",
  },
  {
    capability: "Composing a planner stack",
    why: "Mind has no REST surface, and deliberately no `run` — composing is Mind's job, executing is Sim's.",
    command: "astro-mine mind compose",
  },
  {
    capability: "Writing a safety specification",
    why: "Guard has no REST surface. A safety spec is compiled and falsified, not submitted.",
    command: "astro-mine guard compile",
  },
  {
    capability: "Running a simulation",
    why: "Sim speaks gRPC, which is not a web edge. Nothing in this application runs physics.",
    command: "astro-mine sim run",
  },
  {
    capability: "Training a policy",
    why: "Learn has no REST surface. Training is a long local or cluster job, and its artifacts reach the commons through Hub.",
    command: "astro-mine learn train",
  },
  {
    capability: "Authoring a benchmark scenario",
    why: "A zoo-curation task, better served by the CLI until somebody asks otherwise. The route exists; no page calls it.",
    command: "astro-mine bench zoo-sync",
  },
];
