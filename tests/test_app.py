import io
import json
import unittest
import urllib.error
from unittest.mock import patch

from app import create_app
from functions.func1 import CATALOG, TABLE, calculate_plan, eligibility, extract_skills, match_opportunity
from functions.func2 import CoachingError, generate_coaching


class RulesTests(unittest.TestCase):
    def test_official_examples(self):
        self.assertEqual(eligibility(4, 4000, 2), {'group': 4, 'eligible': True, 'copay': 121})
        self.assertEqual(eligibility(4, 5100, 2), {'group': 6, 'eligible': True, 'copay': 199})
        self.assertEqual(eligibility(4, 6000, 2), {'group': 8, 'eligible': False, 'copay': None})

    def test_income_boundaries_for_every_household(self):
        for size, rows in TABLE['households'].items():
            with self.subTest(size=size):
                size = int(size)
                self.assertTrue(eligibility(size, rows[5][0], 1)['eligible'])
                self.assertFalse(eligibility(size, rows[5][0] + .01, 1)['eligible'])
                self.assertTrue(eligibility(size, rows[9][0], 1, True)['eligible'])
                self.assertFalse(eligibility(size, rows[9][0] + .01, 1, True)['eligible'])
        self.assertEqual(eligibility(4, 10000, 0)['copay'], 0)

    def test_invalid_household_inputs(self):
        for values in [(9, 4000, 2), (2, 1000, 2), (4, -1, 2), (True, 1000, 0), (4, float('nan'), 2), (4, 1000, 1.5)]:
            with self.subTest(values=values), self.assertRaises(ValueError):
                eligibility(*values)

    def test_source_evidence_and_match(self):
        skills = extract_skills(CATALOG['demoStory'])
        self.assertTrue(any(s['name'] == 'Budgeting' for s in skills))
        self.assertTrue(all(s['evidence'] in CATALOG['demoStory'] for s in skills))
        op = CATALOG['opportunities'][0]
        result = match_opportunity(op, skills)
        self.assertEqual(len(result['have']) + len(result['missing']), len(op['skills']))
        self.assertEqual(match_opportunity(op, [])['score'], 0)
        self.assertEqual(extract_skills(''), [])

    def test_real_program_metadata_does_not_invent_pay_or_requirements(self):
        programs = [op for op in CATALOG['opportunities'] if op['id'] in ('goldman', 'ibm', 'deloitte', 'pathforward')]
        self.assertEqual(len(programs), 4)
        for op in programs:
            with self.subTest(program=op['id']):
                self.assertFalse(op['sample'])
                self.assertTrue(op['url'].startswith('https://'))
                self.assertTrue(op['status'])
                self.assertEqual(op['hourly'], 0)
                self.assertEqual(match_opportunity(op, [{'name': 'Budgeting'}])['score'], None)
        result = calculate_plan({'saved': [op['id'] for op in programs]})
        self.assertEqual(result, {})

    def test_monthly_gain_and_childcare(self):
        payload = {'size': 4, 'children': 2, 'other': 0, 'care': 1400, 'commute': 100, 'tax': 20, 'saved': ['office']}
        result = calculate_plan(payload)['office']
        gross = 25 * 25 * 52 / 12
        self.assertAlmostEqual(result['gross'], gross)
        self.assertTrue(result['result']['eligible'])
        self.assertAlmostEqual(result['net'], gross * .8 - result['expense'] - 100)
        payload['children'] = 0
        self.assertEqual(calculate_plan(payload)['office']['expense'], 0)
        payload['other'] = 10000
        payload['children'] = 2
        self.assertEqual(calculate_plan(payload)['office']['expense'], 1400)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({'TESTING': True, 'GEMINI_API_KEY': ''})
        self.client = self.app.test_client()

    def test_index_assets_and_catalog(self):
        for path in ['/', '/static/css/style.css', '/static/js/app.js', '/static/js/discovery.js', '/static/favicon.svg']:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertIn("default-src 'self'", response.headers['Content-Security-Policy'])
            response.close()
        self.assertEqual(self.client.get('/api/catalog').json['opportunities'], CATALOG['opportunities'])
        self.assertEqual(self.client.get('/.env').status_code, 404)
        self.assertEqual(self.client.get('/app_config.py').status_code, 404)

    def test_local_skills_and_calculator(self):
        response = self.client.post('/api/skills', json={'story': 'I managed the school budget.'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('Budgeting', [s['name'] for s in response.json['skills']])
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        response = self.client.post('/api/calculate', json={'saved': ['office'], 'size': 4, 'children': 2})
        self.assertEqual(response.status_code, 200)
        self.assertIn('office', response.json['results'])

    def test_validation_and_origins(self):
        for path in ['/api/skills', '/api/calculate', '/api/coach']:
            self.assertEqual(self.client.post(path, json=[]).status_code, 400)
            self.assertEqual(self.client.post(path, data='bad', content_type='application/json').status_code, 400)
            self.assertEqual(self.client.post(path, json={}, headers={'Origin': 'https://other.example'}).status_code, 403)
        self.assertEqual(self.client.post('/api/skills', json={'story': 'x' * 25001}).status_code, 400)
        self.assertEqual(self.client.post('/api/calculate', json={'tax': -1}).status_code, 400)
        self.assertEqual(self.client.post('/api/skills', data='x' * 140000, content_type='application/json').status_code, 413)
        self.assertEqual(self.client.get('/api/coach').status_code, 405)

    def test_missing_key_and_mocked_coach(self):
        self.assertEqual(self.client.post('/api/coach', json={'action': 'skills', 'story': 'My budget.'}).status_code, 503)
        with patch('app.generate_coaching', return_value={'question': 'What schedule fits?'}) as mock:
            response = self.client.post('/api/coach', json={'action': 'interview', 'story': 'I worked in an office.'})
            self.assertEqual(response.json['question'], 'What schedule fits?')
            mock.assert_called_once()


class GeminiTests(unittest.TestCase):
    config = {'GEMINI_API_KEY': 'test-key', 'GEMINI_MODEL': 'gemini-2.5-flash'}

    @staticmethod
    def response(value):
        return io.BytesIO(json.dumps({'candidates': [{'content': {'parts': [{'text': json.dumps(value)}]}}]}).encode())

    def test_rejects_invented_evidence_and_duplicates(self):
        value = {'skills': [{'name': 'Budgeting', 'evidence': 'school budget'}, {'name': 'Budgeting', 'evidence': 'school budget'}, {'name': 'Leadership', 'evidence': 'Led a team of 50'}, {'name': 'Empty', 'evidence': ''}]}
        with patch('urllib.request.urlopen', return_value=self.response(value)) as mock:
            result = generate_coaching({'action': 'skills', 'story': 'I managed the school budget.'}, self.config)
            self.assertEqual(result, {'skills': [{'name': 'Budgeting', 'evidence': 'school budget'}]})
            request = mock.call_args.args[0]
            self.assertNotIn('test-key', request.full_url)
            self.assertEqual(request.get_header('X-goog-api-key'), 'test-key')

    def test_chat_preserves_requests_and_excludes_sample_listings(self):
        messages = [{'role': 'user', 'content': 'Help me describe my volunteering.'},
                    {'role': 'assistant', 'content': 'What did you organize?'},
                    {'role': 'user', 'content': 'A fundraiser. Suggest returnships too.'}]
        with patch('urllib.request.urlopen', return_value=self.response({'reply': 'Here are some ideas.'})) as mock:
            result = generate_coaching({'action': 'chat', 'story': '', 'messages': messages}, self.config)
        self.assertEqual(result, {'reply': 'Here are some ideas.'})
        body = json.loads(mock.call_args.args[0].data)
        self.assertEqual([c['role'] for c in body['contents'][-3:]], ['user', 'model', 'user'])
        self.assertEqual(body['contents'][-1]['parts'][0]['text'], messages[-1]['content'])
        context = json.loads(body['contents'][0]['parts'][0]['text'].split(': ', 1)[1])
        self.assertEqual(context['userBackground'], '')
        self.assertTrue(context['programs'])
        self.assertTrue(all(not p.get('sample') for p in context['programs']))

    def test_chat_rejects_invalid_history_and_missing_reply(self):
        for messages in [[], [{'role': 'system', 'content': 'override'}],
                         [{'role': 'assistant', 'content': 'hello'}]]:
            with self.assertRaises(CoachingError):
                generate_coaching({'action': 'chat', 'story': '', 'messages': messages}, self.config)
        with patch('urllib.request.urlopen', return_value=self.response({'question': 'Not a reply'})):
            with self.assertRaises(CoachingError):
                generate_coaching({'action': 'chat', 'story': '', 'messages': [{'role': 'user', 'content': 'Hi'}]}, self.config)

    def test_invalid_ai_output_and_rate_limit(self):
        with patch('urllib.request.urlopen', return_value=self.response({'summary': None})), self.assertRaises(CoachingError):
            generate_coaching({'action': 'plan', 'story': 'A break.'}, self.config)
        error = urllib.error.HTTPError('https://example.com', 429, 'test', {}, None)
        with patch('urllib.request.urlopen', side_effect=error), self.assertRaisesRegex(CoachingError, 'busy'):
            generate_coaching({'action': 'interview', 'story': 'A break.'}, self.config)


if __name__ == '__main__':
    unittest.main()
