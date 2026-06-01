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
    ("Terminology + Unit Guard", "Real-time collaborative editor #12"),
    ("Checks", "glossary drift + acronym first-use gaps"),
    ("Checks", "unit conflicts + equation variable mismatch"),
    ("Decision", "hold publication export until shared language is consistent"),
]

frames = []
for index, (title, subtitle) in enumerate(slides, start=1):
    image = Image.new("RGB", (960, 544), "#172033")
    draw = ImageDraw.Draw(image)
    draw.rectangle((46, 54, 914, 490), outline="#a3e635", width=3)
    draw.text((82, 124), title, fill="#f8fafc", font=font(42))
    draw.text((82, 206), subtitle, fill="#ecfccb", font=font(26))
    draw.rectangle((82, 326, 742, 382), fill="#365314")
    draw.text((104, 342), "collaborator suggestions cannot introduce scientific drift", fill="#f7fee7", font=font(22))
    draw.text((82, 438), f"Slide {index}/4 - synthetic reviewer artifact", fill="#cbd5e1", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
mp4_path = REPORTS / "demo.mp4"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
iio.imwrite(mp4_path, [np.asarray(frame) for frame in frames], fps=8, codec="libx264")
print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
