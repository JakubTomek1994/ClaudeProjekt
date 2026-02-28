import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UseAutosaveOptions {
  delay?: number;
  onSave: () => Promise<void>;
}

export function useAutosave({ delay = 2000, onSave }: UseAutosaveOptions) {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);

  // Keep ref updated
  onSaveRef.current = onSave;

  const markDirty = useCallback(() => {
    setIsDirty(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onSaveRef.current();
        setIsDirty(false);
        toast.success("Uloženo", { duration: 1500 });
      } catch {
        toast.error("Nepodařilo se uložit");
      } finally {
        setIsSaving(false);
      }
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isDirty, isSaving, markDirty };
}
