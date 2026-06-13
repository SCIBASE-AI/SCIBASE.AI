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
    image = Image.new("RGB", (1280, 720), "#0f172a")
    draw = ImageDraw.Draw(image)
    title_font = load_font(46)
    subtitle_font = load_font(27)
    bullet_font = load_font(24)

    draw.rectangle((0, 0, 1280, 18), fill=accent)
    draw.text((70, 82), title, fill="#f8fafc", font=title_font)
    draw.text((74, 153), subtitle, fill="#cbd5e1", font=subtitle_font)

    y = 242
    for bullet in bullets:
        draw.rounded_rectangle((84, y + 4, 106, y + 26), radius=5, fill=accent)
        draw.text((130, y), bullet, fill="#e5e7eb", font=bullet_font)
        y += 62

    footer = "Synthetic import data only - no external services, credentials, collaborators, or private manuscripts"
    draw.text((74, 656), footer, fill="#94a3b8", font=load_font(19))
    image.save(path)


def main():
    REPORTS.mkdir(exist_ok=True)
    FRAMES.mkdir(exist_ok=True)

    slides = [
        (
            "Clipboard Import Provenance Guard",
            "Issue #12 real-time collaborative editor slice",
            "#38bdf8",
            [
                "Runs before clipboard or imported blocks enter a shared manuscript",
                "Keeps the editor focused on visible, attributable scientific content",
                "Produces deterministic JSON, Markdown, SVG, and digest evidence",
            ],
        ),
        (
            "Quarantine Unsafe Paste",
            "Hidden instructions, formulas, local paths, stale review metadata",
            "#ef4444",
            [
                "Blocks untrusted rich text from direct collaborative insertion",
                "Escapes spreadsheet formula cells before renderer handoff",
                "Redacts private source origins, notebook paths, and table cells",
            ],
        ),
        (
            "Curator Review Lane",
            "Partner imports without signed source attestation",
            "#f59e0b",
            [
                "Stages partner-supplied documents for curator review",
                "Stages trusted claims from unsupported import channels",
                "Stages malformed payload shapes before any shared insertion",
                "Watermarks reviewer preview instead of treating it as clean content",
            ],
        ),
        (
            "Trusted Import",
            "Attested payload can enter the collaborative manuscript",
            "#22c55e",
            [
                "Allows direct insert for trusted, signed source exports",
                "Preserves stable anchors and clean scientific content",
                "Includes a stable audit digest for downstream review packets",
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
