# test_search.py
#
# Tests for the search ranking logic in search.py.
# All tests pass food data as plain dicts — no database needed.

import pytest
from app.search import ranked_search


# ---------------------------------------------------------------------------
# Helper — build a list of mock food rows
# ---------------------------------------------------------------------------

def make_rows(names: list[str]) -> list[dict]:
    """Create minimal food row dicts for a list of food names."""
    return [
        {"fdc_id": i + 1, "description": name, "data_type": "foundation_food"}
        for i, name in enumerate(names)
    ]


SAMPLE_FOODS = make_rows([
    "Butter, salted",
    "Butter, unsalted",
    "Buttermilk, fluid",
    "Peanut Butter, creamy",
    "Almond Butter",
    "Bread, white",
    "Bread, whole wheat",
    "Chocolate Chip Cookies",
    "Sugar, granulated white",
    "Chicken breast, raw",
])


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_prefix_match_ranks_first():
    """'but' — 'Butter' and 'Buttermilk' should come before 'Peanut Butter'."""
    results = ranked_search("but", SAMPLE_FOODS)
    names = [r["name"] for r in results]

    butter_idx = next(i for i, n in enumerate(names) if n.startswith("Butter"))
    peanut_idx = next(i for i, n in enumerate(names) if n == "Peanut Butter, creamy")

    assert butter_idx < peanut_idx, "Prefix matches should rank before contains matches"


def test_case_insensitive_search():
    """'BUTTER' should match 'Butter, salted' even though cases differ."""
    results = ranked_search("BUTTER", SAMPLE_FOODS)
    names = [r["name"] for r in results]

    assert any("Butter" in n for n in names), "Case-insensitive search failed"


def test_short_query_returns_empty():
    """A single-character query must return an empty list (≥ 2 chars required)."""
    assert ranked_search("b", SAMPLE_FOODS) == []
    assert ranked_search("", SAMPLE_FOODS) == []


def test_result_limit():
    """Results are capped at 40 even if the database has more matches."""
    # Create 60 foods all containing "food"
    big_list = make_rows([f"food item {i}" for i in range(60)])
    results = ranked_search("food", big_list)
    assert len(results) <= 40


def test_prefix_group_sorted_alphabetically():
    """Within the prefix-match group, results are sorted A→Z."""
    results = ranked_search("but", SAMPLE_FOODS)
    prefix_results = [r["name"] for r in results if r["name"].lower().startswith("but")]
    assert prefix_results == sorted(prefix_results, key=str.lower)


def test_contains_group_sorted_alphabetically():
    """Within the contains group, results are sorted A→Z."""
    results = ranked_search("but", SAMPLE_FOODS)
    contains_results = [
        r["name"] for r in results
        if not r["name"].lower().startswith("but") and "but" in r["name"].lower()
    ]
    assert contains_results == sorted(contains_results, key=str.lower)


def test_no_results_for_nonexistent_query():
    """A query that matches nothing should return an empty list."""
    results = ranked_search("zzzzz", SAMPLE_FOODS)
    assert results == []


def test_result_has_correct_keys():
    """Each result dict must have fdc_id and name."""
    results = ranked_search("bread", SAMPLE_FOODS)
    assert len(results) > 0
    for r in results:
        assert "fdc_id" in r
        assert "name" in r
