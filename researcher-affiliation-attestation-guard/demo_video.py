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
    ("Affiliation Attestation Guard", "User & Project Management #11"),
    ("Checks", "ORCID, institutional SSO, admin attestations"),
    ("Checks", "expired appointments, grant consent, email domains"),
    ("Decision", "hold trust features until public claims are evidenced"),
]

frames = []
for index, (title, subtitle) in enumerate(slides, start=1):
    image = Image.new("RGB", (960, 544), "#111827")
    draw = ImageDraw.Draw(image)
    draw.rectangle((44, 52, 916, 492), outline="#60a5fa", width=3)
    draw.text((80, 124), title, fill="#f8fafc", font=font(40))
    draw.text((80, 206), subtitle, fill="#dbeafe", font=font(25))
    draw.rectangle((80, 326, 818, 382), fill="#1d4ed8")
    draw.text((104, 342), "profile claims must be verified before reputation or invitations", fill="#eff6ff", font=font(21))
    draw.text((80, 438), f"Slide {index}/4 - synthetic reviewer artifact", fill="#cbd5e1", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
mp4_path = REPORTS / "demo.mp4"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
iio.imwrite(mp4_path, [np.asarray(frame) for frame in frames], fps=8, codec="libx264")
print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
