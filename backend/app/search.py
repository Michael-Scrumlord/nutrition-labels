# search.py
#
# Ranking logic for food search results.
# Takes raw FTS5 rows from database.py and re-ranks by data quality tier,
# then by prefix-match, then alphabetically.
# No database access, no math, no PDF.

# Lower tier = shown first.
# Foundation and FNDDS have the best analytical quality and cleanest names.
# Branded foods are surfaced last so generic queries return real food first.
_DATA_TYPE_TIER: dict[str, int] = {
    "foundation_food":  0,
    "survey_fndds_food": 0,
    "sr_legacy_food":   1,
    "branded_food":     2,
}


def ranked_search(query: str, food_rows: list) -> list[dict]:
    """
    Re-rank FTS5 results so that:
      1. Foundation / FNDDS prefix matches come first (alphabetically within group)
      2. Foundation / FNDDS contains matches
      3. Branded prefix matches
      4. Branded contains matches

    FTS5 already returns the most relevant 200 results by BM25; this step
    promotes higher-quality foods to the top without discarding branded results.
    Returns at most 40 results.
    """
    if len(query) < 2:
        return []

    q = query.lower()
    buckets: list[tuple] = []

    for row in food_rows:
        name: str = row["description"]
        name_lower = name.lower()
        tier = _DATA_TYPE_TIER.get(row["data_type"] or "", 2)

        # 0 = prefix match (higher priority), 1 = contains match
        prefix_rank = 0 if name_lower.startswith(q) else 1

        brand_owner = row["brand_owner"] or None
        brand_name = row["brand_name"] or None

        result = {
            "fdc_id":      row["fdc_id"],
            "name":        name,
            "brand_owner": brand_owner,
            "data_type":   row["data_type"],
        }
        buckets.append((tier, prefix_rank, name_lower, result))

    buckets.sort(key=lambda x: (x[0], x[1], x[2]))
    return [b[3] for b in buckets][:40]
