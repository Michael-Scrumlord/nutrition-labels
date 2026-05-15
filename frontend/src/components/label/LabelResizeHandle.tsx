// label/LabelResizeHandle.tsx
//
// Drag handle in the bottom-right corner of the label preview.
// Dragging it horizontally changes the label width.

import { GripVertical } from "lucide-react";
import { useLabelResize } from "../../hooks/useLabelResize";

export function LabelResizeHandle() {
  const { onMouseDown } = useLabelResize();

  return (
    <div
      onMouseDown={onMouseDown}
      title="Drag to resize label width"
      className="absolute bottom-2 right-2 text-text-tertiary hover:text-accent transition-colors duration-150 cursor-se-resize opacity-40 hover:opacity-100"
    >
      <GripVertical size={16} />
    </div>
  );
}
