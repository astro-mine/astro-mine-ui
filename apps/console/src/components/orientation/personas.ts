// The seven personas, in one place (ui#9, ui#34).
//
// **One source, because two pages read them and ui#34 says they must not diverge.** `ui#9`'s home
// page routes a persona *into a journey*; `ui#34`'s help page explains what the personas *are*. Two
// jobs, one list — and a list written twice is a list that disagrees with itself by the third edit.
//
// **Transcribed from `guide/reference/personas.md`, which is the authority.** That file is the
// guide's own routing table and is maintained; this is a projection of it for the two things a
// front end can do that a document cannot — link into a live page, and say honestly where the
// answer is a command rather than a screen. Everything here that is a *claim* about a persona comes
// from that file, including the ones that are uncomfortable: P5 is the only persona for whom "the
// CLI is acceptable" is false, and P1 and P6 are the volume and both are outsiders.
//
// **`route` is the honest field.** Where a persona's journey has a page, it is a link into that
// page. Where it does not — P2, P3, P4 author things that have no REST surface, so no page —
// `route` is `null` and `command` carries what actually does the job. A persona card that linked
// somewhere plausible-but-unbuilt is precisely the "so this is the GUI" failure the gap report's J6
// records, and `ui#9`'s criterion is that every card leads somewhere that exists.

export interface Persona {
  /** `P1`…`P7`, as the guide numbers them. */
  readonly id: string;
  readonly title: string;
  /** Who they are, in one line. */
  readonly who: string;
  /** What they are trying to do. */
  readonly goal: string;
  /**
   * Where this application takes them, or `null` when the answer is not a page.
   *
   * `null` is not a gap to be filled later by pointing at something vaguely related. It is the
   * honest statement that this persona's work has no web edge, and it is what makes the CLI note
   * below load-bearing rather than decorative.
   */
  readonly route: string | null;
  /** The label for that link, or for the CLI entry point when there is no route. */
  readonly action: string;
  /** What does the job on the command line. Present for every persona, page or no page. */
  readonly command: string;
  /**
   * The trap this persona falls into, from the guide's own "watch out for" row.
   *
   * Kept because it is the single most useful sentence per persona and because most of them are
   * honesty statements the rest of this application also makes — the fixture runner, capability
   * tags, held-out seeds.
   */
  readonly watchOutFor: string;
}

export const PERSONAS: readonly Persona[] = [
  {
    id: "P1",
    title: "Benchmark researcher",
    who: "An ML or RL researcher. Python-fluent, not a planetary scientist.",
    goal: "Run the anchor scenario, train a policy that beats the baseline, and get it on the board.",
    route: "/bench/leaderboard",
    action: "See the leaderboard",
    command: "astro-mine bench score --runner sim && astro-mine bench submit",
    watchOutFor:
      "The default runner is the fixture, not physics. Check the runner on every row and scorecard — this application badges it, and the CLI prints it.",
  },
  {
    id: "P2",
    title: "Planning & autonomy researcher",
    who: "A robotics or planning academic. Cares about allocators, planners and shields, not RL.",
    goal: "Swap in a new planner or solver behind the same interface and measure it on the same benchmark.",
    // Mind, Allocate and Guard have no REST surface, so no page. Saying so is the point.
    route: null,
    action: "Compose a stack on the command line",
    command: "astro-mine mind compose && astro-mine guard validate",
    watchOutFor:
      "Mind has no `run`, deliberately. Composing is Mind's job; executing needs a Core environment, which is Sim's. Measure through Bench.",
  },
  {
    id: "P3",
    title: "Planetary scientist & world author",
    who: "A domain scientist with real PDS data. Python-capable, not a software engineer.",
    goal: "Author a world and a resource prior from real data, and publish them for others to use.",
    route: null,
    action: "Author a world on the command line",
    command: "astro-mine new world && astro-mine worlds validate && astro-mine worlds publish",
    watchOutFor:
      "Building the anchor world needs the LOLA DEM and SPICE kernels — neither ships — and hours of CPU. Start from the synthetic example, which needs neither.",
  },
  {
    id: "P4",
    title: "Roboticist & asset author",
    who: "A robotics engineer with a vehicle concept. Knows URDF, not SADF.",
    goal: "Describe a robot, validate it, see it in the simulator, and publish it.",
    route: null,
    action: "Author an asset on the command line",
    command: "astro-mine fleet new && astro-mine fleet validate && astro-mine fleet publish",
    watchOutFor:
      "`fleet import` brings kinematics and mass across, never capabilities, power or sensors — URDF has no vocabulary for them. An asset with no capability tags will never be assigned work.",
  },
  {
    id: "P5",
    title: "Mission designer",
    who: "A systems or mission engineer. The least CLI-tolerant persona.",
    goal: "State a goal, explore swarm designs, compare them on a Pareto front, and publish a campaign.",
    route: "/design/new",
    action: "Start a study",
    command: "astro-mine studio serve — and then nothing else; everything is in the GUI",
    watchOutFor:
      "Read the Pareto front honestly: a stand-in evaluator ran no physics, and a front containing every candidate is a property of the scoring rather than a finding.",
  },
  {
    id: "P6",
    title: "Educator or student",
    who: "An instructor building a course, or a student on a laptop with no cluster and no account.",
    goal: "Run something real, see it, understand it, and finish an assignment.",
    route: "/bench/leaderboard",
    action: "Find a leaderboard",
    command: "astro-mine bench list && astro-mine bench score",
    watchOutFor:
      "Everything you need works on one workstation, offline, with no account. Reading anything here never asks you to sign in.",
  },
  {
    id: "P7",
    title: "Commons steward",
    who: "A maintainer or leaderboard operator.",
    goal: "Run the hosted leaderboard, curate submissions, and keep results trustworthy.",
    route: "/bench/audit",
    action: "Open the audit trail",
    command: "astro-mine bench zoo-sync && astro-mine hub verify",
    watchOutFor:
      "Leaderboard scoring uses held-out seeds whose commitment hash ships in the scenario. That is what makes a submitted result trustworthy without trusting the submitter.",
  },
];
