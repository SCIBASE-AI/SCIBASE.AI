from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "docs" / "demo" / "dashboard-snapshot.json"
OUT = ROOT / "docs" / "demo" / "scientific-knowledge-graph-demo.gif"


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size=size)
    except OSError:
        return ImageFont.load_default()


def draw_frame(title: str, subtitle: str, bullets: list[str]) -> Image.Image:
    image = Image.new("RGB", (1280, 720), "#f7f8fb")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((64, 54, 1216, 666), radius=18, fill="#ffffff", outline="#d9dee8", width=2)
    draw.text((104, 94), "SCIBASE.AI Scientific Knowledge Graph", fill="#5b677a", font=font(24))
    draw.text((104, 138), title, fill="#152033", font=font(50))
    draw.text((104, 210), subtitle, fill="#334155", font=font(28))

    y = 290
    for bullet in bullets:
        draw.rounded_rectangle((104, y, 1176, y + 62), radius=8, fill="#fbfcff", outline="#e1e5ee", width=1)
        draw.text((132, y + 17), bullet, fill="#152033", font=font(24))
        y += 82

    return image


def main() -> None:
    data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    stats = data["stats"]
    crispr = data["crisprEntityPage"]
    recs = data["recommendations"][:3]

    frames = [
        draw_frame(
            "Graph overview",
            f"{stats['nodeCount']} nodes, {stats['edgeCount']} edges, {len(stats['byType'])} node types",
            [
                "Typed nodes: papers, datasets, notebooks, protocols, concepts, authors, tools",
                "schema.org JSON-LD export is generated from the same graph model",
                "Snapshot artifact is produced by npm run snapshot"
            ],
        ),
        draw_frame(
            "Entity page",
            f"{crispr['label']} citation reach: {crispr['citationReach']}",
            [
                f"Domains: {', '.join(crispr['domains'])}",
                f"Usage contexts: {len(crispr['usageContexts'])}",
                f"Relationships: {len(crispr['relationships'])}"
            ],
        ),
        draw_frame(
            "AI recommendations",
            "Ranked payloads for sidebar, digest, and discovery mode",
            [f"{item['label']} - score {item['score']}" for item in recs],
        ),
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=1800, loop=0)
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
