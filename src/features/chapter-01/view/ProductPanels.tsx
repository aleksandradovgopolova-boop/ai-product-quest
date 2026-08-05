import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import type {
  Chapter01SystemMetrics,
  ProductComponentKind,
  ProductOption,
  ProductRun,
  ProductTestResult,
  SceneCapabilityStep,
} from "@/src/domain/campaign/types";

const bandLabels: Record<ProductTestResult["band"], string> = {
  served: "СРАБОТАЛО",
  partial: "НАПОЛОВИНУ",
  unserved: "НЕ СРАБОТАЛО",
  unbounded: "БЕЗ СПРОСА",
};

export const componentLabels: Record<ProductComponentKind, string> = {
  problem: "Проблема",
  outcome: "Результат",
  modelRole: "Роль модели",
  context: "Контекст",
  tools: "Инструменты",
  boundaries: "Границы",
};

/**
 * The six numbers the player is shown. They arrive already projected: this component never sees
 * the twelve-field system state and cannot invent a seventh axis.
 */
export function MetricsReadout({ metrics }: { metrics: Chapter01SystemMetrics }) {
  return (
    <div className="product-metrics" aria-label="Показатели продукта">
      {metrics.metrics.map((metric) => (
        <div className="product-metric" key={metric.key}>
          <span className="product-metric-label">{metric.label}</span>
          <span className="product-metric-bar" aria-hidden="true">
            <i style={{ width: `${metric.value}%` }} />
          </span>
          <strong className="product-metric-value">{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

/** One question of the build: a list to pick from, and — for context — what it costs. */
export function BuildStep({
  step,
  options,
  selected,
  spent,
  onToggle,
  onConfirm,
  shouldReduceMotion,
}: {
  step: SceneCapabilityStep;
  options: ProductOption[];
  selected: string[];
  spent: number;
  onToggle: (optionId: string) => void;
  onConfirm: () => void;
  shouldReduceMotion: boolean;
}) {
  const overBudget = Boolean(step.budget && spent > step.budget.limit);
  const canConfirm = selected.length >= (step.minSelected ?? 1);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="product-step"
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      key={step.target}
      transition={{ duration: shouldReduceMotion ? 0.01 : 0.28 }}
    >
      <div className="product-step-head">
        <span className="flow-command-label">{step.prompt}</span>
        {step.budget ? (
          <span className={cn("product-budget", overBudget && "product-budget-over")}>
            {step.budget.label}: {spent} / {step.budget.limit}
            {overBudget ? " — перегруз" : ""}
          </span>
        ) : null}
      </div>

      <div className="product-options" role={step.select === "many" ? "group" : "radiogroup"}>
        {options.map((option) => {
          const isSelected = selected.includes(option.id);

          return (
            <button
              aria-checked={isSelected}
              className={cn("product-option", isSelected && "product-option-selected")}
              key={option.id}
              onClick={() => onToggle(option.id)}
              role={step.select === "many" ? "checkbox" : "radio"}
              type="button"
            >
              <span className="product-option-mark" aria-hidden="true">
                {isSelected ? "×" : ""}
              </span>
              <span className="product-option-label">
                {option.label}
                {option.note ? <em>{option.note}</em> : null}
              </span>
              {option.cost ? <span className="product-option-cost">{option.cost}</span> : null}
            </button>
          );
        })}
      </div>

      <button className="product-confirm" disabled={!canConfirm} onClick={onConfirm} type="button">
        {step.confirmLabel ?? "Дальше"}
      </button>
    </motion.div>
  );
}

/**
 * Three runs of the product, each read as four lines: what the person wanted, what the product
 * did, what they got, and which component is responsible. No verdict, no "try again".
 */
export function TestResults({ run, previous }: { run: ProductRun; previous?: ProductRun }) {
  return (
    <div className="product-results" aria-label="Прогон сценариев">
      {run.results.map((result) => {
        const before = previous?.results.find((candidate) => candidate.scenarioId === result.scenarioId);
        const changed = before && before.band !== result.band;

        return (
          <article className={cn("product-result", `product-result-${result.band}`)} key={result.scenarioId}>
            <header>
              <strong>{result.title}</strong>
              <span className="product-band">
                {changed ? `${bandLabels[before.band]} → ` : ""}
                {bandLabels[result.band]}
              </span>
            </header>
            <dl>
              <dt>Хотел</dt>
              <dd>{result.wanted}</dd>
              <dt>Продукт</dt>
              <dd>{result.did}</dd>
              <dt>Человек получил</dt>
              <dd>{result.got}</dd>
            </dl>
            <footer className="product-attribution">
              {result.attribution.carried.length > 0 ? (
                <span>
                  Сработало за счёт: {result.attribution.carried.map((reference) => reference.label).join(", ")}
                </span>
              ) : null}
              {result.attribution.missing.length > 0 ? (
                <span className="product-attribution-missing">
                  Не хватило: {result.attribution.missing.map((reference) => reference.label).join(", ")}
                </span>
              ) : null}
            </footer>
          </article>
        );
      })}
    </div>
  );
}

/** The rebuild: a fixed allowance of changes, spent one component at a time. */
export function RebuildPanel({
  components,
  openComponent,
  options,
  selected,
  changesUsed,
  maxChanges,
  onOpenComponent,
  onToggle,
  onApply,
  onConfirm,
  confirmLabel,
}: {
  components: Array<{ component: ProductComponentKind; current: string }>;
  openComponent?: ProductComponentKind;
  options: ProductOption[];
  selected: string[];
  changesUsed: number;
  maxChanges: number;
  onOpenComponent: (component?: ProductComponentKind) => void;
  onToggle: (optionId: string) => void;
  onApply: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  const spent = changesUsed >= maxChanges;

  return (
    <div className="product-rebuild" aria-label="Пересборка">
      <div className="product-step-head">
        <span className="flow-command-label">Что меняем</span>
        <span className={cn("product-budget", spent && "product-budget-over")}>
          изменений: {changesUsed} / {maxChanges}
        </span>
      </div>

      <div className="product-components">
        {components.map(({ component, current }) => (
          <button
            aria-expanded={openComponent === component}
            className={cn("product-component", openComponent === component && "product-component-open")}
            disabled={spent}
            key={component}
            onClick={() => onOpenComponent(openComponent === component ? undefined : component)}
            type="button"
          >
            <span className="product-component-name">{componentLabels[component]}</span>
            <span className="product-component-current">{current}</span>
          </button>
        ))}
      </div>

      {openComponent && !spent ? (
        <div className="product-options">
          {options.map((option) => (
            <button
              aria-checked={selected.includes(option.id)}
              className={cn("product-option", selected.includes(option.id) && "product-option-selected")}
              key={option.id}
              onClick={() => onToggle(option.id)}
              role="checkbox"
              type="button"
            >
              <span className="product-option-mark" aria-hidden="true">
                {selected.includes(option.id) ? "×" : ""}
              </span>
              <span className="product-option-label">{option.label}</span>
              {option.cost ? <span className="product-option-cost">{option.cost}</span> : null}
            </button>
          ))}
          <button className="product-confirm" disabled={selected.length === 0} onClick={onApply} type="button">
            Применить изменение
          </button>
        </div>
      ) : null}

      <button className="product-confirm product-confirm-final" onClick={onConfirm} type="button">
        {confirmLabel}
      </button>
    </div>
  );
}
