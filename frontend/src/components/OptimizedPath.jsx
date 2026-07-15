import React from "react";
import { ChevronRight } from "lucide-react";
import { C } from "../constants/theme";

export default function OptimizedPath({ title, desc, icon: Icon }) {
  return (
    <button
      className="w-full rounded-xl p-4 text-left transition-all group relative overflow-hidden border shadow-sm hover:shadow-md"
      style={{ background: C.surfaceContainerLowest, borderColor: "rgba(197,197,211,0.3)" }}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h5 className="text-sm font-semibold flex items-center gap-2" style={{ color: C.onSurface }}>
            {title}
            <Icon size={16} style={{ color: C.tertiaryContainer }} />
          </h5>
          <p className="text-xs mt-1" style={{ color: C.onSurfaceVariant }}>
            {desc}
          </p>
        </div>
        <ChevronRight size={16} style={{ color: C.outlineVariant }} />
      </div>
    </button>
  );
}
