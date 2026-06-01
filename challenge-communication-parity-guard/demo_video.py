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
    ("Communication Parity Guard", "Scientific Bounty System #18"),
    ("Checks", "hidden hints, missed broadcasts, stale rule digests"),
    ("Checks", "channel coverage, accessible attachments, fair ack windows"),
    ("Decision", "hold unsafe phase transitions until every team has parity"),
]

frames = []
for index, (title, subtitle) in enumerate(slides, start=1):
    image = Image.new("RGB", (960, 544), "#111827")
    draw = ImageDraw.Draw(image)
    draw.rectangle((42, 48, 918, 496), outline="#22c55e", width=3)
    draw.text((78, 118), title, fill="#f9fafb", font=font(42))
    draw.text((78, 202), subtitle, fill="#d1fae5", font=font(26))
    draw.rectangle((78, 326, 798, 382), fill="#0f766e")
    draw.text((102, 342), "material sponsor communications must reach every eligible team", fill="#ecfeff", font=font(21))
    draw.text((78, 438), f"Slide {index}/4 - synthetic reviewer artifact", fill="#9ca3af", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
mp4_path = REPORTS / "demo.mp4"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
iio.imwrite(mp4_path, [np.asarray(frame) for frame in frames], fps=8, codec="libx264")
print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
