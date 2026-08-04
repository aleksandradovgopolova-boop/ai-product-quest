import { renderBlueprintSection } from "@/src/engines/artifact/assistantBlueprint";
import { getChapter } from "@/src/domain/campaign/lookup";
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
    body: renderArtifactBody(template, params.content, params.state),
    createdAt: params.occurredAt,
  };
}

/**
 * The Blueprint is a projection of what the player built, not prose written in advance. Each
 * section reads the product as it stands; a section with nothing behind it says so instead of
 * inventing content.
 */
function renderArtifactBody(template: ArtifactTemplate, content: PlatformContent, state: CampaignState) {
  const chapter = getChapter(content, template.chapterId);

  return template.sections
    .map((section) => {
      const body = renderBlueprintSection({ sectionId: section.id, content, chapter, state });
      return `## ${section.title}\n${body}`;
    })
    .join("\n\n");
}
