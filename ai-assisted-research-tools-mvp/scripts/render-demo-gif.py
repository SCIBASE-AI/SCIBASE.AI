from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "docs" / "demo" / "assistant-report-snapshot.json"
OUT = ROOT / "docs" / "demo" / "ai-assisted-research-tools-demo.gif"


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size=size)
    except OSError:
        return ImageFont.load_default()


def draw_frame(title: str, subtitle: str, bullets: list[str]) -> Image.Image:
    image = Image.new("RGB", (1280, 720), "#f5f7fa")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((64, 54, 1216, 666), radius=18, fill="#ffffff", outline="#d8deea", width=2)
    draw.text((104, 94), "SCIBASE.AI AI-Assisted Research Tools", fill="#5d6b81", font=font(24))
    draw.text((104, 138), title, fill="#132238", font=font(50))
    draw.text((104, 210), subtitle, fill="#334155", font=font(28))
    y = 290
    for bullet in bullets:
        draw.rounded_rectangle((104, y, 1176, y + 62), radius=8, fill="#fbfcff", outline="#e1e6ef", width=1)
        draw.text((132, y + 17), bullet[:104], fill="#132238", font=font(24))
        y += 82
    return image


def main() -> None:
    data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    review = data["review"]
    citations = data["citations"][:3]

    frames = [
        draw_frame(
            "Paper summarizer",
            data["manuscript"]["title"][:74],
            data["summaries"]["executive"]["keyFindings"][:3],
        ),
        draw_frame(
            "Peer review aid",
            f"Overall risk: {review['overallRisk']}",
            [f"{item['id']}: {item['severity']}" for item in review["diagnostics"][:4]],
        ),
        draw_frame(
            "Citation tool",
            "Context-aware citation recommendations",
            [f"{item['score']} - {item['title']}" for item in citations],
        ),
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=1800, loop=0)
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
