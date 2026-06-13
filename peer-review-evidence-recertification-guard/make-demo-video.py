import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)
OUTPUT = REPORTS / "demo.mp4"

font = "C\\:/Windows/Fonts/arial.ttf"
vf = ",".join(
    [
        "drawbox=x=50:y=55:w=1180:h=610:color=0x6cc7ff@0.55:t=4",
        "drawbox=x=60:y=65:w=1160:h=590:color=0x172b44@0.96:t=fill",
        f"drawtext=fontfile='{font}':text='Peer Review Evidence Recertification':x=95:y=125:fontsize=42:fontcolor=white",
        f"drawtext=fontfile='{font}':text='Detects stale peer-review evidence after artifact changes':x=95:y=205:fontsize=30:fontcolor=0xd7edf9",
        f"drawtext=fontfile='{font}':text='Freezes outdated reputation deltas until recertified':x=95:y=265:fontsize=30:fontcolor=0xd7edf9",
        f"drawtext=fontfile='{font}':text='Redacts double-blind reviewer identities in task packets':x=95:y=325:fontsize=30:fontcolor=0xd7edf9",
        f"drawtext=fontfile='{font}':text='Blocks malformed reputation deltas before profile credit':x=95:y=385:fontsize=30:fontcolor=0xd7edf9",
        f"drawtext=fontfile='{font}':text='Holds malformed review/comment entries for recertification':x=95:y=445:fontsize=30:fontcolor=0xd7edf9",
        f"drawtext=fontfile='{font}':text='SCIBASE issue #15 community reputation slice':x=95:y=545:fontsize=28:fontcolor=0xffdf7e",
    ]
)

cmd = [
    "ffmpeg",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x102033:s=1280x720:d=4:r=30",
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
