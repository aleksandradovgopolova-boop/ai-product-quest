import type { ArtifactRecord, ArtifactTemplate, CampaignState, PlatformContent } from "@/src/domain/campaign/types";

export function generateArtifactRecord(params: {
  content: PlatformContent;
  state: CampaignState;
  artifactId: string;
  occurredAt: string;
}): ArtifactRecord {
  const template = params.content.artifactTemplateById[params.artifactId];

  if (!template) {
    throw new Error(`Unknown artifact template: ${params.artifactId}`);
  }

  return {
    id: `${template.id}:${params.state.campaignId}`,
    templateId: template.id,
    chapterId: template.chapterId,
    title: template.title,
    body: renderArtifactBody(template, params.state),
    createdAt: params.occurredAt,
  };
}

function renderArtifactBody(template: ArtifactTemplate, state: CampaignState) {
  const decision = Object.values(state.decisions).at(-1);
  const decisionText = decision ? decision.label : "Решение ещё не принято.";
  const sourceStatus = state.systemState.observability >= 40 ? "Трассировка источников требуется как часть продукта." : "След источников отсутствует.";

  return template.sections
    .map((section) => {
      switch (section.id) {
        case "problem":
          return `## ${section.title}\nКорпоративный отчёт содержит факты без подтверждённых внутренних источников.`;
        case "model":
          return `## ${section.title}\nЯзыковая модель продолжает входной текст и не проверяет реальность сама по себе.`;
        case "context":
          return `## ${section.title}\n${sourceStatus}`;
        case "decision":
          return `## ${section.title}\n${decisionText}`;
        case "risks":
          return `## ${section.title}\nНельзя выпускать уверенный ответ без видимого следа источников, проверки и ответственности продукта.`;
        default:
          return `## ${section.title}\nЗафиксировано системой.`;
      }
    })
    .join("\n\n");
}
