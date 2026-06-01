import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / "reports"
FRAMES = REPORTS / "frames"

REPORTS.mkdir(exist_ok=True)
FRAMES.mkdir(exist_ok=True)

COLORS = [
    ("RELEASE", "0x16a34a", "All training and acknowledgements current"),
    ("REVISE", "0xca8a04", "Receipt and acknowledgement gaps detected"),
    ("HOLD", "0xdc2626", "Expired training blocks privileged export"),
]

gif_path = REPORTS / "demo.gif"
mp4_path = REPORTS / "demo.mp4"

ffmpeg = os.environ.get("FFMPEG")
if not ffmpeg:
    candidates = list((ROOT.parents[2] / "tools" / "video-gen").glob("node_modules/**/ffmpeg.exe"))
    ffmpeg = str(candidates[0]) if candidates else "ffmpeg"

font = "C\\:/Windows/Fonts/arial.ttf"

for index, (label, color, subtitle) in enumerate(COLORS):
    frame_path = FRAMES / f"frame-{index:03d}.png"
    filters = (
        "drawbox=x=60:y=56:w=780:h=408:color=0xf8fafc:t=fill,"
        "drawtext=fontfile='{font}':text='Enterprise Training Policy Guard':x=104:y=118:fontsize=34:fontcolor=0x0f172a,"
        "drawtext=fontfile='{font}':text='Decision\\: {label}':x=104:y=190:fontsize=30:fontcolor={color},"
        "drawtext=fontfile='{font}':text='{subtitle}':x=104:y=248:fontsize=22:fontcolor=0x334155,"
        "drawbox=x=104:y=318:w={bar}:h=54:color={color}:t=fill,"
        "drawtext=fontfile='{font}':text='Synthetic data only - reviewer-ready findings':x=104:y=414:fontsize=18:fontcolor=0x475569"
    ).format(font=font, label=label, subtitle=subtitle, color=color, bar=240 + index * 120)
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=0x0f172a:s=900x520:d=1",
            "-vf",
            filters,
            "-frames:v",
            "1",
            str(frame_path),
        ],
        check=True,
    )

subprocess.run(
    [
        ffmpeg,
        "-y",
        "-framerate",
        "1",
        "-i",
        str(FRAMES / "frame-%03d.png"),
        "-vf",
        "scale=900:520:flags=lanczos",
        str(gif_path),
    ],
    check=True,
)

subprocess.run(
    [
        ffmpeg,
        "-y",
        "-framerate",
        "1",
        "-i",
        str(FRAMES / "frame-%03d.png"),
        "-vf",
        "scale=900:520:flags=lanczos,format=yuv420p",
        "-movflags",
        "+faststart",
        str(mp4_path),
    ],
    check=True,
)

print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
