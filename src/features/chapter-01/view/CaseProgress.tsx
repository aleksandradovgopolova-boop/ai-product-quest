import { cn } from "@/src/lib/utils";

export function CaseProgress({ current, steps }: { current: number; steps: string[] }) {
  const currentStep = steps[current - 1] ?? steps[0] ?? "Дело";

  return (
    <div className="system-progress" aria-label={`Ход дела: ${currentStep}, этап ${current} из ${steps.length}`}>
      <div className="case-progress-meta">
        <strong>{currentStep}</strong>
        <em>{current} из {steps.length}</em>
      </div>
      <div className="progress-track">
        {steps.map((label, index) => {
          const step = index + 1;
          const completed = step < current;
          const active = step === current;

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
