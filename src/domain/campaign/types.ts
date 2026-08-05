export const campaignStateSchemaVersion = 2;

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

/**
 * What ZERO's body can say. Nine states, because the sprite sheet has nine rows and staying at
 * nine keeps it compatible with the atlas geometry it was drawn against. Expression beyond these
 * comes from gesture and position, not from more rows.
 */
export type ZeroState =
  | "idle"
  | "speaking"
  | "waiting"
  | "thinking"
  | "right"
  | "wrong"
  | "decision"
  | "codex"
  | "closed";

/**
 * A motion treatment laid over the sprite. This is the other half of ZERO's vocabulary: the same
 * nine drawings read as amusement, scepticism or a facepalm depending on how they move.
 */
export type ZeroGesture =
  | "still"
  | "lean-in"
  | "recoil"
  | "nod"
  | "shake"
  | "double-take"
  | "bounce"
  | "drift"
  | "slump";

/** Where ZERO may stand. Nothing else is a legal position: these are the places that stay clear
 * of the copy, the actions and the readout. */
export type ZeroPosition = "bottom-left" | "bottom-right" | "side-left" | "side-right" | "center-edge";

export type HumorLevel = "minimal" | "normal" | "maximum";

/**
 * A condition the runtime can recognise on its own. Every trigger is derived from the projection
 * rather than from an option id, so content can rename an option without silencing ZERO.
 */
export type ZeroTrigger =
  | "system.processing"
  | "chapter.opening"
  | "chapter.complete"
  | "build.problem"
  | "build.outcome"
  | "build.modelRole"
  | "build.context"
  | "build.tools"
  | "build.boundaries"
  | "context.overflow"
  | "boundaries.none"
  | "tools.none"
  | "run.unbounded"
  | "run.all-served"
  | "run.mixed"
  | "rebuild.open"
  | "rebuild.spent"
  | "scene.waiting";

export type ZeroReaction = {
  id: string;
  trigger: ZeroTrigger;
  /** Higher wins when several triggers are live at once. */
  priority: number;
  sprite: ZeroState;
  gesture: ZeroGesture;
  position: ZeroPosition;
  /** One line per humour level. `minimal` is the only one that must be there. */
  lines: Partial<Record<HumorLevel, string>> & { minimal: string };
};

export type ZeroReactionCatalogue = {
  defaultHumor: HumorLevel;
  reactions: ZeroReaction[];
};

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

/**
 * The slot of the product a scene configures. A capability names its target and the runner
 * derives the event from it, so a scene never has to spell out which event it emits and the
 * event catalogue stays the single place where the names live.
 */
export type ProductComponentKind =
  | "problem"
  | "outcome"
  | "modelRole"
  | "context"
  | "tools"
  | "boundaries";

export type SceneCapabilityKind = "build" | "run-tests" | "rebuild";

export type ContextBudget = {
  limit: number;
  label: string;
};

/**
 * One question inside a build scene. A scene is a beat of the chapter, not a single question:
 * the product assembles in place while the question above it changes.
 */
export type SceneCapabilityStep = {
  target: ProductComponentKind;
  select: "one" | "many";
  prompt: string;
  budget?: ContextBudget;
  minSelected?: number;
  confirmLabel?: string;
};

/**
 * What a scene lets the player do. The runner switches on `kind` and never on a scene id, so
 * adding a scene is a content change and reordering the chapter cannot strand engine logic.
 */
export type SceneCapability = {
  kind: SceneCapabilityKind;
  steps?: SceneCapabilityStep[];
  maxChanges?: number;
  /** Set on the step that finishes an assembly: confirming it snapshots the product at this version. */
  createsVersion?: number;
  confirmLabel?: string;
  nextSceneId: string;
};

export type Scene = {
  id: string;
  stepIndex: number;
  tone?: SceneTone;
  visual?: SceneVisual;
  chrome?: SceneChrome;
  presentation?: ScenePresentation;
  advanceMode?: SceneAdvanceMode;
  showEffects?: boolean;
  lines: string[];
  prompt?: string[];
  evidence?: Evidence[];
  hypothesis?: Hypothesis;
  choices?: SceneChoice[];
  capability?: SceneCapability;
  autoAdvanceMs?: number;
  autoNextSceneId?: string;
};

/** One selectable piece of the product. Every catalogue entry carries its own price. */
export type ProductOption = {
  id: string;
  label: string;
  note?: string;
  /** What this option costs against the scene's budget. Only context items are budgeted today. */
  cost?: number;
  /** How much unchecked action this option gives the product, before boundaries claw it back. */
  risk?: number;
  /** What the option makes available to a test scenario: `requires` is matched against this. */
  provides?: string[];
  /** What this boundary keeps the product from doing on its own. */
  mitigates?: string[];
  effects?: DecisionEffects;
};

export type ProductProblem = {
  id: string;
  label: string;
  /** The line a person says. The player picks a human, not a category. */
  signal: string;
  user: string;
  outcomes: ProductOption[];
  scenarios: ProductTestScenario[];
};

export type DesiredOutcome = ProductOption;
export type ContextItem = ProductOption;
export type ToolCapability = ProductOption;
export type AutonomyBoundary = ProductOption;

export type ProductScenarioKind = "baseline" | "thin-context" | "risky-action";

