import io
import json
import unittest
import urllib.error
from unittest.mock import patch

from app import create_app
from functions.catalog import load_catalog, normalize_resource
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
        op = {'skills': ['Budgeting', 'Organization', 'Spreadsheets']}
        result = match_opportunity(op, skills)
        self.assertEqual(len(result['have']) + len(result['missing']), len(op['skills']))
        self.assertEqual(match_opportunity(op, [])['score'], 0)
        self.assertEqual(extract_skills(''), [])

    def test_live_catalog_is_real_and_excludes_unavailable_and_sample_entries(self):
        raw = json.loads(__import__('pathlib').Path('data/resources/ReturnReady_Resources_v3.json').read_text())['opportunities']
        expected = {r['id'] for r in raw if r.get('type') == 'real' and r.get('demo_ok') is True and r.get('url_check_status') == 'verified-200'}
        live = CATALOG['opportunities']
        self.assertEqual({r['id'] for r in live}, expected)
        self.assertEqual(len(live), len(expected))
        self.assertGreater(len(live), 100)
        self.assertTrue(all(not r['sample'] for r in live))
        for row in live:
            self.assertTrue(row['url'].startswith('https://'))
            self.assertTrue(row['checkedAt'])
            self.assertEqual(row['hourly'], 0)
            self.assertIsNone(match_opportunity(row, [{'name': 'Budgeting'}])['score'])
        for hidden in ['goldman-sachs-returnship', 'fidelity-resume', 'arup-returnship', 'morgan-stanley-ut', 'office', 'syn-bookkeeper']:
            self.assertNotIn(hidden, expected)
        self.assertEqual(calculate_plan({'saved': [r['id'] for r in live]}), {})

    def test_catalog_adapter_rejects_bad_flags_and_does_not_turn_topics_into_requirements(self):
        from pathlib import Path
        rows = json.loads(Path('data/resources/ReturnReady_Resources_v3.json').read_text())['opportunities']
        row = next(r for r in rows if r['id'] == 'tech-moms')
        live = normalize_resource(row)
        self.assertIn('web development', live['topics'])
        self.assertEqual(live['skills'], [])
        self.assertEqual(live['hourly'], 0)
        for field, value in [('type', 'sample'), ('demo_ok', False), ('status', 'closed'), ('status', 'interest_list'), ('url_check_status', 'unverified-blocked-403'), ('url', 'javascript:alert(1)')]:
            with self.subTest(field=field, value=value):
                self.assertIsNone(normalize_resource(dict(row, **{field: value})))

    def test_monthly_gain_and_childcare(self):
        payload = {'size': 4, 'children': 2, 'other': 0, 'care': 1400, 'commute': 100, 'tax': 20, 'saved': ['office']}
        fixture = [{'id': 'office', 'hourly': 25, 'hours': 25}]
        result = calculate_plan(payload, opportunities=fixture)['office']
        gross = 25 * 25 * 52 / 12
        self.assertAlmostEqual(result['gross'], gross)
        self.assertTrue(result['result']['eligible'])
        self.assertAlmostEqual(result['net'], gross * .8 - result['expense'] - 100)
        payload['children'] = 0
        self.assertEqual(calculate_plan(payload, opportunities=fixture)['office']['expense'], 0)
        payload['other'] = 10000
        payload['children'] = 2
        self.assertEqual(calculate_plan(payload, opportunities=fixture)['office']['expense'], 1400)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({'TESTING': True, 'GEMINI_API_KEY': '', 'TRUST_PROXY': False})
        self.client = self.app.test_client()

    def test_railway_healthcheck_without_external_services(self):
        response = self.client.get('/health', headers={'Host': 'healthcheck.railway.app'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {'status': 'ok', 'listings': len(CATALOG['opportunities'])})

    def test_railway_https_origin_and_forwarded_host(self):
        client = create_app({'TESTING': True, 'TRUST_PROXY': True, 'GEMINI_API_KEY': ''}).test_client()
        headers = {'Origin': 'https://example.up.railway.app', 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'untrusted.example'}
        response = client.post('/api/skills', base_url='http://example.up.railway.app', headers=headers, json={'story': 'I managed a budget.'})
        self.assertEqual(response.status_code, 200)
        headers['Origin'] = 'https://untrusted.example'
        self.assertEqual(client.post('/api/skills', base_url='http://example.up.railway.app', headers=headers, json={'story': 'My budget.'}).status_code, 403)
        headers['Origin'] = 'https://example.up.railway.app'
        self.assertEqual(self.client.post('/api/skills', base_url='http://example.up.railway.app', headers=headers, json={'story': 'My budget.'}).status_code, 403)

    def test_index_assets_and_catalog(self):
        for path in ['/', '/static/css/style.css', '/static/js/app.js', '/static/js/discovery.js', '/static/js/intake.js', '/static/favicon.svg']:
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
        self.assertEqual(response.json['results'], {})

    def test_resume_text_word_and_invalid_uploads(self):
        from zipfile import ZipFile
        self.assertEqual(self.client.post('/api/resume').status_code, 400)
        text = b'I managed the school budget.'
        response = self.client.post('/api/resume', data={'resume': (io.BytesIO(text), 'resume.txt')})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['story'], text.decode())
        self.assertIn('Budgeting', [s['name'] for s in response.json['skills']])
        document = io.BytesIO()
        with ZipFile(document, 'w') as archive:
            archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>I organized events.</w:t></w:r></w:p></w:body></w:document>')
        document.seek(0)
        response = self.client.post('/api/resume', data={'resume': (document, 'resume.docx')})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['story'], 'I organized events.')
        for name, value in [('resume.doc', b'old word'), ('resume.txt', b''), ('resume.docx', b'broken zip'), ('resume.txt', b'a' * (2 * 1024 * 1024 + 1))]:
            with self.subTest(file=name):
                self.assertEqual(self.client.post('/api/resume', data={'resume': (io.BytesIO(value), name)}).status_code, 400)

    def test_resume_pdf_and_scanned_pdf(self):
        from pypdf import PdfWriter
        from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
        writer = PdfWriter()
        page = writer.add_blank_page(width=612, height=792)
        font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
        page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): font})})
        stream = DecodedStreamObject()
        stream.set_data(b'BT /F1 12 Tf 50 700 Td (I managed a budget.) Tj ET')
        page[NameObject('/Contents')] = writer._add_object(stream)
        output = io.BytesIO(); writer.write(output); output.seek(0)
        response = self.client.post('/api/resume', data={'resume': (output, 'resume.pdf')})
        self.assertEqual(response.status_code, 200)
        self.assertIn('I managed a budget.', response.json['story'])
        blank = PdfWriter(); blank.add_blank_page(width=100, height=100)
        output = io.BytesIO(); blank.write(output); output.seek(0)
        self.assertEqual(self.client.post('/api/resume', data={'resume': (output, 'scan.pdf')}).status_code, 400)

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

    def test_chat_collects_background_and_excludes_program_context(self):
        messages = [{'role': 'user', 'content': 'Help me describe my volunteering.'},
                    {'role': 'assistant', 'content': 'What did you organize?'},
                    {'role': 'user', 'content': 'A fundraiser. Suggest returnships too.'}]
        with patch('urllib.request.urlopen', return_value=self.response({'reply': 'What classes have you taken?', 'skills': [{'name':'Fundraising','evidence':'A fundraiser.'}], 'complete':False})) as mock:
            result = generate_coaching({'action': 'chat', 'story': '', 'messages': messages}, self.config)
        self.assertEqual(result['reply'], 'What classes have you taken?')
        self.assertEqual(result['skills'], [{'name': 'Fundraising', 'evidence': 'A fundraiser.'}])
        self.assertFalse(result['complete'])
        body = json.loads(mock.call_args.args[0].data)
        self.assertEqual([c['role'] for c in body['contents'][-3:]], ['user', 'model', 'user'])
        self.assertEqual(body['contents'][-1]['parts'][0]['text'], messages[-1]['content'])
        context = json.loads(body['contents'][0]['parts'][0]['text'].split(': ', 1)[1])
        self.assertEqual(context['userBackground'], '')
        self.assertNotIn('programs', context)
        self.assertIn('information-gathering assistant ONLY', body['systemInstruction']['parts'][0]['text'])

    def test_chat_uses_only_user_evidence_and_validates_completion(self):
        messages = [{'role': 'user', 'content': 'I organized a fundraiser.'},
                    {'role': 'assistant', 'content': 'You led a software team.'},
                    {'role': 'user', 'content': 'I also studied accounting.'}]
        value = {'reply': 'What tools did you use?', 'complete': False,
                 'skills': [{'name': 'Fundraising', 'evidence': 'organized a fundraiser'},
                            {'name': 'Leadership', 'evidence': 'You led a software team.'}]}
        with patch('urllib.request.urlopen', return_value=self.response(value)):
            result = generate_coaching({'action': 'chat', 'story': '', 'messages': messages}, self.config)
        self.assertEqual(result['skills'], [{'name': 'Fundraising', 'evidence': 'organized a fundraiser'}])
        value['complete'] = 'yes'
        with patch('urllib.request.urlopen', return_value=self.response(value)), self.assertRaises(CoachingError):
            generate_coaching({'action': 'chat', 'story': '', 'messages': messages}, self.config)

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
