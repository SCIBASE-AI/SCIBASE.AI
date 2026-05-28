from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)
OUTPUT = REPORTS / "demo.mp4"


def load_font(size):
    for candidate in [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def frame(progress):
    image = Image.new("RGB", (1280, 720), "#18202f")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((60, 70, 1220, 650), radius=18, fill="#243149", outline="#9ec5ff", width=4)

    title = load_font(44)
    heading = load_font(30)
    body = load_font(24)
    small = load_font(18)

    draw.text((100, 125), "Institutional Sanctions Export Guard", fill="white", font=title)
    lines = [
        "Screens institutional subscriptions before invoicing",
        "Blocks restricted-party and jurisdiction matches",
        "Requires export clearance for AI compute bundles",
        "Defers entitlements when payment rails are unsupported",
        "Emits finance-ready audit packets",
        "Uses synthetic data only"
    ]

    visible = min(len(lines), 1 + int(progress * len(lines)))
    for index, line in enumerate(lines[:visible]):
        y = 205 + index * 54
        draw.text((100, y), line, fill="#e8f1ff", font=heading if index < 3 else body)

    bar_width = int(980 * progress)
    draw.rounded_rectangle((100, 590, 1080, 615), radius=10, fill="#33435f")
    draw.rounded_rectangle((100, 590, 100 + bar_width, 615), radius=10, fill="#9ec5ff")
    draw.text((100, 635), "SCIBASE issue #20 revenue infrastructure slice - synthetic demo", fill="#b9d2ff", font=small)
    return image


def main():
    try:
        import imageio.v3 as iio
    except Exception as exc:  # pragma: no cover - helper path for local artifact generation
        raise SystemExit(
            "imageio and imageio-ffmpeg are required to regenerate reports/demo.mp4. "
            "The committed demo.mp4 is already generated for review."
        ) from exc

    frames = [frame(index / 59) for index in range(60)]
    iio.imwrite(OUTPUT, frames, fps=15, codec="libx264", quality=8, macro_block_size=16)
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
