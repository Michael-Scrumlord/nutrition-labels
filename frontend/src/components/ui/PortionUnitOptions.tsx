// ui/PortionUnitOptions.tsx
//
// Shared <optgroup> content for the unit/portion picker used in both
// IngredientRow (existing row editing) and AddForm (adding a new ingredient).
// Must be rendered as a direct child of a <select> element.

import { UNIT_LABELS } from "../../types";
import type { PortionSize, UnitKey } from "../../types";

const UNIT_KEYS = Object.keys(UNIT_LABELS) as UnitKey[];

interface PortionUnitOptionsProps {
  portions: PortionSize[];
}

export function PortionUnitOptions({ portions }: PortionUnitOptionsProps) {
  return (
    <>
      {portions.length > 0 && (
        <optgroup label="Food portions">
          {portions.map((p) => (
            <option key={`portion-${p.modifier}`} value={`portion:${p.modifier}`}>
              {p.modifier}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label={portions.length > 0 ? "Standard units" : undefined}>
        {UNIT_KEYS.map((u) => (
          <option key={`unit-${u}`} value={`unit:${u}`}>{u}</option>
        ))}
      </optgroup>
    </>
  );
}
