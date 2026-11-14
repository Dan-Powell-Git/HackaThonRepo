"""ReturnReady Utah — Flask backend and plain HTML/CSS/JS frontend."""
import io
from flask import Flask, Request, jsonify, request
from werkzeug.exceptions import HTTPException
from app_config import Config
from functions.func1 import CATALOG, calculate_plan, extract_skills
from functions.resume import MAX_FILE_BYTES, extract_resume
from functions.func2 import CoachingError, generate_coaching


class InMemoryUploadRequest(Request):
    def _get_file_stream(self, total_content_length, content_type, filename=None, content_length=None):
        return io.BytesIO()


def create_app(test_config=None):
    app = Flask(__name__, static_folder='static')
    app.request_class = InMemoryUploadRequest
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    @app.before_request
    def validate_origin():
        if request.path != '/api/resume' and request.content_length and request.content_length > 128 * 1024:
            return jsonify(error='Please shorten your request.'), 413
        if request.method == 'POST':
            origin = request.headers.get('Origin')
            if origin and origin.rstrip('/') != request.host_url.rstrip('/'):
                return jsonify(error='Invalid request origin.'), 403

    @app.after_request
    def security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.get('/')
    def index():
        return app.send_static_file('html/index.html')

    @app.get('/api/catalog')
    def catalog():
        return jsonify(CATALOG)

    @app.post('/api/skills')
    def local_skills():
        payload = request.get_json()
        if not isinstance(payload, dict) or not isinstance(payload.get('story'), str):
            return jsonify(error='Enter your story as text.'), 400
        if len(payload['story']) > 25000:
            return jsonify(error='Please shorten your story to 25,000 characters.'), 400
        return jsonify(skills=extract_skills(payload['story']))

    @app.post('/api/resume')
    def resume():
        upload = request.files.get('resume')
        if not upload:
            return jsonify(error='Choose a resume file.'), 400
        try:
            text = extract_resume(upload.stream.read(MAX_FILE_BYTES + 1), upload.filename)
        except ValueError as exc:
            return jsonify(error=str(exc)), 400
        return jsonify(story=text, skills=extract_skills(text))

    @app.post('/api/calculate')
    def calculate():
        payload = request.get_json()
        if not isinstance(payload, dict):
            return jsonify(error='Enter valid household details.'), 400
        try:
            return jsonify(results=calculate_plan(payload))
        except ValueError as exc:
            return jsonify(error=str(exc)), 400

    @app.post('/api/coach')
    def coach():
        payload = request.get_json()
        if not isinstance(payload, dict):
            return jsonify(error='Invalid coaching request.'), 400
        try:
            return jsonify(generate_coaching(payload, app.config))
        except CoachingError as exc:
            return jsonify(error=str(exc)), exc.status

    @app.errorhandler(HTTPException)
    def http_error(exc):
        return jsonify(error=exc.description), exc.code

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
