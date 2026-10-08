"""Screenshots for itch.io (1280 x 800), with Chrome in headless mode.

Writes a temporary shot.html next to index.html that sets a fixed state (seed 9001; Yaroslavl and Tula,
1,500 km, Danzig/Stolp, full fuel, dawn, attack in late February) before the study loads, then deletes it.
Needs the local server on port 8960 (preview "iron-hammer", or python -m http.server 8960).
Run from the repository root:  python itch/make-shots.py
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "http://localhost:8960/shot.html"

SHOTS = [
    ("screenshot-1-start.png", "read", ""),
    ("screenshot-2-chapter.png", "play", "#/ch/3"),
    ("screenshot-3-decision.png", "play", "#/ch/6"),
    ("screenshot-4-file.png", "read", "#/file/b4"),
    ("screenshot-5-strike.png", "play", "#/strike"),
    ("screenshot-6-accounting.png", "play", "#/result"),
    ("screenshot-7-plates.png", "read", "#/plates"),
    ("screenshot-8-data.png", "read", "#/data"),
]

DRIVER = """
<script>
(function () {
  var m = new URLSearchParams(location.search).get("m");
  var st = { mode: m, great: false, seed: 9001, reached: 8,
    choices: m === "play" ? { targets: "yt", mistel: "short", base: "danzig", fuel: "full", method: "dawn", decision: "now" } : {} };
  try { localStorage.setItem("ironhammer_state", JSON.stringify(st)); } catch (e) {}
})();
</script>
"""


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    shot = ROOT / "shot.html"
    shot.write_text(html.replace('<script src="model.js"></script>', DRIVER + '<script>window.IH_ITCH = true;</script><script src="model.js"></script>'), encoding="utf-8")
    try:
        for name, mode, hash_ in SHOTS:
            out = ROOT / "itch" / name
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1280,800",
                            "--virtual-time-budget=8000", f"--screenshot={out}", f"{BASE}?m={mode}{hash_}"], check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(name, out.stat().st_size // 1024, "KB")
    finally:
        shot.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
