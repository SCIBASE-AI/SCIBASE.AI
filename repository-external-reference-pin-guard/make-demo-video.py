from pathlib import Path
import subprocess
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)
FRAME = REPORTS / "demo-frame.png"
VIDEO = REPORTS / "demo.mp4"


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


img = Image.new("RGB", (1280, 720), "#ffffff")
draw = ImageDraw.Draw(img)
title_font = font(44, True)
body_font = font(23)
small_font = font(18)

draw.rectangle((0, 0, 1280, 92), fill="#0f172a")
draw.text((48, 26), "Repository External Reference Pin Guard", fill="#ffffff", font=title_font)

cards = [
    ("MALFORMED_REPOSITORY_PACKET", "#991b1b", "Blocks malformed top-level repository packets before reviewer evidence can crash"),
    ("MALFORMED_REFERENCE_MANIFEST", "#991b1b", "Blocks object-shaped or missing reference manifests before they pass as clean audits"),
    ("MALFORMED_REFERENCE_ENTRY", "#991b1b", "Turns malformed external-reference entries into release-blocking repair evidence"),
    ("MISSING_REFERENCE_ID", "#991b1b", "Assigns stable placeholder IDs so remediation targets are never blank or undefined"),
    ("hold_repository_release", "#991b1b", "Blocks floating git refs, auth-only APIs, stale dataset evidence"),
    ("stage_reference_metadata_revision", "#a16207", "Stages pinned references that still need license or attribution"),
    ("release_repository_references", "#047857", "Allows DOI/export release only with immutable pins, parseable DOIs, and checksums"),
]

for index, (status, color, description) in enumerate(cards):
    y = 108 + index * 78
    draw.rounded_rectangle((58, y, 1222, y + 62), radius=8, outline="#cbd5e1", width=2, fill="#f8fafc")
    draw.ellipse((88, y + 14, 122, y + 48), fill=color)
    draw.text((150, y + 8), status, fill="#111827", font=body_font)
    for line_index, line in enumerate(textwrap.wrap(description, width=78)):
        draw.text((150, y + 36 + line_index * 20), line, fill="#475569", font=small_font)

draw.text((58, 596), "Synthetic evidence only. No external repositories, APIs, DOI registries, or private data sources are contacted.", fill="#334155", font=small_font)
img.save(FRAME)

subprocess.run(
    [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(FRAME),
        "-t",
        "7.5",
        "-r",
        "24",
        "-vf",
        "format=yuv420p",
        "-movflags",
        "+faststart",
        str(VIDEO),
    ],
    check=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

FRAME.unlink(missing_ok=True)
print(f"wrote {VIDEO}")
