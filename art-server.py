#!/usr/bin/env python3
# The Art Lab's little dockhand: serves the game folder AND catches the
# scores the lab throws it, writing them to art-scores.json in the repo —
# where Claude can read them and go improve the low-scoring art.
#
#   python3 art-server.py            → http://localhost:8123/art-lab.html
#   python3 art-server.py 9000       → a different port, if 8123 is busy
#
# No dependencies. Ctrl-C to stop.

import json
import sys
import pathlib
import http.server
import socketserver

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ROOT = pathlib.Path(__file__).resolve().parent
SCORES = ROOT / 'art-scores.json'


class Handler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # the lab POSTs the whole score document on every change
    def do_POST(self):
        if self.path != '/art-scores':
            self.send_response(404)
            self.end_headers()
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            doc = json.loads(self.rfile.read(length))
            SCORES.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
            self.send_response(204)
            self.end_headers()
        except Exception as e:
            self.send_response(400)
            self.end_headers()
            print(f'  !! bad score payload: {e}')

    # keep the terminal calm — only speak when scores land
    def log_message(self, fmt, *args):
        if self.command == 'POST':
            print(f'  scores saved → {SCORES.name}')


class Server(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == '__main__':
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        print(f'The Art Lab is open: http://localhost:{PORT}/art-lab.html')
        print(f'Scores will be written to {SCORES.name} as you click. Ctrl-C to stop.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nThe lab closes for the night.')
