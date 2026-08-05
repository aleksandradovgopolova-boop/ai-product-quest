import { applyDecisionEffects } from "@/src/engines/simulation/simulationRules";
import { generateArtifactRecord } from "@/src/engines/artifact/artifactEngine";
import { collectConfigurationEffects, currentActionRisk } from "@/src/engines/product/productBuilder";
import { projectPlayerMetrics } from "@/src/engines/projection/projectPlayerMetrics";
import { emptyProductProjection, projectProduct } from "@/src/engines/projection/projectProduct";
import { getChapter, getScene } from "@/src/domain/campaign/lookup";
import {
  campaignStateSchemaVersion,
  type ArtifactRecord,
  type CampaignState,
  type DecisionEffects,
  type DecisionRecord,
  type GameEvent,
  type PlatformContent,
  type SystemState,
} from "@/src/domain/campaign/types";

export function projectCampaign(content: PlatformContent, eventLog: GameEvent[]): CampaignState {
  const initialChapter = content.chapters[0];

  if (!initialChapter) {
    throw new Error("Content must contain at least one chapter");
  }

  const initialScene = getScene(initialChapter, initialChapter.initialSceneId);
  let campaignId = content.defaultCampaignId;
  let currentChapterId = initialChapter.id;
  let currentSceneId = initialScene.id;
  let systemState: SystemState = { ...initialChapter.initialSystemState };
  let lastMessage: string | undefined;
  const decisions: Record<string, DecisionRecord> = {};
  const unlockedCodexEntryIds = new Set<string>();
  const artifactsById = new Map<string, ArtifactRecord>();
  const variables: Record<string, string> = {};

  for (const event of eventLog) {
    switch (event.type) {
      case "campaign.started":
        campaignId = readString(event.payload.campaignId, campaignId);
        break;
      case "chapter.started": {
        currentChapterId = readString(event.payload.chapterId, currentChapterId);
        const chapter = getChapter(content, currentChapterId);
        currentSceneId = readString(event.payload.sceneId, chapter.initialSceneId);
        systemState = { ...chapter.initialSystemState };
        break;
      }
      case "scene.entered":
        currentChapterId = readString(event.payload.chapterId, currentChapterId);
        currentSceneId = readString(event.payload.sceneId, currentSceneId);
        break;
      case "choice.submitted": {
        const nextSceneId = readString(event.payload.nextSceneId, "");
        const prediction = readString(event.payload.prediction, "");
        const effects = readEffects(event.payload.effects);
        lastMessage = readString(event.payload.systemMessage, lastMessage);

        if (nextSceneId) {
          currentSceneId = nextSceneId;
        }

        if (prediction) {
          variables.prediction = prediction;
        }

        Object.assign(variables, readVariables(event.payload.variables));

        systemState = applyDecisionEffects(systemState, effects);
        break;
      }
      case "decision.submitted": {
        const decisionId = readString(event.payload.decisionId, "");

        if (decisionId) {
          decisions[decisionId] = {
            id: decisionId,
            chapterId: readString(event.payload.chapterId, currentChapterId),
            sceneId: readString(event.payload.sceneId, currentSceneId),
            choiceId: readString(event.payload.choiceId, ""),
            label: readString(event.payload.label, ""),
            effects: readEffects(event.payload.effects),
            occurredAt: event.occurredAt,
          };
        }

        break;
      }
      case "codex.entry_unlocked": {
        const entryId = readString(event.payload.entryId, "");

        if (entryId) {
          unlockedCodexEntryIds.add(entryId);
        }

        break;
      }
      case "artifact.generated": {
        const artifact = readArtifact(event.payload.artifact);

        if (artifact) {
          artifactsById.set(artifact.id, artifact);
        } else {
          const artifactId = readString(event.payload.artifactId, "");
          if (artifactId) {
            const interimState = buildStateSnapshot({
              content,
              campaignId,
              currentChapterId,
              currentSceneId,
              eventLog,
              systemState,
              decisions,
              unlockedCodexEntryIds,
              artifacts: Array.from(artifactsById.values()),
              variables,
              lastMessage,
            });
            const generated = generateArtifactRecord({ content, state: interimState, artifactId, occurredAt: event.occurredAt });
            artifactsById.set(generated.id, generated);
          }
        }

        break;
      }
      case "legacy.save_migrated": {
        currentChapterId = readString(event.payload.chapterId, currentChapterId);
        currentSceneId = readString(event.payload.sceneId, currentSceneId);
        const prediction = readString(event.payload.prediction, "");
        const codexEntryIds = Array.isArray(event.payload.codexEntryIds) ? event.payload.codexEntryIds : [];

        if (prediction) {
          variables.prediction = prediction;
        }

        for (const entryId of codexEntryIds) {
          if (typeof entryId === "string") {
            unlockedCodexEntryIds.add(entryId);
          }
        }

        lastMessage = "Старое сохранение перенесено";
        break;
      }
      case "campaign.reset":
      case "campaign.reset_completed":
        currentChapterId = initialChapter.id;
        currentSceneId = initialScene.id;
        systemState = { ...initialChapter.initialSystemState };
        lastMessage = "Кампания сброшена";
        break;
    }
  }

  return buildStateSnapshot({
    content,
    campaignId,
    currentChapterId,
    currentSceneId,
    eventLog,
    systemState,
    decisions,
    unlockedCodexEntryIds,
    artifacts: Array.from(artifactsById.values()),
    variables,
    lastMessage,
  });
}

