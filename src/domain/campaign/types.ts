export const campaignStateSchemaVersion = 1;

export type SystemMetricKey =
  | "usefulness"
  | "quality"
  | "latency"
  | "cost"
  | "trust"
  | "resilience"
  | "adaptability"
  | "maintainability"
  | "observability"
  | "security"
  | "technicalDebt"
  | "organisationalDebt";

export type SystemState = Record<SystemMetricKey, number>;

export type SceneTone = "normal" | "error" | "success" | "codex";
export type ChoiceTone = "quiet" | "primary";
export type SceneVisual = "context" | "signal";
export type SceneChrome = "bare" | "system";
export type ScenePresentation = "terminal" | "dialogue" | "title";
export type SceneAdvanceMode = "any-input";
export type ChoiceAction = "artifacts" | "codex" | "reset";

export type Evidence = {
  id: string;
  title: string;
  text: string;
  missing?: boolean;
};

export type Hypothesis = {
  id: string;
  text: string;
  evidenceIds?: string[];
};

export type DecisionEffects = Partial<Record<SystemMetricKey, number>>;

export type SceneChoice = {
  id: string;
  label: string;
  nextSceneId?: string;
  action?: ChoiceAction;
  setPrediction?: string;
  setVariables?: Record<string, string>;
  decisionId?: string;
  unlockCodexEntryId?: string;
  generateArtifactId?: string;
  tone?: ChoiceTone;
  effects?: DecisionEffects;
};

export type Scene = {
  id: string;
  stepIndex: number;
  time?: string;
  tone?: SceneTone;
  visual?: SceneVisual;
  chrome?: SceneChrome;
  presentation?: ScenePresentation;
  advanceMode?: SceneAdvanceMode;
  lines: string[];
  prompt?: string[];
  evidence?: Evidence[];
  hypothesis?: Hypothesis;
  choices?: SceneChoice[];
  autoAdvanceMs?: number;
  autoNextSceneId?: string;
};

export type Chapter = {
  id: string;
  seasonId: string;
  number: number;
  title: string;
  summary: string;
  initialSceneId: string;
  initialSystemState: SystemState;
  caseSteps: string[];
  codexEntryIds: string[];
  artifactIds: string[];
  mechanics: string[];
  scenes: Scene[];
  sceneById: Record<string, Scene>;
};

export type Season = {
  id: string;
  title: string;
  chapterIds: string[];
};

export type CodexEntry = {
  id: string;
  number: string;
  title: string;
  body: string;
};

export type ArtifactTemplateSection = {
  id: string;
  title: string;
};

export type ArtifactTemplate = {
  id: string;
  chapterId: string;
  title: string;
  format: "markdown";
  sections: ArtifactTemplateSection[];
};

export type PlatformContent = {
  platformId: string;
  title: string;
  defaultCampaignId: string;
  seasons: Season[];
  chapters: Chapter[];
  chapterById: Record<string, Chapter>;
  codexEntries: CodexEntry[];
  codexEntryById: Record<string, CodexEntry>;
  artifactTemplates: ArtifactTemplate[];
  artifactTemplateById: Record<string, ArtifactTemplate>;
};

export type EventType =
  | "campaign.started"
  | "chapter.started"
  | "scene.entered"
  | "choice.submitted"
  | "decision.submitted"
  | "codex.entry_unlocked"
  | "artifact.generated"
  | "legacy.save_migrated"
  | "campaign.reset_completed"
  // Legacy persisted event name. New code emits campaign.reset_completed.
  | "campaign.reset";

export type GameEvent = {
  id: string;
  sequence: number;
  type: EventType;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type DecisionRecord = {
  id: string;
  chapterId: string;
  sceneId: string;
  choiceId: string;
  label: string;
  effects: DecisionEffects;
  occurredAt: string;
};

export type ArtifactRecord = {
  id: string;
  templateId: string;
  chapterId: string;
  title: string;
  body: string;
  createdAt: string;
};

export type EngineerProfile = {
  title: string;
  xp: number;
  rank: string;
  skills: string[];
};

export type DashboardProjection = {
  caseTitle: string;
  caseSummary: string;
  currentStepLabel: string;
  currentStepIndex: number;
  totalSteps: number;
  completedDecisionCount: number;
  unlockedCodexCount: number;
  artifactCount: number;
};

export type SystemProjection = {
  status: string;
  lastMessage?: string;
};

export type CampaignState = {
  schemaVersion: number;
  campaignId: string;
  currentChapterId: string;
  currentSceneId: string;
  eventLog: GameEvent[];
  systemState: SystemState;
  system: SystemProjection;
  decisions: Record<string, DecisionRecord>;
  unlockedCodexEntryIds: string[];
  artifacts: ArtifactRecord[];
  engineerProfile: EngineerProfile;
  dashboard: DashboardProjection;
  variables: Record<string, string>;
};

export type StoredCampaignState = Pick<CampaignState, "schemaVersion" | "campaignId" | "eventLog">;
