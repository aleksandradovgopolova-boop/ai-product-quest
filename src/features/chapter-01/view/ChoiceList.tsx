import { motion } from "motion/react";
import type { SceneChoice } from "@/src/domain/campaign/types";
import { cn } from "@/src/lib/utils";

export function ChoiceList({
  activeChoiceIndex,
  commandLabel = "РЕШЕНИЕ",
  choices,
  onChoice,
  onFocusChoice,
  shouldReduceMotion,
}: {
  activeChoiceIndex: number;
  commandLabel?: string;
  choices: SceneChoice[];
  onChoice: (choice: SceneChoice) => void;
  onFocusChoice: (index: number) => void;
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.div
      animate="show"
      aria-label="Действия"
      className="flow-choices"
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
      initial="hidden"
      key="choices"
      variants={{
        hidden: {},
        show: {
          transition: {
            delayChildren: shouldReduceMotion ? 0 : 0.16,
            staggerChildren: shouldReduceMotion ? 0 : 0.045,
          },
        },
      }}
    >
      <span className="flow-command-label">{commandLabel}</span>
      {choices.map((choice, index) => (
        <motion.button
          aria-current={activeChoiceIndex === index ? "true" : undefined}
          className={cn(
            "flow-choice",
            activeChoiceIndex === index && "flow-choice-active",
            choice.tone === "primary" && "flow-choice-primary",
            choice.tone === "quiet" && "flow-choice-quiet",
          )}
          key={choice.id}
          onClick={() => onChoice(choice)}
          onFocus={() => onFocusChoice(index)}
          onMouseEnter={() => onFocusChoice(index)}
          type="button"
          variants={{
            hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
            show: { opacity: 1, y: 0, transition: { duration: shouldReduceMotion ? 0.01 : 0.25 } },
          }}
        >
          <span className="choice-pointer" aria-hidden="true">
            &gt;
          </span>
          <span className="choice-index">[{index + 1}]</span>
          <span className="choice-label">{choice.label}</span>
          <span className="choice-arrow" aria-hidden="true">
            &gt;
          </span>
        </motion.button>
      ))}
    </motion.div>
  );
}
