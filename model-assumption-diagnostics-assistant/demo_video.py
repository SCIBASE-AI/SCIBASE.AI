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


frames = []
slides = [
    ("Model Assumption Diagnostics", "Synthetic reviewer packet for SCIBASE #16"),
    ("Decision", "hold-ai-review · risk score 100/100"),
    ("Blockers", "model-family mismatch · low events per predictor · separation"),
    ("Reviewer Action", "Refit, add sensitivity evidence, and link diagnostics before AI review release"),
]

for title, subtitle in slides:
    image = Image.new("RGB", (960, 540), "#0e1726")
    draw = ImageDraw.Draw(image)
    draw.rectangle((48, 58, 912, 482), outline="#334155", width=3)
    draw.text((82, 132), title, fill="#f8fafc", font=font(44))
    draw.text((82, 214), subtitle, fill="#cbd5e1", font=font(24))
    draw.rectangle((82, 340, 690, 380), fill="#ef4444")
    draw.text((82, 410), "No external services, credentials, or private research data.", fill="#94a3b8", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
mp4_path = REPORTS / "demo.mp4"
iio.imwrite(mp4_path, [np.asarray(frame) for frame in frames], fps=8, codec="libx264")

print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
