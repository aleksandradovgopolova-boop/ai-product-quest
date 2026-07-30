import { generateArtifactRecord } from "@/src/engines/artifact/artifactEngine";
import { projectCampaign } from "@/src/engines/projection/projectCampaign";
import { getChapter, getChoice, getScene } from "@/src/domain/campaign/lookup";
import type { CampaignState, GameEvent, PlatformContent, SceneChoice } from "@/src/domain/campaign/types";

export function createInitialCampaignState(content: PlatformContent, chapterId = content.chapters[0]?.id, occurredAt = new Date().toISOString()): CampaignState {
  if (!chapterId) {
    throw new Error("Cannot start campaign without a chapter");
  }

  const chapter = getChapter(content, chapterId);
  const eventLog = [
    createEvent(content.defaultCampaignId, 1, "campaign.started", occurredAt, {
      campaignId: content.defaultCampaignId,
    }),
    createEvent(content.defaultCampaignId, 2, "chapter.started", occurredAt, {
      chapterId: chapter.id,
      sceneId: chapter.initialSceneId,
    }),
    createEvent(content.defaultCampaignId, 3, "scene.entered", occurredAt, {
      chapterId: chapter.id,
      sceneId: chapter.initialSceneId,
    }),
  ];

  return projectCampaign(content, eventLog);
}

export function runChoice(params: {
  content: PlatformContent;
  state: CampaignState;
  choiceIdOrIndex: string | number;
  occurredAt?: string;
}): CampaignState {
  const chapter = getChapter(params.content, params.state.currentChapterId);
  const scene = getScene(chapter, params.state.currentSceneId);
  const choice = getChoice(scene, params.choiceIdOrIndex);

  if (choice.action === "reset") {
    return resetCampaign(params.content, params.occurredAt);
  }

  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const events: GameEvent[] = [...params.state.eventLog];
  appendChoiceEvent(events, params.state.campaignId, occurredAt, chapter.id, scene.id, choice);

  if (choice.decisionId) {
    events.push(
      createEvent(params.state.campaignId, events.length + 1, "decision.submitted", occurredAt, {
        chapterId: chapter.id,
        sceneId: scene.id,
        choiceId: choice.id,
        decisionId: choice.decisionId,
        label: choice.label,
        effects: choice.effects ?? {},
      }),
    );
  }

  if (choice.unlockCodexEntryId) {
    events.push(
      createEvent(params.state.campaignId, events.length + 1, "codex.entry_unlocked", occurredAt, {
        entryId: choice.unlockCodexEntryId,
        chapterId: chapter.id,
      }),
    );
  }

  let nextState = projectCampaign(params.content, events);

  if (choice.generateArtifactId) {
    const artifact = generateArtifactRecord({
      content: params.content,
      state: nextState,
      artifactId: choice.generateArtifactId,
      occurredAt,
    });
    events.push(
      createEvent(params.state.campaignId, events.length + 1, "artifact.generated", occurredAt, {
        artifactId: choice.generateArtifactId,
        artifact,
      }),
    );
    nextState = projectCampaign(params.content, events);
  }

  if (choice.nextSceneId) {
    events.push(
      createEvent(params.state.campaignId, events.length + 1, "scene.entered", occurredAt, {
        chapterId: chapter.id,
        sceneId: choice.nextSceneId,
      }),
    );
    nextState = projectCampaign(params.content, events);
  }

  return nextState;
}

export function advanceToScene(params: {
  content: PlatformContent;
  state: CampaignState;
  sceneId: string;
  occurredAt?: string;
}): CampaignState {
  const chapter = getChapter(params.content, params.state.currentChapterId);
  getScene(chapter, params.sceneId);
  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const events = [
    ...params.state.eventLog,
    createEvent(params.state.campaignId, params.state.eventLog.length + 1, "scene.entered", occurredAt, {
      chapterId: chapter.id,
      sceneId: params.sceneId,
    }),
  ];

  return projectCampaign(params.content, events);
}

export function resetCampaign(content: PlatformContent, occurredAt = new Date().toISOString()): CampaignState {
  const initialState = createInitialCampaignState(content, undefined, occurredAt);
  return projectCampaign(content, [
    ...initialState.eventLog,
    createEvent(initialState.campaignId, initialState.eventLog.length + 1, "campaign.reset_completed", occurredAt, {
      campaignId: initialState.campaignId,
    }),
  ]);
}

function appendChoiceEvent(events: GameEvent[], campaignId: string, occurredAt: string, chapterId: string, sceneId: string, choice: SceneChoice) {
  events.push(
    createEvent(campaignId, events.length + 1, "choice.submitted", occurredAt, {
      chapterId,
      sceneId,
      choiceId: choice.id,
      label: choice.label,
      nextSceneId: choice.nextSceneId,
      action: choice.action,
      prediction: choice.setPrediction,
      decisionId: choice.decisionId,
      effects: choice.effects ?? {},
      systemMessage: getSystemMessage(choice, sceneId),
    }),
  );
}

export function createEvent(
  campaignId: string,
  sequence: number,
  type: GameEvent["type"],
  occurredAt: string,
  payload: Record<string, unknown>,
): GameEvent {
  return {
    id: `${campaignId}:event:${String(sequence).padStart(4, "0")}`,
    sequence,
    type,
    occurredAt,
    payload,
  };
}

export function interpolateLines(lines: string[], variables: Record<string, string>) {
  return lines.map((line) => line.replaceAll("{{prediction}}", variables.prediction ?? "..."));
}

export function getSystemMessage(choice: SceneChoice, fromSceneId: string) {
  if (choice.unlockCodexEntryId) {
    return "Память обновлена";
  }

  if (choice.nextSceneId === "context-reveal" || choice.nextSceneId === "context-plain") {
    return "Контекст открыт";
  }

  if (choice.nextSceneId === "origin-memory" || choice.nextSceneId === "cause-wrong") {
    return "Память недоступна";
  }

  if (choice.nextSceneId === "missing-correct" || choice.nextSceneId === "cause-correct") {
    return "Источник подтверждён";
  }

  if (choice.nextSceneId === "decision-correct") {
    return "Решение принято";
  }

  if (choice.nextSceneId === "decision-wrong") {
    return "Ответ приостановлен";
  }

  if (fromSceneId === "decision") {
    return "Решение получено";
  }

  return "Команда принята";
}
