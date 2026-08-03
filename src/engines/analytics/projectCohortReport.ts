import { safeDecisionId, type SessionReport } from "@/src/engines/analytics/projectSessionReport";

/**
 * Acceptance reading of a whole cohort, not a single playthrough.
 *
 * One session report answers "what did this person do". The gate in
 * `docs/product/chapter-01-validation.md` is stated over eight people, so somebody has to
 * tally eight reports against eight thresholds by hand — which is exactly where a chapter
 * gets declared successful on its most flattering number. This projection does the tally.
 *
 * Two rules from the document are enforced here rather than left to the reader:
 * runs made on different chapter versions are not one sample, and a high first-attempt
 * count is not evidence of understanding when the cohort reached it by elimination.
 */

export type ParticipantRole = "product" | "analyst" | "project-manager" | "control";

/**
 * Scored by the observer after the interview. The chapter cannot record any of this:
 * every field here is a human judgement about an answer given out loud.
 */
export type InterviewScore = {
  /** Question 5 — separates a model working correctly from a product defect. */
  transferAnswered: boolean;
  /** Question 2 — states the principle in their own words. */
  explainedPrinciple: boolean;
  /** Question 4 — argues from the situation, not from the chapter's wording. */
  justifiedDecision: boolean;
  /** Question 4 — how many missing reliability mechanisms they named. */
  mechanismsNamed: number;
  /** Question 6 */
  wantsNextChapter: boolean;
};

export type CohortRun = {
  participant: string;
  role: ParticipantRole;
  /** Content version the run was played on. Runs across versions are not one sample. */
  chapterVersion: string;
  report: SessionReport;
  interview?: InterviewScore;
};

export type Threshold =
  | { kind: "min"; value: number }
  | { kind: "max"; value: number }
  | { kind: "range"; min: number; max: number };

export type CohortCriterion = {
  id: string;
  label: string;
  source: "event-log" | "interview";
  threshold: Threshold;
  /** Count of participants, or minutes for the duration criterion. */
  observed: number;
  /** `undefined` when the data needed to decide is missing. Never silently `false`. */
  met?: boolean;
};

export type CohortReport = {
  cohortSize: number;
  chapterVersion?: string;
  roleCounts: Record<string, number>;
  criteria: CohortCriterion[];
  gate: {
    /** The transfer question decides whether the chapter taught anything portable. */
    observed: number;
    met?: boolean;
    band: "transferable" | "needs-rework" | "example-bound" | "undecidable";
  };
  /** Conditions that make the numbers above unsafe to read at face value. */
  warnings: string[];
  /** True only when every criterion is met on a complete, single-version cohort of eight. */
  accepted: boolean;
};

/** Thresholds mirror the table in `docs/product/chapter-01-validation.md`. */
export const cohortSize = 8;
export const expectedRoleCounts: Record<ParticipantRole, number> = {
  product: 3,
  analyst: 2,
  "project-manager": 1,
  control: 2,
};

