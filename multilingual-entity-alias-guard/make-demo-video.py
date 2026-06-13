import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)
OUTPUT = REPORTS / "demo.mp4"

font = "C\\:/Windows/Fonts/arial.ttf"
vf = ",".join(
    [
        "drawbox=x=52:y=58:w=1176:h=604:color=0x7bd88f@0.55:t=4",
        "drawbox=x=62:y=68:w=1156:h=584:color=0x142f42@0.96:t=fill",
        f"drawtext=fontfile='{font}':text='Scientific Knowledge Graph Alias Guard':x=92:y=126:fontsize=42:fontcolor=white",
        f"drawtext=fontfile='{font}':text='Maps multilingual scientific terms to canonical entities':x=92:y=206:fontsize=30:fontcolor=0xd8f6df",
        f"drawtext=fontfile='{font}':text='Preserves language tags for entity pages and JSON-LD':x=92:y=266:fontsize=30:fontcolor=0xd8f6df",
        f"drawtext=fontfile='{font}':text='Holds homographs and false friends for curator review':x=92:y=326:fontsize=30:fontcolor=0xd8f6df",
        f"drawtext=fontfile='{font}':text='Suppresses weak aliases before recommendations are shown':x=92:y=386:fontsize=30:fontcolor=0xd8f6df",
        f"drawtext=fontfile='{font}':text='Handles malformed alias evidence without runtime failures':x=92:y=446:fontsize=30:fontcolor=0xd8f6df",
        f"drawtext=fontfile='{font}':text='SCIBASE issue #17 multilingual KG integration slice':x=92:y=536:fontsize=28:fontcolor=0xffd37a",
    ]
)

cmd = [
    "ffmpeg",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x0c2130:s=1280x720:d=4:r=30",
    "-vf",
    vf,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    str(OUTPUT),
]

subprocess.run(cmd, check=True)
print(f"Wrote {OUTPUT.relative_to(ROOT)}")
