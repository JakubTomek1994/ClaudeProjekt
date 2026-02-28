"use client";

import type { PhaseConfig } from "@/lib/constants";
import { PHASE_COLUMN_WIDTH } from "@/lib/constants";

interface PhaseColumnProps {
  phase: PhaseConfig;
  index: number;
  onAddNode: (phase: PhaseConfig) => void;
}

export function PhaseColumn({ phase, index, onAddNode }: PhaseColumnProps) {
  const x = index * (PHASE_COLUMN_WIDTH + 70);

  return (
    <div
      className={`absolute rounded-lg border p-2 ${phase.borderColor} ${phase.bgColor} opacity-20`}
      style={{
        left: x,
        top: 0,
        width: PHASE_COLUMN_WIDTH,
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${phase.color}`}>
          {phase.label}
        </span>
      </div>
    </div>
  );
}

export function PhaseHeaders({
  onAddNode,
}: {
  onAddNode: (phase: PhaseConfig) => void;
}) {
  return null;
}
