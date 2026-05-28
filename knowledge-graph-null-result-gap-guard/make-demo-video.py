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
    image = Image.new("RGB", (1280, 720), "#111827")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((58, 70, 1222, 650), radius=18, fill="#1f2937", outline="#38bdf8", width=4)

    title = load_font(42)
    heading = load_font(27)
    body = load_font(24)
    small = load_font(18)

    draw.text((100, 125), "Knowledge Graph Null Result Gap Guard", fill="white", font=title)
    lines = [
        "Preserves null and negative findings as first-class graph signals",
        "Blocks recommendations that hide failed replication evidence",
        "Requires citation and context for null-result edges",
        "Surfaces underexplored concept intersections as knowledge gaps",
        "Redacts reviewer emails and tokens from discovery packets",
        "Emits deterministic JSON, Markdown, SVG, and demo evidence",
    ]

    visible = min(len(lines), 1 + int(progress * len(lines)))
    for index, line in enumerate(lines[:visible]):
        y = 205 + index * 54
        draw.text((100, y), line, fill="#e0f2fe", font=heading if index < 3 else body)

    draw.rounded_rectangle((100, 590, 1080, 615), radius=10, fill="#334155")
    draw.rounded_rectangle((100, 590, 100 + int(980 * progress), 615), radius=10, fill="#38bdf8")
    draw.text((100, 635), "SCIBASE issue #17 Scientific Knowledge Graph - synthetic demo", fill="#bae6fd", font=small)
    return image


def main():
    try:
        import imageio.v3 as iio
    except Exception as exc:  # pragma: no cover - local artifact helper
        raise SystemExit(
            "imageio and imageio-ffmpeg are required to regenerate reports/demo.mp4. "
            "The committed demo.mp4 is already generated for review."
        ) from exc

    frames = [frame(index / 59) for index in range(60)]
    iio.imwrite(OUTPUT, frames, fps=15, codec="libx264", quality=8, macro_block_size=16)
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
