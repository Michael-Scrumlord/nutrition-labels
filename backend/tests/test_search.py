# test_search.py
#
# Tests for the search ranking logic in search.py.
# All tests pass food data as plain dicts — no database needed.

import pytest
from app.search import ranked_search


# ---------------------------------------------------------------------------
# Helper — build a list of mock food rows
# ---------------------------------------------------------------------------

def make_rows(names: list[str], data_type: str | None = "sr_legacy_food") -> list[dict]:
    """Create minimal food row dicts for a list of food names.
    Includes data_type because ranked_search reads row["data_type"].
    """
    return [
        {"fdc_id": i + 1, "description": name, "data_type": data_type}
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


def test_no_results_when_database_returns_nothing():
    """ranked_search re-ranks DB results but does not filter them itself.
    When the FTS5 layer returns no rows (empty list), the result is empty."""
    results = ranked_search("zzzzz", [])
    assert results == []


def test_result_has_correct_keys():
    """Each result dict must have fdc_id, name, and data_type."""
    results = ranked_search("bread", SAMPLE_FOODS)
    assert len(results) > 0
    for r in results:
        assert "fdc_id" in r
        assert "name" in r
        assert "data_type" in r


def test_data_type_passthrough():
    """data_type from the input row must appear unchanged in the result."""
    rows = make_rows(["Butter, salted"], data_type="foundation_food")
    results = ranked_search("but", rows)
    assert len(results) == 1
    assert results[0]["data_type"] == "foundation_food"


def test_data_type_none_passthrough():
    """data_type=None must be preserved in the result without error."""
    rows = make_rows(["Mystery Food"], data_type=None)
    results = ranked_search("mys", rows)
    assert len(results) == 1
    assert results[0]["data_type"] is None


def test_exactly_two_char_query_returns_results():
    """A two-character query is the minimum that triggers search."""
    results = ranked_search("bu", SAMPLE_FOODS)
    assert len(results) > 0


def test_empty_food_list_returns_empty():
    """An empty food list should return an empty list for any query."""
    assert ranked_search("butter", []) == []


def test_all_prefix_matches_come_before_all_contains_matches():
    """Every prefix-match result should rank before every contains-match result."""
    results = ranked_search("but", SAMPLE_FOODS)
    names = [r["name"] for r in results]
    prefix_indices   = [i for i, n in enumerate(names) if n.lower().startswith("but")]
    contains_indices = [i for i, n in enumerate(names) if not n.lower().startswith("but")]
    if prefix_indices and contains_indices:
        assert max(prefix_indices) < min(contains_indices)


def test_result_count_does_not_exceed_input_size():
    """Result count must never exceed the number of input rows."""
    small_list = make_rows(["Butter, salted", "Bread, white"])
    results = ranked_search("b", small_list)  # single char → empty
    assert len(results) == 0

    results = ranked_search("bu", small_list)
    assert len(results) <= len(small_list)


def test_query_with_spaces_still_searches():
    """A multi-word query should still return matching results."""
    rows = make_rows(["Chicken breast, raw", "Chicken thigh, raw", "Bread, white"])
    results = ranked_search("chicken breast", rows)
    # ranked_search does a simple lowercase startswith/contains check per row
    names = [r["name"] for r in results]
    assert any("Chicken breast" in n for n in names)
