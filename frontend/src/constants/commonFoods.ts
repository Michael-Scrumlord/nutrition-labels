import type { SavedFood } from "../types";

// fdc_ids must match nutrition.db, which is built from the USDA SR Legacy dataset
// (backend/data/build_db_full.py). These are the canonical SR Legacy fdc_ids.
// The display name is a friendly shorthand — the API returns the full USDA description.
export const COMMON_FOODS: SavedFood[] = [
  { fdc_id: 173430, name: "Butter, unsalted"            },
  { fdc_id: 171287, name: "Eggs, whole, raw"            },
  { fdc_id: 169655, name: "Sugar, granulated"           },
  { fdc_id: 168894, name: "All-purpose flour, white"    },
  { fdc_id: 171265, name: "Whole milk"                  },
  { fdc_id: 173418, name: "Cream cheese"                },
  { fdc_id: 169640, name: "Honey"                       },
  { fdc_id: 172804, name: "Baking powder"               },
  { fdc_id: 173468, name: "Salt, table"                 },
  { fdc_id: 173471, name: "Vanilla extract"             },
  { fdc_id: 171413, name: "Olive oil"                   },
  { fdc_id: 171509, name: "Chicken breast, raw"         },
  { fdc_id: 174036, name: "Ground beef, 80% lean, raw"  },
  { fdc_id: 169593, name: "Cocoa powder, unsweetened"   },
  { fdc_id: 167976, name: "Chocolate, semi-sweet"       },
];
