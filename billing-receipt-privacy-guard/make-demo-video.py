import os
import subprocess


HERE = os.path.dirname(os.path.abspath(__file__))
REPORTS = os.path.join(HERE, "reports")
FRAME = os.path.join(REPORTS, "demo-frame.png")
OUTPUT = os.path.join(REPORTS, "demo.mp4")
os.makedirs(REPORTS, exist_ok=True)


def draw_frame_with_pillow():
  from PIL import Image, ImageDraw, ImageFont

  image = Image.new("RGB", (1280, 720), "#102027")
  draw = ImageDraw.Draw(image)
  draw.rounded_rectangle((54, 58, 1226, 662), radius=16, fill="#17313a", outline="#9bd67a", width=4)

  try:
    title_font = ImageFont.truetype("arial.ttf", 48)
    body_font = ImageFont.truetype("arial.ttf", 30)
    note_font = ImageFont.truetype("arial.ttf", 26)
  except OSError:
    title_font = ImageFont.load_default()
    body_font = ImageFont.load_default()
    note_font = ImageFont.load_default()

  draw.text((96, 102), "Billing Receipt Privacy Guard", fill="white", font=title_font)
  draw.text((96, 190), "Safe receipts keep only allowed provider metadata", fill="#dff5d5", font=body_font)
  draw.text((96, 248), "Private project and dataset details are redacted", fill="#dff5d5", font=body_font)
  draw.text((96, 306), "Unsafe receipts are held for finance review", fill="#dff5d5", font=body_font)
  draw.text((96, 364), "Sparse provider batches produce deterministic empty evidence", fill="#dff5d5", font=body_font)
  draw.text((96, 422), "Malformed line items become repair evidence, not runtime failures", fill="#dff5d5", font=body_font)
  draw.text((96, 514), "Synthetic data only. No payment, customer, or workspace systems are called.", fill="#ffd37a", font=note_font)

  image.save(FRAME)


draw_frame_with_pillow()

cmd = [
  "ffmpeg",
  "-y",
  "-loop",
  "1",
  "-i",
  FRAME,
  "-t",
  "4",
  "-r",
  "30",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  OUTPUT,
]

subprocess.run(cmd, check=True)
if os.path.exists(FRAME):
  os.remove(FRAME)
print(f"Wrote {os.path.relpath(OUTPUT, HERE)}")
