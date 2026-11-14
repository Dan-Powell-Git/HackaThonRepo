"""Catalog, evidence-backed skills, and deterministic child care estimates."""
import json
import math
import re
from functions.catalog import load_catalog
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / 'data'
CATALOG = load_catalog()
TABLE = json.loads((DATA_DIR / 'utah_childcare_table4_oct2026.json').read_text())
RULES = [
    ('Budgeting', r'budget|financ|expenses'),
    ('Fundraising', r'fundrais'),
    ('Event Planning', r'event|fundrais|organized'),
    ('Organization', r'coordinat|organiz|schedul'),
    ('Communication', r'coordinat|customer|communicat|PTA'),
    ('Care Coordination', r'caregiving|caring|care for|caregiver'),
    ('Project Management', r'project|managed|led '),
    ('Spreadsheets', r'excel|spreadsheet'),
    ('Customer Service', r'customer'),
    ('Problem Solving', r'solv|troubleshoot'),
    ('Web Development', r'html|javascript|web develop'),
]


def extract_skills(story):
    """Return suggestions with evidence quoted verbatim from the story."""
    sentences = re.split(r'(?<=[.!?])\s+|\n+', story)
    result = []
    for name, pattern in RULES:
        evidence = next((s for s in sentences if re.search(pattern, s, re.I)), None)
        if evidence:
            result.append({'name': name, 'evidence': evidence})
    return result


def match_opportunity(opportunity, skills):
    confirmed = {s['name'].strip().casefold() for s in skills}
    have = [s for s in opportunity['skills'] if s.casefold() in confirmed]
    missing = [s for s in opportunity['skills'] if s not in have]
    score = math.floor(len(have) / len(opportunity['skills']) * 100 + 0.5) if opportunity['skills'] else None
    return {'have': have, 'missing': missing, 'score': score}


def finite_number(value, name, minimum=0, maximum=1_000_000):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{name} must be a finite number.')
    if not minimum <= value <= maximum:
        raise ValueError(f'{name} must be between {minimum} and {maximum}.')
    return value


def eligibility(household_size, income, children, review=False):
    if isinstance(household_size, bool) or not isinstance(household_size, int) or str(household_size) not in TABLE['households']:
        raise ValueError('Household size must be an integer from 2 to 8.')
    if isinstance(children, bool) or not isinstance(children, int) or not 0 <= children < household_size:
        raise ValueError('Children in care must be a whole number less than household size.')
    if not isinstance(review, bool):
        raise ValueError('Review must be true or false.')
    finite_number(income, 'Household income')
    cents = Decimal(str(income)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    rows = TABLE['households'][str(household_size)]
    index = next((i for i, row in enumerate(rows) if cents <= row[0]), None)
    eligible = index is not None and index < (10 if review else 6)
    copay = 0 if children == 0 else rows[index][min(3, children)] if eligible else None
    return {'group': index + 1 if index is not None else None, 'eligible': eligible, 'copay': copay}


def calculate_plan(payload, opportunities=None):
    size = payload.get('size', 4)
    children = payload.get('children', 2)
    other = finite_number(payload.get('other', 0), 'Other monthly income')
    care = finite_number(payload.get('care', 0), 'Monthly child care cost')
    commute = finite_number(payload.get('commute', 0), 'Monthly commute cost')
    tax = finite_number(payload.get('tax', 20), 'Estimated tax percentage', maximum=60)
    review = payload.get('review', False)
    # Validate even when no jobs are saved.
    eligibility(size, other, children, review)
    ids = payload.get('saved', [])
    if not isinstance(ids, list) or len(ids) > 250 or any(not isinstance(i, str) for i in ids):
        raise ValueError('Saved opportunities must be a list of IDs.')
    results = {}
    for op in CATALOG['opportunities'] if opportunities is None else opportunities:
        if op['id'] not in ids or not op['hourly']:
            continue
        gross = op['hourly'] * op['hours'] * 52 / 12
        result = eligibility(size, gross + other, children, review)
        expense = 0 if children == 0 else min(care, result['copay']) if result['eligible'] else care
        take_home = gross * (1 - tax / 100)
        results[op['id']] = dict(gross=gross, takeHome=take_home, householdIncome=gross + other,
                                result=result, expense=expense, commute=commute, net=take_home - expense - commute)
    return results
