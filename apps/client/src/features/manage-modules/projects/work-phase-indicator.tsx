import { cn } from "@/shared/utils/classnames";
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
  const currentIndex = PHASES.indexOf(workPhase);

  const handleClick = async (phase: WorkPhase) => {
    if (readonly || phase === workPhase) return;
    await updateStatus.mutateAsync({ id: projectId, workPhase: phase });
  };

  return (
    <div className="flex items-center gap-1">
      {PHASES.map((phase, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <button
            key={phase}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(phase)}
            className={cn(
              "text-xs px-2 py-0.5 rounded-sm transition-colors",
              isCurrent && "bg-primary text-primary-foreground font-semibold",
              isCompleted && "bg-primary/20 text-primary",
              !isCurrent && !isCompleted && "bg-muted text-muted-foreground",
              !readonly && "cursor-pointer hover:opacity-80",
              readonly && "cursor-default"
            )}
            title={WORK_PHASE_LABELS[phase]}
          >
            {WORK_PHASE_LABELS[phase]}
          </button>
        );
      })}
    </div>
  );
}
