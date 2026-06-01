from pathlib import Path

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
    ("Subscription Quota Rollover Guard", "Synthetic revenue control for SCIBASE #20"),
    ("Decision", "hold-invoice · risk score 100/100"),
    ("Detected", "expired lots · duplicate carry-forward · downgrade cap breach"),
    ("Finance Action", "Hold invoice and reconcile overage before release"),
]

frames = []
for title, subtitle in slides:
    image = Image.new("RGB", (960, 540), "#111827")
    draw = ImageDraw.Draw(image)
    draw.rectangle((48, 58, 912, 482), outline="#374151", width=3)
    draw.text((82, 132), title, fill="#f9fafb", font=font(42))
    draw.text((82, 214), subtitle, fill="#d1d5db", font=font(24))
    draw.rectangle((82, 340, 690, 380), fill="#dc2626")
    draw.text((82, 410), "Synthetic data only. No payment processor or live billing calls.", fill="#9ca3af", font=font(20))
    frames.extend([image] * 14)

gif_path = REPORTS / "demo.gif"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
print(f"wrote {gif_path}")
