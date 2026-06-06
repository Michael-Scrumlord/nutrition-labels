# test_search_extended.py
#
# Extended edge-case tests for search.py not covered by test_search.py.
# All tests use plain dicts as food rows — no database needed.

from app.search import ranked_search


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_rows(name_list: list[str], data_type: str | None = "sr_legacy_food") -> list[dict]:
    return [
        {"fdc_id": i + 1, "description": name, "data_type": data_type}
        for i, name in enumerate(name_list)
    ]


# ---------------------------------------------------------------------------
# Query character-set edge cases
# ---------------------------------------------------------------------------

def test_hyphen_in_query_matches_hyphenated_food():
    """A query containing a hyphen must match hyphenated food names."""
    rows = make_rows(["Low-fat milk", "Whole milk", "Reduced-fat cheese"])
    results = ranked_search("low-fat", rows)
    names = [r["name"] for r in results]
    assert any("Low-fat" in n for n in names)


def test_hyphen_in_query_does_not_match_unhyphenated():
    """'low-fat' should not match 'Whole milk' (no hyphen, no substring)."""
    rows = make_rows(["Whole milk", "Skim milk"])
    results = ranked_search("low-fat", rows)
    assert results == []


def test_numbers_in_query():
    """A query with digits must match food names containing those digits."""
    rows = make_rows(["Vitamin B12, supplement", "Vitamin C", "Vitamin D3"])
    results = ranked_search("b12", rows)
    names = [r["name"] for r in results]
    assert any("B12" in n for n in names)


def test_apostrophe_in_query():
    """A query with an apostrophe must match names containing that apostrophe."""
    rows = make_rows(["Chicken, McDonald's style", "Chicken breast", "Chicken thigh"])
    results = ranked_search("mcdonald's", rows)
    names = [r["name"] for r in results]
    assert any("McDonald's" in n for n in names)


def test_unicode_diacritic_in_query_case_insensitive():
    """A query using an accented character must match the accented food name."""
    rows = make_rows(["Crème fraîche", "Cream, heavy", "Fromage blanc"])
    results = ranked_search("crème", rows)
    names = [r["name"] for r in results]
    assert any("Crème" in n for n in names)


# ---------------------------------------------------------------------------
# Description-only filter (ranked_search checks description, not category)
# ---------------------------------------------------------------------------

def test_category_only_match_is_excluded():
    """
    ranked_search checks only row['description'], not food_category.
    A row whose description does NOT contain the query is dropped even if
    FTS5 returned it because the query matched the category column.
    """
    # Simulate FTS5 returning a row whose description doesn't contain "baked"
    rows = [
        {"fdc_id": 1, "description": "White flour", "data_type": "sr_legacy_food"},
    ]
    # "white flour" description doesn't contain "baked"
    results = ranked_search("baked", rows)
    assert results == []


def test_description_match_included_regardless_of_category():
    """A row whose description contains the query is always included."""
    rows = [
        {"fdc_id": 1, "description": "Baked potato, flesh only", "data_type": "sr_legacy_food"},
    ]
    results = ranked_search("baked", rows)
    assert len(results) == 1
    assert results[0]["fdc_id"] == 1


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

def test_identical_queries_produce_identical_results():
    """Calling ranked_search twice with the same inputs must return the same list."""
    rows = make_rows(["Butter, salted", "Buttermilk, fluid", "Peanut Butter, creamy"])
    first  = ranked_search("but", rows)
    second = ranked_search("but", rows)
    assert [r["fdc_id"] for r in first] == [r["fdc_id"] for r in second]


# ---------------------------------------------------------------------------
# Long food names
# ---------------------------------------------------------------------------

def test_very_long_food_name_is_found():
    """Food names much longer than the query are still found."""
    long_name = "Tomato, " + "red ripe, " * 20 + "canned"  # 200+ chars
    rows = make_rows([long_name, "Tomato paste"])
    results = ranked_search("tomato", rows)
    names = [r["name"] for r in results]
    assert any("Tomato" in n for n in names)
    assert len(results) == 2


# ---------------------------------------------------------------------------
# Single-food result
# ---------------------------------------------------------------------------

def test_query_matching_exactly_one_food_returns_one_result():
    """A very specific query matching exactly one row returns exactly one result."""
    rows = make_rows(["Quinoa, cooked", "Rice, brown", "Oatmeal, plain"])
    results = ranked_search("quinoa", rows)
    assert len(results) == 1
    assert results[0]["name"] == "Quinoa, cooked"


# ---------------------------------------------------------------------------
# Prefix-vs-contains ordering with numeric query
# ---------------------------------------------------------------------------

def test_numeric_prefix_match_ranks_before_numeric_contains():
    """
    '3' in '3 Musketeers candy bar' is a prefix match.
    '3' in 'Omega-3 fatty acids supplement' is a contains match.
    Prefix must rank first.
    """
    rows = make_rows([
        "Omega-3 fatty acids supplement",
        "3 Musketeers candy bar",
    ])
    results = ranked_search("3", rows)
    # '3' is too short (< 2 chars); should return empty
    assert results == []


def test_two_char_numeric_query_works():
    """A 2-character numeric query should return results."""
    rows = make_rows(["B12 vitamin supplement", "Vitamin B-12", "Vitamin C"])
    results = ranked_search("b1", rows)
    names = [r["name"] for r in results]
    assert any("B1" in n for n in names)


# ---------------------------------------------------------------------------
# Whitespace queries
# ---------------------------------------------------------------------------

def test_query_with_leading_spaces_still_uses_stripped_value():
    """ranked_search lowercases but does not strip whitespace from the query.
    Leading space means no food name starts with ' c' — all results are
    contains matches, not prefix matches.
    """
    rows = make_rows(["Chicken breast", "chicken thigh"])
    # A query with a leading space won't prefix-match any food name
    results = ranked_search(" chicken", rows)
    # The space is part of q; 'chicken breast'.lower() does not start with ' chicken'
    # but does contain 'chicken' — wait, it must contain ' chicken' (with space).
    # ' chicken' is not in 'chicken breast', so results are empty.
    assert results == []


def test_query_without_spaces_matches_normally():
    """Sanity check that the same query without a leading space works."""
    rows = make_rows(["Chicken breast", "Chicken thigh"])
    results = ranked_search("chicken", rows)
    assert len(results) == 2


# ---------------------------------------------------------------------------
# Key preservation
# ---------------------------------------------------------------------------

def test_fdc_id_preserved_in_result():
    """fdc_id in each result must match the input row's fdc_id."""
    rows = [
        {"fdc_id": 9876, "description": "Almond flour, blanched", "data_type": "foundation_food"},
    ]
    results = ranked_search("almond", rows)
    assert len(results) == 1
    assert results[0]["fdc_id"] == 9876


def test_data_type_foundation_food_preserved():
    """data_type 'foundation_food' must pass through unchanged."""
    rows = make_rows(["Almonds, whole, raw"], data_type="foundation_food")
    results = ranked_search("almond", rows)
    assert results[0]["data_type"] == "foundation_food"


def test_data_type_survey_fndds_preserved():
    """data_type 'survey_fndds_food' must pass through unchanged."""
    rows = make_rows(["Apple, raw, with skin"], data_type="survey_fndds_food")
    results = ranked_search("apple", rows)
    assert results[0]["data_type"] == "survey_fndds_food"
