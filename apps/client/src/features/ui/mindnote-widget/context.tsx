import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";

import type { Mindnote } from "./types";
import {
  fetchMindnotes,
  createMindnote as apiCreate,
  updateMindnote as apiUpdate,
  deleteMindnote as apiDelete,
} from "./api";

interface MindnoteContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  mindnotes: Mindnote[];
  isLoading: boolean;
  addMindnote: (content: string) => Promise<void>;
  editMindnote: (id: string, content: string) => Promise<void>;
  removeMindnote: (id: string) => Promise<void>;
}

const MindnoteContext = createContext<MindnoteContextType | null>(null);

export function useMindnote() {
  const ctx = useContext(MindnoteContext);
  if (!ctx) throw new Error("useMindnote must be used within MindnoteProvider");
  return ctx;
}

export function MindnoteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mindnotes, setMindnotes] = useState<Mindnote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMindnotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchMindnotes();
      setMindnotes(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : CRUD_ERRORS.READ_FAILED("마인드노트"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMindnotes();
    }
  }, [isOpen, loadMindnotes]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const addMindnote = useCallback(async (content: string) => {
    try {
      const created = await apiCreate(content);
      setMindnotes((prev) => [created, ...prev]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : CRUD_ERRORS.CREATE_FAILED("마인드노트"));
    }
  }, []);

  const editMindnote = useCallback(async (id: string, content: string) => {
    const snapshot = mindnotes;
    setMindnotes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m))
    );

    try {
      await apiUpdate(id, content);
    } catch {
      setMindnotes(snapshot);
      toast.error(CRUD_ERRORS.UPDATE_FAILED("마인드노트"));
    }
  }, [mindnotes]);

  const removeMindnote = useCallback(async (id: string) => {
    const snapshot = mindnotes;
    setMindnotes((prev) => prev.filter((m) => m.id !== id));

    try {
      await apiDelete(id);
    } catch {
      setMindnotes(snapshot);
      toast.error(CRUD_ERRORS.DELETE_FAILED("마인드노트"));
    }
  }, [mindnotes]);

  return (
    <MindnoteContext.Provider
      value={{
        isOpen,
        open,
        close,
        mindnotes,
        isLoading,
        addMindnote,
        editMindnote,
        removeMindnote,
      }}
    >
      {children}
    </MindnoteContext.Provider>
  );
}
