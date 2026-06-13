from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / "reports"
FRAMES = ROOT / "frames"


def load_font(size):
    candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def draw_frame(path, title, subtitle, accent, bullets):
    image = Image.new("RGB", (1280, 720), "#111827")
    draw = ImageDraw.Draw(image)
    title_font = load_font(46)
    subtitle_font = load_font(27)
    bullet_font = load_font(24)

    draw.rectangle((0, 0, 1280, 18), fill=accent)
    draw.text((70, 82), title, fill="#f9fafb", font=title_font)
    draw.text((74, 153), subtitle, fill="#d1d5db", font=subtitle_font)

    y = 242
    for bullet in bullets:
        draw.rounded_rectangle((84, y + 4, 106, y + 26), radius=5, fill=accent)
        draw.text((130, y), bullet, fill="#e5e7eb", font=bullet_font)
        y += 62

    footer = "Synthetic manuscript data only - no external services, credentials, or private research records"
    draw.text((74, 656), footer, fill="#9ca3af", font=load_font(19))
    image.save(path)


def main():
    REPORTS.mkdir(exist_ok=True)
    FRAMES.mkdir(exist_ok=True)

    slides = [
        (
            "Structured Abstract Consistency Assistant",
            "Issue #16 AI peer-review readiness slice",
            "#60a5fa",
            [
                "Runs before AI peer-review packets or editor summaries are shown",
                "Checks abstract sections against methods, results, and limitations",
                "Produces deterministic JSON, Markdown, SVG, and digest evidence",
            ],
        ),
        (
            "Blocked Abstract",
            "Claims conflict with methods and result evidence",
            "#ef4444",
            [
                "Sample size and study design differ from the methods packet",
                "Negated design wording cannot satisfy method alignment",
                "Hyphenated measurements cannot masquerade as sample-size counts",
                "Result text implies improvement despite no clear effect",
            ],
        ),
        (
            "Author Revision",
            "Structured abstract is incomplete but evidence-aligned",
            "#f59e0b",
            [
                "Missing conclusions section stays in author revision queue",
                "AI peer-review output remains draft-only until fixed",
                "Editor summary is withheld until the abstract is complete",
            ],
        ),
        (
            "Reviewer Ready",
            "Consistent abstract can proceed to AI review release",
            "#22c55e",
            [
                "Required abstract sections are present",
                "Methods, sample size, endpoint, and result direction align",
                "Limitations and conclusion language stay appropriately bounded",
            ],
        ),
    ]

    frame_paths = []
    for index, slide in enumerate(slides):
        frame_path = FRAMES / f"frame-{index:03d}.png"
        draw_frame(frame_path, *slide)
        frame_paths.append(frame_path)

    concat_file = FRAMES / "frames.txt"
    concat_lines = []
    for frame_path in frame_paths:
        concat_lines.append(f"file '{frame_path.as_posix()}'")
        concat_lines.append("duration 1.5")
    concat_lines.append(f"file '{frame_paths[-1].as_posix()}'")
    concat_file.write_text("\n".join(concat_lines) + "\n", encoding="utf-8")

    output = REPORTS / "demo.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-vf",
            "fps=24,format=yuv420p",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    print(f"wrote {output}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"demo video generation failed: {exc}", file=sys.stderr)
        raise
