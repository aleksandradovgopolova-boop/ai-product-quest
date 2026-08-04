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

/**
 * The Blueprint is a projection of what the player decided, not prose written in advance.
 * Each section reads the variable its decision recorded; a section with nothing behind it
 * says so instead of inventing content.
 */
const sectionVariables: Record<string, string> = {
  user: "user",
  problem: "problem",
  outcome: "outcome",
  model: "modelRole",
  context: "context",
  tools: "tools",
  boundaries: "boundaries",
  verification: "verification",
  "first-version": "firstVersion",
  weaknesses: "weaknesses",
  revisions: "revisions",
  tradeoffs: "tradeoffs",
};

const pendingText = "Решение ещё не принято.";

function renderArtifactBody(template: ArtifactTemplate, state: CampaignState) {
  const lastDecision = Object.values(state.decisions).at(-1);

  return template.sections
    .map((section) => {
      const recorded = state.variables[sectionVariables[section.id] ?? section.id];

      if (recorded) {
        return `## ${section.title}\n${recorded}`;
      }

      if (section.id === "first-version" && lastDecision) {
        return `## ${section.title}\n${lastDecision.label}`;
      }

      return `## ${section.title}\n${pendingText}`;
    })
    .join("\n\n");
}
