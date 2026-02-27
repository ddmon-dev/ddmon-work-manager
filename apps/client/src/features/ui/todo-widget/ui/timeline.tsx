import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/shared/utils/classnames";
import { useTodo } from "../context";
import { TimeBlock } from "./time-block";

const TOTAL_SLOTS = 48;
const SLOT_HEIGHT = 32; // px

function formatSlotTime(slot: number): string {
  const hours = Math.floor(slot / 2);
  return `${hours.toString().padStart(2, "0")}:00`;
}

function TimeSlot({ slot }: { slot: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slot}` });
  const isHour = slot % 2 === 0;

  return (
    <div
      ref={setNodeRef}
      style={{ height: SLOT_HEIGHT }}
      className={cn(
        "border-b border-dashed border-border/30 transition-colors",
        isHour && "border-solid border-border/50",
        isOver && "bg-primary/10"
      )}
    />
  );
}

export function Timeline() {
  const { timeBlocks } = useTodo();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sheet 열릴 때 현재 시간으로 스크롤
  useEffect(() => {
    const now = new Date();
    const currentSlot =
      now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0);
    const scrollTop = Math.max(0, (currentSlot - 2) * SLOT_HEIGHT);

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollTop;
    }
  }, []);

  return (
    <div ref={scrollRef} className="overflow-y-auto hide-scrollbar h-full">
      <div
        className="relative"
        style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
      >
        {/* 시간 슬롯 */}
        {Array.from({ length: TOTAL_SLOTS }, (_, slot) => (
          <div
            key={slot}
            className="flex absolute w-full"
            style={{ top: slot * SLOT_HEIGHT, height: SLOT_HEIGHT }}
          >
            {/* 시간 레이블 */}
            <div className="w-12 shrink-0 flex items-start justify-end pr-2">
              {slot % 2 === 0 && (
                <span className="text-[10px] text-muted-foreground leading-none -mt-1.5">
                  {formatSlotTime(slot)}
                </span>
              )}
            </div>

            {/* 드롭 영역 */}
            <div className="flex-1 relative">
              <TimeSlot slot={slot} />
            </div>
          </div>
        ))}

        {/* 배치된 블록들 */}
        <div className="absolute top-0 bottom-0 left-12 right-2">
          {timeBlocks.map((block) => (
            <TimeBlock key={block.id} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}
