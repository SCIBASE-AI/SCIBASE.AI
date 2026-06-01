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
    ("Reproducibility Bundle Guard", "Project Repository & Version Control #10"),
    ("Manifest", "manuscript, data, code, notebooks, results, protocols, metadata"),
    ("Integrity", "SHA-256 hashes, lockfiles, pinned runtimes, provenance refs"),
    ("Decision", "hold release until the export bundle is reproducible"),
]

frames = []
for index, (title, subtitle) in enumerate(slides, start=1):
    image = Image.new("RGB", (960, 544), "#101827")
    draw = ImageDraw.Draw(image)
    draw.rectangle((44, 52, 916, 492), outline="#22c55e", width=3)
    draw.text((80, 124), title, fill="#f8fafc", font=font(40))
    draw.text((80, 206), subtitle, fill="#dcfce7", font=font(24))
    draw.rectangle((80, 326, 818, 382), fill="#166534")
    draw.text((104, 342), "release only when reviewers can reproduce the exact packet", fill="#f0fdf4", font=font(21))
    draw.text((80, 438), f"Slide {index}/4 - synthetic reviewer artifact", fill="#cbd5e1", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
mp4_path = REPORTS / "demo.mp4"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
iio.imwrite(mp4_path, [np.asarray(frame) for frame in frames], fps=8, codec="libx264")
print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
