"""
Local HTTP server for the Nebuchadnezzar 3D museum exhibit.
Threaded, MIME-aware, port-fallback, optional browser auto-open.
Serves only exhibit file types; blocks dotfiles and directory traversal.
"""

import os
import re
import sys
import mimetypes
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_PORT = 8000
PORT_ATTEMPTS = 10
HOST = "127.0.0.1"


def read_port():
    raw = os.environ.get("PORT", "").strip()
    if not raw:
        return DEFAULT_PORT
    if not raw.isdigit() or not 1 <= int(raw) <= 65535:
        print(f"PORT={raw!r} is not a port number; using {DEFAULT_PORT}.")
        return DEFAULT_PORT
    return int(raw)


PORT = read_port()

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
    # HTTP/1.1 keep-alive: one thread per held connection instead of one per
    # request. Every response must now state Content-Length (or close), which
    # the bodyless branches below already do.
    protocol_version = "HTTP/1.1"

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in MIME_TYPES:
            return MIME_TYPES[ext]
        return super().guess_type(path)

    def allowed_origin(self):
        port = str(self.server.server_address[1])
        local_origins = ("http://127.0.0.1:" + port, "http://localhost:" + port)
        origin = self.headers.get("Origin", "")
        if origin in local_origins:
            return origin
        return local_origins[0]

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", self.allowed_origin())
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def is_local_host_header(self):
        port = str(self.server.server_address[1])
        return self.headers.get("Host", "").lower() in ("127.0.0.1:" + port, "localhost:" + port)

    def send_head(self):
        """Serve byte ranges for large media so <audio>/<video> can seek."""
        if not self.is_local_host_header():
            self.send_error(403, "Host not allowed")
            return None
        range_header = self.headers.get("Range")
        if not range_header:
            return super().send_head()
        match = re.match(r"^bytes=(\d*)-(\d*)$", range_header.strip())
        path = self.translate_path(self.path)
        if not match or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start_s, end_s = match.groups()
        if start_s == "" and end_s == "":
            return super().send_head()
        if start_s == "":
            start = max(0, size - int(end_s))
            end = size - 1
        else:
            start = int(start_s)
            end = min(int(end_s), size - 1) if end_s else size - 1
        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        f.seek(start)
        self._range_remaining = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Length", str(self._range_remaining))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        return f

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Content-Length", "0")
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
            remaining = getattr(self, "_range_remaining", None)
            if remaining is None:
                super().copyfile(source, outputfile)
            else:
                self._range_remaining = None
                while remaining > 0:
                    chunk = source.read(min(65536, remaining))
                    if not chunk:
                        break
                    outputfile.write(chunk)
                    remaining -= len(chunk)
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


def find_open_port(starting_port=DEFAULT_PORT, max_attempts=PORT_ATTEMPTS):
    import socket
    for p in range(starting_port, min(starting_port + max_attempts, 65536)):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((HOST, p))
            except OSError:
                continue
            return p
    return None


class NebuchadnezzarHTTPServer(ThreadingHTTPServer):
    request_queue_size = 128


def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    # Keep-alive holds one thread per connection; 256 KB stacks keep thousands
    # of idle connections from reserving the default stack size each.
    try:
        threading.stack_size(256 * 1024)
    except (ValueError, RuntimeError):
        pass
    port = find_open_port(PORT)
    if port is None:
        last = min(PORT + PORT_ATTEMPTS, 65536) - 1
        print(f"Ports {PORT}-{last} are all in use. Close the other server, or set PORT to a free port, and try again.")
        sys.exit(1)
    try:
        server = NebuchadnezzarHTTPServer((HOST, port), NebuchadnezzarHTTPHandler)
    except OSError as err:
        print(f"Could not start the server on port {port}: {err.strerror or err}. Set PORT to a free port and try again.")
        sys.exit(1)
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