export function projectCohortReport(runs: CohortRun[]): CohortReport {
  const scored = runs.filter((run) => run.interview);
  const interviewComplete = runs.length > 0 && scored.length === runs.length;
  const versions = [...new Set(runs.map((run) => run.chapterVersion))];
  const durations = runs
    .map((run) => run.report.elapsedMs)
    .filter((elapsed): elapsed is number => typeof elapsed === "number");

  const correctedCount = count(runs, (run) => run.report.decision.correctedAfterFeedback);
  const transferCount = count(scored, (run) => run.interview!.transferAnswered);

  const criteria: CohortCriterion[] = [
    interviewCriterion("transfer", "Переносят принцип на новую ситуацию", { kind: "min", value: 6 }, transferCount, interviewComplete),
    interviewCriterion(
      "explains-principle",
      "Объясняют основной принцип своими словами",
      { kind: "min", value: 6 },
      count(scored, (run) => run.interview!.explainedPrinciple),
      interviewComplete,
    ),
    interviewCriterion(
      "justifies-decision",
      "Могут обосновать решение, а не повторить формулировку игры",
      { kind: "min", value: 6 },
      count(scored, (run) => run.interview!.justifiedDecision),
      interviewComplete,
    ),
    interviewCriterion(
      "names-mechanisms",
      "Называют минимум два недостающих механизма надёжности",
      { kind: "min", value: 5 },
      count(scored, (run) => run.interview!.mechanismsNamed >= 2),
      interviewComplete,
    ),
    logCriterion(
      "corrected-after-feedback",
      "Исправили решение только после обратной связи",
      { kind: "max", value: 2 },
      correctedCount,
    ),
    logCriterion(
      "safe-decision-first",
      "Выбирают безопасное решение с первой попытки",
      { kind: "min", value: 5 },
      count(runs, (run) => run.report.decision.first?.decisionId === safeDecisionId),
    ),
    interviewCriterion(
      "wants-next-chapter",
      "Хотят открыть следующую главу",
      { kind: "min", value: 5 },
      count(scored, (run) => run.interview!.wantsNextChapter),
      interviewComplete,
    ),
    {
      id: "median-duration",
      label: "Медианное время прохождения, минут",
      source: "event-log",
      threshold: { kind: "range", min: 7, max: 12 },
      observed: median(durations) / 60_000,
      met: durations.length === runs.length && runs.length > 0 ? within(median(durations) / 60_000, 7, 12) : undefined,
    },
    logCriterion(
      "abandoned-in-opening",
      "Не доходят от начала до расследования",
      { kind: "max", value: 1 },
      count(runs, (run) => run.report.opening.abandonedBeforeInvestigation),
    ),
  ];

  const warnings: string[] = [];

  if (versions.length > 1) {
    warnings.push(
      `Прохождения сделаны на разных версиях главы (${versions.join(", ")}). Это не одна выборка: пороги «из 8» относятся к финальной версии.`,
    );
  }

  if (runs.length !== cohortSize) {
    warnings.push(`В выборке ${runs.length} прохождений из ${cohortSize}. Пороги записаны абсолютными числами и на другом размере выборки не читаются.`);
  }

  if (!interviewComplete) {
    warnings.push(`Оценка интервью отсутствует у ${runs.length - scored.length} из ${runs.length} участников. Критерии по интервью не вычислены.`);
  }

  // The document's interpretation rule, applied instead of trusted to the reader.
  if (correctedCount > 2) {
    warnings.push(
      `${correctedCount} из ${runs.length} пришли к решению только после обратной связи. Доля безопасных решений не подтверждает понимание: сцена решения проверяет перебор, а не мышление.`,
    );
  }

  const roleCounts = countRoles(runs);

  for (const [role, expected] of Object.entries(expectedRoleCounts)) {
    const actual = roleCounts[role] ?? 0;

    if (actual !== expected) {
      warnings.push(`Состав выборки: роль «${role}» — ${actual}, план ${expected}.`);
    }
  }

  return {
    cohortSize: runs.length,
    chapterVersion: versions.length === 1 ? versions[0] : undefined,
    roleCounts,
    criteria,
    gate: {
      observed: transferCount,
      met: interviewComplete ? transferCount >= 6 : undefined,
      band: transferBand(transferCount, interviewComplete),
    },
    warnings,
    accepted:
      runs.length === cohortSize &&
      versions.length === 1 &&
      interviewComplete &&
      criteria.every((criterion) => criterion.met === true),
  };
}

function transferBand(observed: number, interviewComplete: boolean): CohortReport["gate"]["band"] {
  if (!interviewComplete) {
    return "undecidable";
  }

  if (observed >= 6) {
    return "transferable";
  }

  return observed >= 4 ? "needs-rework" : "example-bound";
}

function logCriterion(id: string, label: string, threshold: Threshold, observed: number): CohortCriterion {
  return { id, label, source: "event-log", threshold, observed, met: meets(observed, threshold) };
}

function interviewCriterion(
  id: string,
  label: string,
  threshold: Threshold,
  observed: number,
  interviewComplete: boolean,
): CohortCriterion {
  return {
    id,
    label,
    source: "interview",
    threshold,
    observed,
    met: interviewComplete ? meets(observed, threshold) : undefined,
  };
}

function meets(observed: number, threshold: Threshold) {
  if (threshold.kind === "min") {
    return observed >= threshold.value;
  }

  if (threshold.kind === "max") {
    return observed <= threshold.value;
  }

  return within(observed, threshold.min, threshold.max);
}

function within(value: number, min: number, max: number) {
  return value >= min && value <= max;
}

function count<T>(items: T[], predicate: (item: T) => boolean) {
  return items.filter(predicate).length;
}

function countRoles(runs: CohortRun[]) {
  const counts: Record<string, number> = {};

  for (const run of runs) {
    counts[run.role] = (counts[run.role] ?? 0) + 1;
  }

  return counts;
}

function median(values: number[]) {
  if (values.length === 0) {
    return Number.NaN;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
