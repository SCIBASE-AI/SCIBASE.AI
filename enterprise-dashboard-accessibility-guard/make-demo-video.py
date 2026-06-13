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
    title_font = load_font(48)
    subtitle_font = load_font(28)
    bullet_font = load_font(25)

    draw.rectangle((0, 0, 1280, 18), fill=accent)
    draw.text((70, 82), title, fill="#f9fafb", font=title_font)
    draw.text((74, 154), subtitle, fill="#d1d5db", font=subtitle_font)

    y = 242
    for bullet in bullets:
        draw.rounded_rectangle((84, y + 4, 106, y + 26), radius=5, fill=accent)
        draw.text((130, y), bullet, fill="#e5e7eb", font=bullet_font)
        y += 64

    draw.text((74, 656), "Synthetic dashboard data only - no SSO, webhook, export, or private institution calls", fill="#9ca3af", font=load_font(20))
    image.save(path)


def main():
    REPORTS.mkdir(exist_ok=True)
    FRAMES.mkdir(exist_ok=True)

    slides = [
        (
            "Enterprise Dashboard Accessibility Guard",
            "Issue #19 admin dashboard release slice",
            "#60a5fa",
            [
                "Gates institutional dashboards before admin release",
                "Checks contrast, labels, keyboard reachability, table summaries, and motion fallbacks",
                "Keeps export and webhook lanes aligned with accessibility readiness",
            ],
        ),
        (
            "Blocked Release",
            "Critical accessibility and privacy issues",
            "#ef4444",
            [
                "Critical metrics fail contrast threshold",
                "Screen-reader labels are missing or expose private data",
                "Keyboard traps and missing table summaries block dashboard and export release",
            ],
        ),
        (
            "Malformed Evidence Hold",
            "Reviewer packet instead of a crash",
            "#f97316",
            [
                "Malformed dashboard component entries become explicit blocker findings",
                "Release lanes stay blocked until component evidence is repaired",
                "Audit packet keeps deterministic remediation actions for maintainers",
            ],
        ),
        (
            "Warning Release",
            "Internal-only until remediated",
            "#f59e0b",
            [
                "Reduced-motion fallback is missing for animated charts",
                "Dashboard and webhook notices stay internal-only",
                "Scheduled exports remain blocked until the fallback is attached",
            ],
        ),
        (
            "Clean Release",
            "Allowed with monitoring",
            "#22c55e",
            [
                "WCAG-oriented signals are all true",
                "Admin dashboard, export, and webhook lanes are allowed",
                "Reviewer packet includes stable SHA-256 audit evidence",
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
