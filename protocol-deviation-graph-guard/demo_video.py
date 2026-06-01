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
    ("Protocol Deviation Graph Guard", "Synthetic graph safety control for SCIBASE #17"),
    ("Input", "protocol steps + experiment evidence + proposed graph edges"),
    ("Findings", "missing sequencing QC + expired calibration + lot mismatch"),
    ("Decision", "hold unsafe graph edges before recommendations publish"),
]

frames = []
for title, subtitle in slides:
    image = Image.new("RGB", (960, 544), "#102033")
    draw = ImageDraw.Draw(image)
    draw.rectangle((48, 58, 912, 486), outline="#38bdf8", width=3)
    draw.text((82, 132), title, fill="#f8fafc", font=font(40))
    draw.text((82, 214), subtitle, fill="#dbeafe", font=font(24))
    draw.rectangle((82, 342, 742, 392), fill="#dc2626")
    draw.text((102, 354), "recommendation edges held", fill="#fee2e2", font=font(24))
    draw.text((82, 430), "Synthetic data only. No private studies or live graph APIs.", fill="#cbd5e1", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
mp4_path = REPORTS / "demo.mp4"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
iio.imwrite(mp4_path, [np.asarray(frame) for frame in frames], fps=8, codec="libx264")
print(f"wrote {gif_path}")
print(f"wrote {mp4_path}")
