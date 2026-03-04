import { createContext, use, useEffect, useState } from "react";
import { toast } from "sonner";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";

import type { Memo } from "./types";
import {
  fetchMemos,
  createMemo as apiCreate,
  updateMemo as apiUpdate,
  deleteMemo as apiDelete,
} from "./api";

interface MemoContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  memos: Memo[];
  isLoading: boolean;
  addMemo: (content: string) => Promise<void>;
  editMemo: (id: string, content: string) => Promise<void>;
  removeMemo: (id: string) => Promise<void>;
}

const MemoContext = createContext<MemoContextType | null>(null);

export function useMemoWidget() {
  const ctx = use(MemoContext);
  if (!ctx) throw new Error("useMemoWidget must be used within MemoProvider");
  return ctx;
}

export function MemoProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMemos = async () => {
    setIsLoading(true);
    try {
      const items = await fetchMemos();
      setMemos(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : CRUD_ERRORS.READ_FAILED("메모"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMemos();
    }
  }, [isOpen]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const addMemo = async (content: string) => {
    try {
      const created = await apiCreate(content);
      setMemos((prev) => [created, ...prev]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : CRUD_ERRORS.CREATE_FAILED("메모"));
    }
  };

  const editMemo = async (id: string, content: string) => {
    const snapshot = memos;
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m))
    );

    try {
      await apiUpdate(id, content);
    } catch {
      setMemos(snapshot);
      toast.error(CRUD_ERRORS.UPDATE_FAILED("메모"));
    }
  };

  const removeMemo = async (id: string) => {
    const snapshot = memos;
    setMemos((prev) => prev.filter((m) => m.id !== id));

    try {
      await apiDelete(id);
    } catch {
      setMemos(snapshot);
      toast.error(CRUD_ERRORS.DELETE_FAILED("메모"));
    }
  };

  return (
    <MemoContext.Provider
      value={{
        isOpen,
        open,
        close,
        memos,
        isLoading,
        addMemo,
        editMemo,
        removeMemo,
      }}
    >
      {children}
    </MemoContext.Provider>
  );
}
