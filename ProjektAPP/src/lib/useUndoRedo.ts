import { useCallback, useEffect, useRef, useState } from "react";

export interface UndoRedoAction {
  description: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
}

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const undoStack = useRef<UndoRedoAction[]>([]);
  const redoStack = useRef<UndoRedoAction[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isExecuting = useRef(false);

  const updateState = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const pushAction = useCallback(
    (action: UndoRedoAction) => {
      undoStack.current.push(action);
      if (undoStack.current.length > MAX_HISTORY) {
        undoStack.current.shift();
      }
      redoStack.current = [];
      updateState();
    },
    [updateState]
  );

  const undo = useCallback(async () => {
    if (isExecuting.current || undoStack.current.length === 0) return;
    isExecuting.current = true;
    const action = undoStack.current.pop()!;
    try {
      await action.undo();
      redoStack.current.push(action);
    } catch (err) {
      console.error("Undo failed:", err);
      undoStack.current.push(action);
    }
    isExecuting.current = false;
    updateState();
  }, [updateState]);

  const redo = useCallback(async () => {
    if (isExecuting.current || redoStack.current.length === 0) return;
    isExecuting.current = true;
    const action = redoStack.current.pop()!;
    try {
      await action.redo();
      undoStack.current.push(action);
    } catch (err) {
      console.error("Redo failed:", err);
      redoStack.current.push(action);
    }
    isExecuting.current = false;
    updateState();
  }, [updateState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;

      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return { pushAction, undo, redo, canUndo, canRedo };
}
