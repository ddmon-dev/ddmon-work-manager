import { Fragment } from "react";
import { useUpdateProjectStatus } from "./api";
import { WORK_PHASE_LABELS } from "./config";
import type { WorkPhase } from "./types";

const PHASES: WorkPhase[] = ["preparing", "working", "reviewing", "delivered"];

interface WorkPhaseIndicatorProps {
  projectId: string;
  workPhase: WorkPhase;
  readonly?: boolean;
}

export function WorkPhaseIndicator({
  projectId,
  workPhase,
  readonly = false,
}: WorkPhaseIndicatorProps) {
  const updateStatus = useUpdateProjectStatus();

  async function handleClick(phase: WorkPhase) {
    if (readonly || phase === workPhase) return;
    await updateStatus.mutateAsync({ id: projectId, workPhase: phase });
  }

  return (
    <div className="flex items-center">
      {PHASES.map((phase, i) => (
        <Fragment key={phase}>
          {i > 0 && <div className="w-1.5 h-px bg-destructive/50" />}
          {phase === workPhase ? (
            <span className="inline-flex items-center justify-center rounded-full bg-destructive-light text-destructive-light-foreground min-w-[60px] px-2.5 py-1 text-xs font-medium whitespace-nowrap">
              {WORK_PHASE_LABELS[phase]}
            </span>
          ) : !readonly ? (
            <button
              type="button"
              onClick={() => handleClick(phase)}
              className="inline-flex items-center justify-center size-6 rounded-full border border-destructive/50 text-xs text-destructive-light-foreground/80 hover:border-destructive/70 hover:text-destructive-light-foreground cursor-pointer"
            >
              {i + 1}
            </button>
          ) : (
            <span className="inline-flex items-center justify-center size-6 rounded-full border border-destructive/50 text-xs text-destructive-light-foreground/80">
              {i + 1}
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
