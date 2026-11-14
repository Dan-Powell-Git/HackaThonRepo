"""ReturnReady Utah — Flask backend and plain HTML/CSS/JS frontend."""
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from app_config import Config
from functions.func1 import CATALOG, calculate_plan, extract_skills
from functions.func2 import CoachingError, generate_coaching


def create_app(test_config=None):
    app = Flask(__name__, static_folder='static')
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    @app.before_request
    def validate_origin():
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
