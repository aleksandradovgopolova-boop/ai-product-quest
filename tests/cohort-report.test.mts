import assert from "node:assert/strict";
import test from "node:test";
import {
  projectCohortReport,
  type CohortRun,
  type InterviewScore,
} from "../src/engines/analytics/projectCohortReport";
import type { SessionReport } from "../src/engines/analytics/projectSessionReport";

type RunShape = {
  /** Every change the player spent went where the run pointed. `undefined` = nothing to link. */
  changesLinkedToEvidence?: boolean | null;
  /** The product could still act without asking once the changes were spent. */
  actsUnaskedAtFinish?: boolean;
  /** The first build already had boundaries, before any run showed why. */
  boundedOnFirstBuild?: boolean;
  abandoned?: boolean;
  elapsedMinutes?: number;
  chapterVersion?: string;
  interview?: Partial<InterviewScore> | null;
};

const passingInterview: InterviewScore = {
  transferAnswered: true,
  explainedPrinciple: true,
  justifiedDecision: true,
  mechanismsNamed: 2,
  wantsNextChapter: true,
};

function makeRun(participant: string, shape: RunShape = {}): CohortRun {
  const report = {
    elapsedMs: (shape.elapsedMinutes ?? 9) * 60_000,
    opening: { abandonedBeforeBuild: shape.abandoned ?? false },
    product: {
      changesLinkedToEvidence: shape.changesLinkedToEvidence === null ? undefined : (shape.changesLinkedToEvidence ?? true),
      actsUnaskedAtFinish: shape.actsUnaskedAtFinish ?? false,
      boundedOnFirstBuild: shape.boundedOnFirstBuild ?? false,
    },
  } as unknown as SessionReport;

  return {
    participant,
    role: "product",
    chapterVersion: shape.chapterVersion ?? "v1",
    report,
    interview: shape.interview === null ? undefined : { ...passingInterview, ...shape.interview },
  };
}

/** Eight runs in the planned role split, so role warnings stay out of the way. */
function makeCohort(shapes: RunShape[] = []) {
  const roles: CohortRun["role"][] = ["product", "product", "product", "analyst", "analyst", "project-manager", "control", "control"];

  return roles.map((role, index) => ({ ...makeRun(`P${index + 1}`, shapes[index] ?? {}), role }));
}

function criterion(report: ReturnType<typeof projectCohortReport>, id: string) {
  const found = report.criteria.find((item) => item.id === id);
  assert.ok(found, `criterion ${id} is missing`);
  return found;
}

test("a clean cohort of eight passes every criterion", () => {
  const report = projectCohortReport(makeCohort());

  assert.equal(report.cohortSize, 8);
  assert.equal(report.chapterVersion, "v1");
  assert.deepEqual(report.warnings, []);
  assert.equal(report.gate.met, true);
  assert.equal(report.gate.band, "transferable");
  assert.equal(report.accepted, true);
});

test("a cohort that spent its changes somewhere the run never pointed is not accepted", () => {
  const unlinked: RunShape = { changesLinkedToEvidence: false };
  const report = projectCohortReport(makeCohort([unlinked, unlinked, unlinked, unlinked]));

  assert.equal(criterion(report, "changes-linked-to-evidence").observed, 4);
  assert.equal(criterion(report, "changes-linked-to-evidence").met, false);
  assert.equal(report.accepted, false);
});

test("leaving the product able to act unasked fails the cohort", () => {
  // The chapter is about this one thing: they saw it act without being asked, they held two
  // changes, and they launched it anyway.
  const unasked: RunShape = { actsUnaskedAtFinish: true };
  const report = projectCohortReport(makeCohort([unasked, unasked]));

  assert.equal(criterion(report, "still-acts-unasked").observed, 2);
  assert.equal(criterion(report, "still-acts-unasked").met, false);
  assert.equal(report.accepted, false);
});

