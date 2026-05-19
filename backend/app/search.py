# search.py
#
# Ranking logic for food search results.
# Takes raw FTS5 rows from database.py and re-ranks so that prefix matches
# come before contains matches, alphabetical within each group.
# No database access, no math, no PDF.


def ranked_search(query: str, food_rows: list) -> list[dict]:
    """
    Re-rank FTS5 results so prefix matches come first (alphabetically),
    then contains matches (alphabetically). Returns at most 40 results.

    FTS5 already returns the most relevant 200 results by BM25; this step
    biases toward names that *start* with the query, which is what users
    expect when they type "tom" and want "Tomato, red, ripe" before
    "Salad dressing, bacon and tomato".
    """
    if len(query) < 2:
        return []

    q = query.lower()
    buckets: list[tuple] = []

    for row in food_rows:
        name: str = row["description"]
        name_lower = name.lower()

        # 0 = prefix match (higher priority), 1 = contains match
        prefix_rank = 0 if name_lower.startswith(q) else 1

        result = {
            "fdc_id":    row["fdc_id"],
            "name":      name,
            "data_type": row["data_type"],
        }
        buckets.append((prefix_rank, name_lower, result))

    buckets.sort(key=lambda x: (x[0], x[1]))
    return [b[2] for b in buckets][:40]
