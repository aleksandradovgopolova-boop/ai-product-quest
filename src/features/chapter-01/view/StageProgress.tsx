import { cn } from "@/src/lib/utils";

export function StageProgress({ current, stages }: { current: number; stages: string[] }) {
  const currentStage = stages[current - 1] ?? stages[0] ?? "Создать";

  return (
    <div className="system-progress" aria-label={`Стадия: ${currentStage}, ${current} из ${stages.length}`}>
      <div className="case-progress-meta">
        <strong>{currentStage}</strong>
        <em>{current} из {stages.length}</em>
      </div>
      <div className="progress-track">
        {stages.map((label, index) => {
          const stage = index + 1;
          const completed = stage < current;
          const active = stage === current;

          return (
            <div className={cn("progress-node", completed && "progress-node-complete", active && "progress-node-active")} key={label}>
              <i />
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
