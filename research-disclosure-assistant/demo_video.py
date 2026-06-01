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
    ("Research Disclosure Assistant", "AI-Assisted Research Tools #13"),
    ("Checks", "funding statements + sponsor role clarity"),
    ("Checks", "COI declarations + industry relationships"),
    ("Decision", "hold AI review output until disclosures are complete"),
]

frames = []
for index, (title, subtitle) in enumerate(slides, start=1):
    image = Image.new("RGB", (960, 544), "#102033")
    draw = ImageDraw.Draw(image)
    draw.rectangle((46, 54, 914, 490), outline="#facc15", width=3)
    draw.text((82, 124), title, fill="#f8fafc", font=font(40))
    draw.text((82, 206), subtitle, fill="#fef9c3", font=font(26))
    draw.rectangle((82, 326, 770, 382), fill="#854d0e")
    draw.text((104, 342), "disclosure gaps block trusted peer-review output", fill="#fffbeb", font=font(22))
    draw.text((82, 438), f"Slide {index}/4 - synthetic reviewer artifact", fill="#cbd5e1", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
mp4_path = REPORTS / "demo.mp4"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
iio.imwrite(mp4_path, [np.asarray(frame) for frame in frames], fps=8, codec="libx264")
print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
