# test_search_edge_cases.py
#
# Edge-case tests for search.ranked_search that complement test_search.py.
# Focuses on boundary conditions: empty inputs, case handling, result cap,
# data_type passthrough, and query / row edge cases.
# No database access — all tests use plain dicts as food rows.

import pytest
from app.search import ranked_search


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_rows(names: list[str], data_type: str | None = "sr_legacy_food") -> list[dict]:
    return [
        {"fdc_id": i + 1, "description": name, "data_type": data_type}
        for i, name in enumerate(names)
    ]


def make_row(fdc_id: int, name: str, data_type: str | None = "sr_legacy_food") -> dict:
    return {"fdc_id": fdc_id, "description": name, "data_type": data_type}


# ---------------------------------------------------------------------------
# Query length boundary
# ---------------------------------------------------------------------------

def test_single_char_query_returns_empty():
    """A query of exactly 1 character must return an empty list."""
    rows = make_rows(["Butter, unsalted", "Buttermilk"])
    assert ranked_search("b", rows) == []


def test_empty_query_returns_empty():
    """An empty string query must return an empty list."""
    rows = make_rows(["Butter, unsalted"])
    assert ranked_search("", rows) == []


def test_two_char_query_is_the_minimum():
    """A 2-character query is the minimum length that produces results."""
    rows = make_rows(["Butter, unsalted"])
    results = ranked_search("bu", rows)
    assert len(results) > 0


# ---------------------------------------------------------------------------
# Case insensitivity
# ---------------------------------------------------------------------------

def test_query_uppercase_matches_lowercase_description():
    """Query 'BUTTER' should match food named 'Butter, unsalted'."""
    rows = make_rows(["Butter, unsalted", "Buttermilk"])
    results = ranked_search("BUTTER", rows)
    names = [r["name"] for r in results]
    assert any("Butter" in n for n in names)


def test_query_mixed_case_matches():
    """Query 'BuTtEr' should match regardless of description case."""
    rows = make_rows(["Butter, salted"])
    results = ranked_search("BuTtEr", rows)
    assert len(results) == 1


def test_prefix_rank_is_case_insensitive():
    """'olive' prefix should rank 'Olive oil' before 'Extra-virgin olive oil'."""
    rows = make_rows(["Extra-virgin olive oil", "Olive oil"])
    results = ranked_search("olive", rows)
    names = [r["name"] for r in results]
    olive_idx  = next(i for i, n in enumerate(names) if n == "Olive oil")
    extra_idx  = next(i for i, n in enumerate(names) if n.startswith("Extra"))
    assert olive_idx < extra_idx


# ---------------------------------------------------------------------------
# Result cap (≤ 40)
# ---------------------------------------------------------------------------

def test_result_count_capped_at_40():
    """ranked_search must never return more than 40 results."""
    rows = make_rows([f"Chicken breast type {i}" for i in range(60)])
    results = ranked_search("chicken", rows)
    assert len(results) <= 40


def test_result_cap_keeps_prefix_matches_over_contains():
    """When capping at 40, prefix matches must survive over contains matches."""
    # 25 prefix matches + 25 contains matches = 50 total candidates
    prefix_rows = [{"fdc_id": i, "description": f"Butter type {i}", "data_type": "sr_legacy_food"}
                   for i in range(1, 26)]
    contains_rows = [{"fdc_id": i + 100, "description": f"Peanut butter {i}", "data_type": "sr_legacy_food"}
                     for i in range(1, 26)]
    results = ranked_search("butter", prefix_rows + contains_rows)
    assert len(results) == 40
    # The prefix matches should appear before the contains matches
    result_names = [r["name"] for r in results]
    first_contains_idx = next(
        (i for i, n in enumerate(result_names) if n.startswith("Peanut")),
        None,
    )
    last_prefix_idx = max(
        i for i, n in enumerate(result_names) if n.startswith("Butter")
    )
    if first_contains_idx is not None:
        assert last_prefix_idx < first_contains_idx


# ---------------------------------------------------------------------------
# No-match scenarios
# ---------------------------------------------------------------------------

def test_no_matching_rows_returns_empty():
    """If no food description contains the query, return an empty list."""
    rows = make_rows(["Chicken breast", "Olive oil", "Salt"])
    assert ranked_search("zucchini", rows) == []


def test_empty_food_rows_returns_empty():
    """An empty food list should produce an empty result regardless of query."""
    assert ranked_search("butter", []) == []


def test_row_not_containing_query_is_excluded():
    """Foods whose description does not contain the query must be filtered out."""
    rows = make_rows(["Chocolate", "Vanilla extract", "Butter"])
    results = ranked_search("choc", rows)
    names = [r["name"] for r in results]
    assert "Vanilla extract" not in names
    assert "Butter" not in names
    assert "Chocolate" in names


# ---------------------------------------------------------------------------
# data_type passthrough
# ---------------------------------------------------------------------------

def test_data_type_is_included_in_result():
    """Each result dict must include the data_type from the source row."""
    rows = [make_row(1, "Butter, unsalted", "sr_legacy_food")]
    results = ranked_search("butter", rows)
    assert len(results) == 1
    assert results[0]["data_type"] == "sr_legacy_food"


def test_data_type_none_passthrough():
    """A row with data_type=None should include None in the result."""
    rows = [make_row(1, "Butter, unsalted", None)]
    results = ranked_search("butter", rows)
    assert len(results) == 1
    assert results[0]["data_type"] is None


def test_multiple_data_types_preserved():
    """Different data_type values in different rows should each be preserved."""
    rows = [
        make_row(1, "Butter, salted",   "sr_legacy_food"),
        make_row(2, "Butter, unsalted", "foundation_food"),
    ]
    results = ranked_search("butter", rows)
    types = {r["data_type"] for r in results}
    assert "sr_legacy_food" in types
    assert "foundation_food" in types


# ---------------------------------------------------------------------------
# Alphabetical ordering within each priority bucket
# ---------------------------------------------------------------------------

def test_prefix_matches_sorted_alphabetically():
    """Prefix matches should appear in alphabetical order by lowered name."""
    rows = make_rows(["Butter, salted", "Butter, unsalted", "Buttermilk"])
    results = ranked_search("butter", rows)
    prefix_names = [r["name"] for r in results if r["name"].lower().startswith("butter")]
    assert prefix_names == sorted(prefix_names, key=str.lower)


def test_contains_matches_sorted_alphabetically():
    """Contains-only matches should appear in alphabetical order."""
    rows = make_rows([
        "Peanut butter, creamy",
        "Almond butter",
        "Cashew butter",
    ])
    results = ranked_search("butter", rows)
    names = [r["name"] for r in results]
    assert names == sorted(names, key=str.lower)


# ---------------------------------------------------------------------------
# Result dict shape
# ---------------------------------------------------------------------------

def test_result_contains_expected_keys():
    """Each result must contain exactly fdc_id, name, and data_type."""
    rows = [make_row(42, "Butter, salted")]
    results = ranked_search("butter", rows)
    assert len(results) == 1
    assert set(results[0].keys()) == {"fdc_id", "name", "data_type"}


def test_result_fdc_id_matches_source_row():
    """The fdc_id in the result must match the source row."""
    rows = [make_row(1097512, "Butter, unsalted")]
    results = ranked_search("butter", rows)
    assert results[0]["fdc_id"] == 1097512


def test_result_name_is_original_description():
    """The name in the result must be the original (non-lowercased) description."""
    rows = [make_row(1, "Butter, Unsalted")]
    results = ranked_search("butter", rows)
    assert results[0]["name"] == "Butter, Unsalted"
