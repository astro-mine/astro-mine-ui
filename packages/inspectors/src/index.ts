// @astro-mine/inspectors — the artifact-kind to panel registry.
//
// Deliberately empty. ui#7 brings the registry itself: the resolution rule over Core `kind`, Hub
// `artifact_kind` and an attribute predicate, and the panels it resolves to.
//
// This is the one package permitted to import a sibling, and only these two: it renders artifacts,
// so it needs the design system and — for a world — the globe. It must never import the
// application, and nothing else here may import it except the application.

export {};
