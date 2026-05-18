#!/usr/bin/env bash
# download_fdc.sh
#
# Downloads USDA FoodData Central CSV datasets and extracts them into the
# directories expected by backend/data/build_db_full.py:
#
#   backend/data/fdc/foundation/   (~30 MB extracted)
#   backend/data/fdc/survey/       (~100 MB extracted)
#   backend/data/fdc/sr_legacy/    (~50 MB extracted — for legacy fdc_id compat)
#   backend/data/fdc/branded/      (~2 GB extracted)
#
# Run from the repo root:
#   bash scripts/download_fdc.sh
#
# FDC data is published at: https://fdc.nal.usda.gov/download-foods.html
# Update the URLs below when USDA publishes a new release (typically April/October).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FDC_DIR="$SCRIPT_DIR/../backend/data/fdc"

# ── Update these URLs from https://fdc.nal.usda.gov/download-foods.html ──────
FOUNDATION_URL="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2024-10-31.zip"
SURVEY_URL="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_csv_2024-10-31.zip"
SR_LEGACY_URL="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip"
BRANDED_URL="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_branded_food_csv_2024-10-31.zip"
# ─────────────────────────────────────────────────────────────────────────────

check_tool() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' is required but not installed." >&2
    exit 1
  fi
}
check_tool curl
check_tool unzip

download_and_extract() {
  local url="$1"
  local dest_dir="$2"
  local zip_name
  zip_name="$(basename "$url")"
  local zip_path="/tmp/$zip_name"

  if [ -f "$dest_dir/food.csv" ]; then
    echo "  [skip] $dest_dir already populated."
    return 0
  fi

  mkdir -p "$dest_dir"
  echo "  Downloading $zip_name ..."
  curl -fSL --progress-bar "$url" -o "$zip_path"

  echo "  Extracting to $dest_dir ..."
  # FDC ZIPs contain a top-level directory; strip it with -j (junk paths)
  # and only extract CSV files.
  unzip -jo "$zip_path" "*.csv" -d "$dest_dir"

  rm -f "$zip_path"
  echo "  Done → $dest_dir"
}

echo "=== Downloading USDA FoodData Central datasets ==="
echo "Destination: $FDC_DIR"
echo ""

download_and_extract "$FOUNDATION_URL" "$FDC_DIR/foundation"
download_and_extract "$SURVEY_URL"     "$FDC_DIR/survey"
download_and_extract "$SR_LEGACY_URL"  "$FDC_DIR/sr_legacy"
download_and_extract "$BRANDED_URL"    "$FDC_DIR/branded"

echo ""
echo "=== Download complete ==="
echo ""
echo "Next step: docker-compose up --build"
echo "(The db-init service will build nutrition.db on first startup — allow 5-15 minutes.)"
