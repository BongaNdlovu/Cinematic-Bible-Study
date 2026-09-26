"""
Local HTTP server for the Nebuchadnezzar 3D museum exhibit.
Threaded, MIME-aware, port-fallback, optional browser auto-open.
Serves only exhibit file types; blocks dotfiles and directory traversal.
"""

import os
import sys
import mimetypes
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8000"))
HOST = "127.0.0.1"

ALLOWED_EXTENSIONS = {
    ".html", ".css", ".js", ".mjs", ".json", ".geojson", ".map",
    ".wasm", ".glb", ".gltf", ".bin",
    ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".gif",
    ".mp3", ".m4a", ".ogg", ".woff", ".woff2", ".ttf", ".txt", ".md",
}

MIME_TYPES = {
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".wasm": "application/wasm",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
    ".geojson": "application/geo+json",
    ".bin": "application/octet-stream",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}

for ext, mime in MIME_TYPES.items():
    mimetypes.add_type(mime, ext)


class NebuchadnezzarHTTPHandler(SimpleHTTPRequestHandler):
    timeout = 10

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in MIME_TYPES:
            return MIME_TYPES[ext]
        return super().guess_type(path)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1:" + str(self.server.server_address[1]))
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def list_directory(self, path):
        self.send_error(403, "Directory listing is forbidden")
        return None

    def translate_path(self, path):
        root = os.path.realpath(os.getcwd())
        if "\x00" in path:
            return os.path.join(root, "__forbidden__")
        try:
            full = super().translate_path(path)
            if "\x00" in full:
                return os.path.join(root, "__forbidden__")
            full_abs = os.path.realpath(full)
            if "\x00" in full_abs:
                return os.path.join(root, "__forbidden__")
            if full_abs != root and not full_abs.startswith(root + os.sep):
                return os.path.join(root, "__forbidden__")
            rel = os.path.relpath(full_abs, root)
            parts = rel.replace("\\", "/").split("/")
            if any(part.startswith(".") for part in parts if part not in (".", "..")):
                return os.path.join(root, "__forbidden__")
            if os.path.isfile(full_abs):
                ext = os.path.splitext(full_abs)[1].lower()
                if ext and ext not in ALLOWED_EXTENSIONS:
                    return os.path.join(root, "__forbidden__")
            return full_abs
        except (ValueError, OSError):
            return os.path.join(root, "__forbidden__")

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, TimeoutError):
            self.close_connection = True

    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, TimeoutError):
            self.close_connection = True

    def log_message(self, format, *args):
        msg = format % args
        sys.stdout.write(f"[{self.log_date_time_string()}] {msg}\n")
        sys.stdout.flush()


def find_open_port(starting_port=8000, max_attempts=10):
    import socket
    for p in range(starting_port, starting_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex((HOST, p)) != 0:
                return p
    return starting_port


class NebuchadnezzarHTTPServer(ThreadingHTTPServer):
    request_queue_size = 128


def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = find_open_port(PORT)
    server = NebuchadnezzarHTTPServer((HOST, port), NebuchadnezzarHTTPHandler)
    url = f"http://127.0.0.1:{port}/index.html"

    print("=" * 66)
    print("  Nebuchadnezzar & Daniel 2 Colossus — 3D Web Server")
    print(f"  Server URL:    {url}")
    print(f"  Local Root:    {os.getcwd()}")
    print("  Engine:        Multi-threaded HTTP (GLB / WASM MIME)")
    print("=" * 66)
    print("Serving HTTP on port %d (Press Ctrl+C to stop)..." % port)

    if "--no-browser" not in sys.argv:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()
        print("Server stopped cleanly.")


if __name__ == "__main__":
    run_server()