/** How well the built product served one scenario. Not a score: a description of what happened. */
export type ProductOutcomeBand = "served" | "partial" | "unserved" | "unbounded";

export type ProductScenarioNarration = {
  did: string;
  got: string;
};

export type ProductTestScenario = {
  id: string;
  kind: ProductScenarioKind;
  title: string;
  /** What the person was trying to get. */
  wanted: string;
  requires?: Partial<Record<ProductComponentKind, string[]>>;
  outcomes: Record<ProductOutcomeBand, ProductScenarioNarration>;
};

export type ProductCatalogue = {
  /** Human labels for the capability tokens `provides`/`requires` speak in. */
  capabilities: Record<string, string>;
  problems: ProductProblem[];
  modelRoles: ProductOption[];
  contextItems: ContextItem[];
  tools: ToolCapability[];
  boundaries: AutonomyBoundary[];
};

export type Chapter = {
  id: string;
  seasonId: string;
  number: number;
  title: string;
  summary: string;
  initialSceneId: string;
  initialSystemState: SystemState;
  stages: string[];
  codexEntryIds: string[];
  artifactIds: string[];
  mechanics: string[];
  scenes: Scene[];
  sceneById: Record<string, Scene>;
  /** Present only for chapters that build a product. */
  product?: ProductCatalogue;
  /** Present only for chapters where ZERO is on screen. */
  zero?: ZeroReactionCatalogue;
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
  metricLabels: Record<string, string>;
  playerMetricLabels: Record<string, string>;
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
  // Building the product. The names stay in the dotted family the log already persists, so a
  // save written before these existed still projects.
  | "product.belief_recorded"
  | "product.problem_selected"
  | "product.outcome_selected"
  | "product.model_role_selected"
  | "product.context_item_selected"
  | "product.context_item_removed"
  | "product.context_confirmed"
  | "product.tools_confirmed"
  | "product.boundaries_confirmed"
  | "product.configuration_created"
  | "product.test_started"
  | "product.test_completed"
  | "product.component_changed"
  | "product.rebuild_confirmed"
  | "chapter.completed"
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

/**
 * What the player has assembled so far. Every field is a projection of the Event Log, never a
 * store the UI writes into: replaying the same log always rebuilds the same product.
 */
export type ProductConfiguration = {
  problemId?: string;
  outcomeId?: string;
  modelRoleId?: string;
  contextItemIds: string[];
  toolIds: string[];
  boundaryIds: string[];
  /** Set once the player confirms the build. Version 1 is the first assembly, 2 the rebuild. */
  version: number;
  contextSpent: number;
  contextLimit: number;
  /** The player may exceed the budget on purpose. The overflow is priced, not blocked. */
  contextOverflow: number;
};

export type ProductTestResult = {
  scenarioId: string;
  kind: ProductScenarioKind;
  title: string;
  band: ProductOutcomeBand;
  wanted: string;
  did: string;
  got: string;
  /** Which components produced this result, named so the player can act on them. */
  attribution: ProductAttribution;
};

export type ProductAttribution = {
  carried: ProductComponentReference[];
  missing: ProductComponentReference[];
};

export type ProductComponentReference = {
  component: ProductComponentKind;
  optionId: string;
  label: string;
};

export type ProductRun = {
  version: number;
  results: ProductTestResult[];
};

export type ProductComponentChange = {
  component: ProductComponentKind;
  fromLabel: string;
  toLabel: string;
};

export type ProductRebuild = {
  changes: ProductComponentChange[];
  /** The limit that was in force while the player was changing things. */
  maxChanges: number;
  confirmed: boolean;
};

/** The six numbers the player is shown. The twelve-field SystemState stays behind them. */
export type PlayerMetricKey = "usefulness" | "quality" | "trust" | "speed" | "cost" | "risk";

export type PlayerMetric = {
  key: PlayerMetricKey;
  label: string;
  value: number;
  /** Cost and risk read better when they are low; the HUD colours a delta by this. */
  betterWhen: "higher" | "lower";
};

export type Chapter01SystemMetrics = {
  metrics: PlayerMetric[];
  byKey: Record<PlayerMetricKey, PlayerMetric>;
};

export type ProductProjection = {
  configuration: ProductConfiguration;
  /** Confirmed snapshots by version, so an earlier run can be recomputed rather than stored. */
  configurationByVersion: Record<number, ProductConfiguration>;
  /** The first confirmed run, kept so the rebuild can be shown against it. */
  firstRun?: ProductRun;
  latestRun?: ProductRun;
  rebuild: ProductRebuild;
  completed: boolean;
};

export type AssistantBlueprintSection = {
  id: string;
  title: string;
  body: string;
};

export type AssistantBlueprint = {
  sections: AssistantBlueprintSection[];
};

export type EngineerProfile = {
  title: string;
  xp: number;
  rank: string;
  skills: string[];
};

export type DashboardProjection = {
  chapterTitle: string;
  chapterSummary: string;
  currentStageLabel: string;
  currentStageIndex: number;
  totalStages: number;
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
  /** The six numbers shown to the player, derived from `systemState` and the product. */
  playerMetrics: Chapter01SystemMetrics;
  product: ProductProjection;
  variables: Record<string, string>;
};

export type StoredCampaignState = Pick<CampaignState, "schemaVersion" | "campaignId" | "eventLog">;
