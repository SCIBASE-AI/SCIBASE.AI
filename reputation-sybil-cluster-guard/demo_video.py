from pathlib import Path

import imageio.v3 as iio
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)


def font(size):
    for name in ("arial.ttf", "segoeui.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


slides = [
    ("Reputation Sybil Cluster Guard", "Synthetic trust-and-safety control for SCIBASE #15"),
    ("Decision", "quarantine-cluster · risk score 100/100"),
    ("Signals", "shared payout · recycled device · review ring"),
    ("Action", "Pause reputation, rankings, and payout eligibility until review"),
]

frames = []
for title, subtitle in slides:
    image = Image.new("RGB", (960, 544), "#111827")
    draw = ImageDraw.Draw(image)
    draw.rectangle((48, 58, 912, 486), outline="#374151", width=3)
    draw.text((82, 136), title, fill="#f9fafb", font=font(42))
    draw.text((82, 220), subtitle, fill="#d1d5db", font=font(24))
    draw.rectangle((82, 350, 700, 392), fill="#dc2626")
    draw.text((82, 424), "Synthetic data only. No social media, wallets, or private user records.", fill="#9ca3af", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
mp4_path = REPORTS / "demo.mp4"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
iio.imwrite(mp4_path, [np.asarray(frame) for frame in frames], fps=8, codec="libx264")
print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