function buildStateSnapshot(params: {
  content: PlatformContent;
  campaignId: string;
  currentChapterId: string;
  currentSceneId: string;
  eventLog: GameEvent[];
  systemState: SystemState;
  decisions: Record<string, DecisionRecord>;
  unlockedCodexEntryIds: Set<string>;
  artifacts: ArtifactRecord[];
  variables: Record<string, string>;
  lastMessage?: string;
}): CampaignState {
  const chapter = getChapter(params.content, params.currentChapterId);
  const scene = getScene(chapter, params.currentSceneId);
  const currentStageIndex = Math.min(Math.max(scene.stepIndex, 1), chapter.stages.length);
  const currentStageLabel = chapter.stages[currentStageIndex - 1] ?? chapter.stages[0] ?? "Создать";
  const decisions = { ...params.decisions };
  const unlockedCodexEntryIds = Array.from(params.unlockedCodexEntryIds);
  const artifacts = [...params.artifacts];
  const product = chapter.product ? projectProduct(chapter.product, params.eventLog) : emptyProductProjection;
  // The product is priced by what it currently is, not by the order its pieces were chosen. A
  // rebuild therefore re-prices the system for free: swap a component and the effects follow.
  const systemState = chapter.product
    ? applyDecisionEffects(params.systemState, collectConfigurationEffects(chapter.product, product.configuration))
    : params.systemState;
  const playerMetrics = projectPlayerMetrics({
    systemState,
    currentActionRisk: chapter.product ? currentActionRisk(chapter.product, product.configuration) : 0,
    labels: params.content.playerMetricLabels,
  });

  return {
    schemaVersion: campaignStateSchemaVersion,
    campaignId: params.campaignId,
    currentChapterId: chapter.id,
    currentSceneId: scene.id,
    eventLog: [...params.eventLog],
    systemState,
    system: {
      status: getSystemStatus(scene, currentStageIndex, chapter.stages.length),
      lastMessage: params.lastMessage,
    },
    decisions,
    unlockedCodexEntryIds,
    artifacts,
    engineerProfile: {
      title: "AI Product Engineer",
      xp: calculateXp(params.eventLog, unlockedCodexEntryIds.length, artifacts.length),
      rank: artifacts.length > 0 ? "Product Builder" : "Trainee",
      skills: unlockedCodexEntryIds.includes("llm-not-product") ? ["Отличать модель от продукта"] : [],
    },
    dashboard: {
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      currentStageLabel,
      currentStageIndex,
      totalStages: chapter.stages.length,
      completedDecisionCount: Object.keys(decisions).length,
      unlockedCodexCount: unlockedCodexEntryIds.length,
      artifactCount: artifacts.length,
    },
    playerMetrics,
    product,
    variables: { ...params.variables },
  };
}

function getSystemStatus(scene: { tone?: string; visual?: string; choices?: unknown[]; id: string }, currentStageIndex: number, totalStages: number) {
  if (scene.tone === "error") {
    return "СЛЕД НЕ СОВПАЛ";
  }

  if (scene.tone === "success" || scene.tone === "codex") {
    return "ВЫВОД ПОДТВЕРЖДЁН";
  }

  if (scene.visual === "context") {
    return "КОНТЕКСТ ОТКРЫТ";
  }

  // The last stage is the launch: nothing is being asked any more.
  if (currentStageIndex === totalStages && (scene.choices ?? []).length === 0) {
    return "ПРОДУКТ ЗАПУЩЕН";
  }

  if (scene.choices && scene.choices.length > 0) {
    return "ОЖИДАЕТ ВЫБОР";
  }

  return "СИСТЕМА ГОТОВА";
}

function calculateXp(events: GameEvent[], unlockedCodexCount: number, artifactCount: number) {
  const decisionEvents = events.filter((event) => event.type === "decision.submitted").length;
  return events.length * 2 + decisionEvents * 20 + unlockedCodexCount * 30 + artifactCount * 50;
}

function readString(value: unknown, fallback: string | undefined): string {
  return typeof value === "string" ? value : (fallback ?? "");
}

function readVariables(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const variables: Record<string, string> = {};

  for (const [name, entry] of Object.entries(value)) {
    if (typeof entry === "string" && entry.length > 0) {
      variables[name] = entry;
    }
  }

  return variables;
}

function readEffects(value: unknown): DecisionEffects {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const effects: DecisionEffects = {};

  for (const [key, delta] of Object.entries(value)) {
    if (typeof delta === "number") {
      effects[key as keyof SystemState] = delta;
    }
  }

  return effects;
}

function readArtifact(value: unknown): ArtifactRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Partial<ArtifactRecord>;

  if (
    typeof candidate.id === "string" &&
    typeof candidate.templateId === "string" &&
    typeof candidate.chapterId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.body === "string" &&
    typeof candidate.createdAt === "string"
  ) {
    return candidate as ArtifactRecord;
  }

  return undefined;
}
