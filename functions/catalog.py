"""Adapt the team's canonical real-resource dataset to the website schema."""
import json
from pathlib import Path
from urllib.parse import urlsplit

DATA_DIR = Path(__file__).resolve().parent.parent / 'data'
MASTER = DATA_DIR / 'resources' / 'ReturnReady_Resources_v3.json'
TYPE_NAMES = {
    'learning': 'Learning program', 'education': 'Education & training',
    'agency': 'Career support', 'nonprofit': 'Community support',
    'job_board': 'Job board', 'childcare': 'Child care support',
    'legal_aid': 'Legal aid', 'returnship': 'Returnship directory',
}
STATUS_NAMES = {
    'ongoing': 'Ongoing resource · confirm current services and eligibility',
    'cohort_listed': 'Cohort listed · confirm current enrollment',
    'check_provider': 'Confirm dates, availability, and cost with provider',
}
FEATURED = ['tech-moms', 'php-utah', 'path-forward-returnships', 'irelaunch-returnships', 'usu-relaunch']


def normalize_resource(row):
    url = row.get('url', '')
    parsed = urlsplit(url)
    if (row.get('type') != 'real' or row.get('demo_ok') is not True
            or row.get('url_check_status') != 'verified-200'
            or row.get('status') not in STATUS_NAMES
            or parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password):
        return None
    provider = row.get('org') or row.get('organization') or row.get('title')
    kind = row.get('kind') or row.get('resource_type')
    category = TYPE_NAMES.get(kind, 'Career resource')
    if row.get('resource_type') == 'legal_aid':
        category = TYPE_NAMES['legal_aid']
    formats = row.get('format', [])
    formats = formats if isinstance(formats, list) else []
    # Online learning or service delivery does not imply a remote job.
    style = 'Multiple formats' if len(formats) > 1 else {'online': 'Online resource', 'in-person': 'In person', 'hybrid': 'Hybrid resource'}.get(formats[0], 'Confirm with provider') if formats else 'Confirm with provider'
    geography = row.get('geography') or row.get('location') or 'Confirm service area'
    return {
        'id': row['id'], 'title': row.get('title') or row.get('name'),
        'provider': provider, 'type': category, 'industry': category, 'style': style,
        'location': row.get('location') or geography, 'geography': geography,
        'description': row.get('description', ''), 'skills': [],
        'topics': list(dict.fromkeys(row.get('skills', []) + row.get('interest_keywords', []))),
        'skillsBasis': 'resource_topics',
        'hourly': 0, 'hours': 0, 'sample': False, 'url': url,
        'sourceUrl': row.get('source_url') or url,
        'checkedAt': row.get('verified_date', ''), 'linkCheck': row['url_check_status'],
        'status': STATUS_NAMES[row['status']], 'sourceStatus': row['status'],
        'duration': row.get('schedule') or 'Confirm schedule with provider',
        'breakRequirement': 'Check provider eligibility',
        'compensation': row.get('cost') or 'Confirm cost or funding with provider',
        'perks': row.get('flexibility', []), 'formats': formats,
        'audiences': row.get('audiences', []),
        'nextStep': row.get('next_step') or 'Visit the official resource for current details.',
        'color': 'mint' if 'Utah' in geography else 'blue',
        'initials': ''.join(word[0] for word in provider.split()[:2]).upper(),
        'dataSource': 'ReturnReady_Resources_v3.json',
    }


def load_catalog(master_path=MASTER, supporting_path=DATA_DIR / 'catalog.json'):
    master = json.loads(Path(master_path).read_text())
    supporting = json.loads(Path(supporting_path).read_text())
    resources = [item for row in master['opportunities'] if (item := normalize_resource(row))]
    def priority(item):
        if item['id'] in FEATURED:
            return (0, FEATURED.index(item['id']), '')
        return (1 if 'Utah' in item['geography'] or 'Salt Lake' in item['location'] else 2,
                0 if 'caregiver' in item['audiences'] else 1, item['title'].casefold())
    resources.sort(key=priority)
    return {
        'opportunities': resources, 'courses': supporting.get('courses', []),
        'demoStory': supporting['demoStory'],
        'meta': {'source': 'data/resources/ReturnReady_Resources_v3.json',
                 'count': len(resources), 'sampleListings': 0,
                 'notice': 'Real programs and resources from the team catalog. Link checks do not confirm current openings. Visit each provider for availability, eligibility, and costs.'},
    }
