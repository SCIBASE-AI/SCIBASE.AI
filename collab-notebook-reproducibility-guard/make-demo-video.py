import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "reports" / "demo.mp4"
TMP = ROOT / "reports" / "video-tmp"

TMP.mkdir(parents=True, exist_ok=True)

slides = [
    {
        "title": "Unsafe packet",
        "subtitle": "Held before manuscript insertion",
        "body": "Blocks stale outputs, duplicate execution counts, unsafe HTML, private paths",
        "action": "Action: rerun notebook from a clean kernel",
        "color": "0xb91c1c",
    },
    {
        "title": "Warning packet",
        "subtitle": "Runtime digest review required",
        "body": "Stages metadata-only gaps without blocking collaborators",
        "action": "Action: capture runtime digest",
        "color": "0xb45309",
    },
    {
        "title": "Clean packet",
        "subtitle": "Accepted for collaborative use",
        "body": "Requires lock hash, input fingerprints, seed, and continuous execution order",
        "action": "Action: accept notebook outputs",
        "color": "0x047857",
    },
]

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]
FONT = next((font for font in FONT_CANDIDATES if Path(font).exists()), None)


def drawtext(text, x, y, size, color="white"):
    escaped = text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    parts = []
    if FONT:
        parts.append(f"fontfile='{FONT}'")
    parts.extend([
        f"text='{escaped}'",
        f"x={x}",
        f"y={y}",
        f"fontsize={size}",
        f"fontcolor={color}",
    ])
    return "drawtext=" + ":".join(parts)


segments = []
for index, slide in enumerate(slides):
    segment = TMP / f"segment_{index}.mp4"
    filters = [
        "drawbox=x=48:y=48:w=864:h=444:color=white@0.12:t=fill",
        drawtext("Notebook Output Reproducibility Guard", 76, 78, 28),
        drawtext(slide["title"], 76, 150, 58),
        drawtext(slide["subtitle"], 80, 230, 32),
        drawtext(slide["body"], 80, 306, 22),
        drawtext(slide["action"], 80, 360, 24),
    ]
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c={slide['color']}:s=960x540:d=3",
            "-vf",
            ",".join(filters),
            "-pix_fmt",
            "yuv420p",
            str(segment),
        ],
        cwd=str(ROOT),
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    segments.append(segment)

concat_file = TMP / "segments.txt"
concat_file.write_text("".join(f"file '{segment}'\n" for segment in segments), encoding="utf-8")

subprocess.run(
    [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-c",
        "copy",
        str(OUT),
    ],
    cwd=str(ROOT),
    check=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

for file in TMP.glob("*"):
    file.unlink()
TMP.rmdir()

print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
