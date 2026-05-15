# search.py
#
# Ranking logic for food search results.
# Takes a raw list of food rows from the database and sorts by relevance.
# No database access, no math, no PDF.


def ranked_search(query: str, food_rows: list) -> list[dict]:
    """
    Sort results so that foods whose name *starts with* the query come first,
    then foods whose name *contains* the query. Within each group, sort alphabetically.
    Return at most 40 results.

    Example — query "but":
      Group 1 (prefix): "Butter, salted", "Butter, unsalted", "Buttermilk"
      Group 2 (contains): "Almond Butter", "Peanut Butter, creamy"
    """
    if len(query) < 2:
        return []

    q = query.lower()
    prefix_matches = []
    contains_matches = []

    for row in food_rows:
        name = row["description"]
        name_lower = name.lower()

        if name_lower.startswith(q):
            prefix_matches.append({"fdc_id": row["fdc_id"], "name": name})
        elif q in name_lower:
            contains_matches.append({"fdc_id": row["fdc_id"], "name": name})

    prefix_matches.sort(key=lambda x: x["name"].lower())
    contains_matches.sort(key=lambda x: x["name"].lower())

    return (prefix_matches + contains_matches)[:40]
