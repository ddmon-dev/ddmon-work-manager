import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "@/shared/hooks/use-click-outside";

interface ContextMenuPortalProps {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
  minWidth?: number;
  container?: HTMLElement | null;
}

export function ContextMenuPortal({
  x,
  y,
  onClose,
  children,
  minWidth = 160,
  container,
}: ContextMenuPortalProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // 뷰포트 경계 보정
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx =
      x + rect.width > window.innerWidth
        ? window.innerWidth - rect.width - 8
        : x;
    const ny =
      y + rect.height > window.innerHeight
        ? window.innerHeight - rect.height - 8
        : y;
    setPosition({ x: nx, y: ny });
  }, [x, y]);

  // 바깥 클릭 닫기
  useClickOutside(menuRef, onClose);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: position.x, top: position.y, minWidth }}
    >
      {children}
    </div>,
    container ?? document.body
  );
}