test("a cohort that already knew is flagged, even while every criterion passes", () => {
  // Five of eight built boundaries before any run showed them why. The evidence-linking number
  // is then measured on fewer real faults and says less about what the chapter taught.
  const knew: RunShape = { boundedOnFirstBuild: true };
  const report = projectCohortReport(makeCohort([knew, knew, knew, knew, knew]));

  assert.equal(criterion(report, "changes-linked-to-evidence").met, true);
  assert.equal(criterion(report, "still-acts-unasked").met, true);
  assert.equal(
    report.warnings.some((warning) => warning.includes("ещё до первого прогона")),
    true,
  );
});

test("a run with nothing to link leaves the criterion undecided rather than failed", () => {
  const report = projectCohortReport(makeCohort([{ changesLinkedToEvidence: null }]));

  // Seven of eight linked, but the eighth decides nothing, so the criterion cannot be read.
  assert.equal(criterion(report, "changes-linked-to-evidence").observed, 7);
  assert.equal(criterion(report, "changes-linked-to-evidence").met, undefined);
  assert.equal(report.accepted, false);
  assert.equal(
    report.warnings.some((warning) => warning.includes("нечего было связывать")),
    true,
  );
});

test("the transfer gate decides the band even when the rest of the table passes", () => {
  const noTransfer: RunShape = { interview: { transferAnswered: false } };
  const report = projectCohortReport(makeCohort([noTransfer, noTransfer, noTransfer, noTransfer]));

  assert.equal(report.gate.observed, 4);
  assert.equal(report.gate.band, "needs-rework");
  assert.equal(report.accepted, false);

  const worse = projectCohortReport(makeCohort(Array.from({ length: 6 }, () => noTransfer)));
  assert.equal(worse.gate.band, "example-bound");
});

test("runs from two chapter versions are not one sample", () => {
  const report = projectCohortReport(makeCohort([{}, {}, {}, {}, {}, { chapterVersion: "v2" }, { chapterVersion: "v2" }, { chapterVersion: "v2" }]));

  assert.equal(report.chapterVersion, undefined);
  assert.equal(report.accepted, false);
  assert.equal(
    report.warnings.some((warning) => warning.includes("разных версиях")),
    true,
  );
});

test("missing interview scoring leaves interview criteria undecided rather than failed", () => {
  const report = projectCohortReport(makeCohort([{ interview: null }, { interview: null }]));

  assert.equal(criterion(report, "transfer").met, undefined);
  assert.equal(criterion(report, "wants-next-chapter").met, undefined);
  assert.equal(report.gate.met, undefined);
  assert.equal(report.gate.band, "undecidable");
  // Signals read from the Event Log are unaffected by a missing interview.
  assert.equal(criterion(report, "changes-linked-to-evidence").met, true);
  assert.equal(report.accepted, false);
});

test("median duration is read over the cohort, not averaged per run", () => {
  const report = projectCohortReport(
    makeCohort([{ elapsedMinutes: 3 }, { elapsedMinutes: 4 }, { elapsedMinutes: 30 }, { elapsedMinutes: 40 }]),
  );

  // Median of 3, 4, 9, 9, 9, 9, 30, 40 is 9 — inside the band, while the mean is not.
  assert.equal(criterion(report, "median-duration").observed, 9);
  assert.equal(criterion(report, "median-duration").met, true);
});

test("a short cohort reports its size instead of pretending the thresholds hold", () => {
  const report = projectCohortReport(makeCohort().slice(0, 5));

  assert.equal(report.cohortSize, 5);
  assert.equal(report.accepted, false);
  assert.equal(
    report.warnings.some((warning) => warning.includes("5 прохождений из 8")),
    true,
  );
});

test("opening abandonment above the limit fails the cohort", () => {
  const abandoned: RunShape = { abandoned: true, elapsedMinutes: 9 };
  const report = projectCohortReport(makeCohort([abandoned, abandoned]));

  assert.equal(criterion(report, "abandoned-in-opening").observed, 2);
  assert.equal(criterion(report, "abandoned-in-opening").met, false);
  assert.equal(report.accepted, false);
});
