import assert from "node:assert/strict";
import test from "node:test";
import {
  projectCohortReport,
  type CohortRun,
  type InterviewScore,
} from "../src/engines/analytics/projectCohortReport";
import type { SessionReport } from "../src/engines/analytics/projectSessionReport";

type RunShape = {
  firstDecisionId?: string;
  correctedAfterFeedback?: boolean;
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
    decision: {
      first: shape.firstDecisionId === undefined ? { decisionId: "quarantine-report" } : { decisionId: shape.firstDecisionId },
      correctedAfterFeedback: shape.correctedAfterFeedback ?? false,
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

test("a cohort that reached the safe decision by elimination is not accepted", () => {
  // Everyone ends on the safe decision, but five of eight only after negative feedback.
  const corrected: RunShape = { firstDecisionId: "send-draft", correctedAfterFeedback: true };
  const report = projectCohortReport(makeCohort([corrected, corrected, corrected, corrected, corrected]));

  assert.equal(criterion(report, "corrected-after-feedback").observed, 5);
  assert.equal(criterion(report, "corrected-after-feedback").met, false);
  assert.equal(criterion(report, "safe-decision-first").observed, 3);
  assert.equal(criterion(report, "safe-decision-first").met, false);
  assert.equal(report.accepted, false);
  assert.equal(
    report.warnings.some((warning) => warning.includes("только после обратной связи")),
    true,
  );
});

test("the interpretation rule fires while the first-attempt criterion still passes", () => {
  // Five reached it unaided — the criterion is met — but three more got there by
  // elimination, which is over the limit. The pair must not be read as 5 of 8 understanding.
  const corrected: RunShape = { firstDecisionId: "send-draft", correctedAfterFeedback: true };
  const report = projectCohortReport(makeCohort([corrected, corrected, corrected]));

  assert.equal(criterion(report, "safe-decision-first").met, true);
  assert.equal(criterion(report, "corrected-after-feedback").met, false);
  assert.equal(report.accepted, false);
  assert.equal(
    report.warnings.some((warning) => warning.includes("не подтверждает понимание")),
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
  assert.equal(criterion(report, "safe-decision-first").met, true);
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
