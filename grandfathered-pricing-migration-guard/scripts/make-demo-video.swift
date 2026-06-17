import AVFoundation
import CoreGraphics
import CoreText
import Foundation

let outputPath = CommandLine.arguments.dropFirst().first ?? "artifacts/pricing-migration-demo.mp4"
let outputURL = URL(fileURLWithPath: outputPath)
try? FileManager.default.removeItem(at: outputURL)
try FileManager.default.createDirectory(
  at: outputURL.deletingLastPathComponent(),
  withIntermediateDirectories: true
)

let width = 1280
let height = 720
let fps: Int32 = 30
let totalFrames = Int(fps) * 6

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let input = AVAssetWriterInput(
  mediaType: .video,
  outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height
  ]
)
input.expectsMediaDataInRealTime = false

let adaptor = AVAssetWriterInputPixelBufferAdaptor(
  assetWriterInput: input,
  sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height
  ]
)

writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat, _ alpha: CGFloat = 1) -> CGColor {
  CGColor(red: red / 255, green: green / 255, blue: blue / 255, alpha: alpha)
}

func drawText(
  _ context: CGContext,
  _ text: String,
  x: CGFloat,
  y: CGFloat,
  size: CGFloat,
  color textColor: CGColor,
  weight: String = "Regular"
) {
  let font = CTFontCreateWithName("Helvetica-\(weight)" as CFString, size, nil)
  let attributes: [CFString: Any] = [
    kCTFontAttributeName: font,
    kCTForegroundColorAttributeName: textColor
  ]
  let attributed = CFAttributedStringCreate(nil, text as CFString, attributes as CFDictionary)!
  let line = CTLineCreateWithAttributedString(attributed)
  context.textPosition = CGPoint(x: x, y: y)
  CTLineDraw(line, context)
}

func fillRounded(_ context: CGContext, rect: CGRect, radius: CGFloat, fill: CGColor) {
  let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
  context.addPath(path)
  context.setFillColor(fill)
  context.fillPath()
}

func renderFrame(_ buffer: CVPixelBuffer, frame: Int) {
  CVPixelBufferLockBaseAddress(buffer, [])
  defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

  let context = CGContext(
    data: CVPixelBufferGetBaseAddress(buffer),
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
  )!

  context.setFillColor(color(248, 250, 252))
  context.fill(CGRect(x: 0, y: 0, width: width, height: height))
  context.translateBy(x: 0, y: CGFloat(height))
  context.scaleBy(x: 1, y: -1)

  let progress = min(1, CGFloat(frame) / CGFloat(totalFrames - 1))
  let reveal = min(1, progress * 1.35)

  drawText(
    context,
    "Grandfathered Pricing Migration Guard",
    x: 72,
    y: 92,
    size: 44,
    color: color(17, 24, 39),
    weight: "Bold"
  )
  drawText(
    context,
    "Revenue Infrastructure issue #20 - synthetic replay packet",
    x: 74,
    y: 132,
    size: 22,
    color: color(71, 85, 105)
  )

  fillRounded(context, rect: CGRect(x: 74, y: 178, width: 1132, height: 84), radius: 16, fill: color(255, 255, 255))
  drawText(context, "Portfolio result", x: 104, y: 214, size: 24, color: color(15, 23, 42), weight: "Bold")
  drawText(context, "1 release  |  1 review  |  3 holds", x: 104, y: 246, size: 26, color: color(30, 41, 59))

  let barY: CGFloat = 305
  let maxWidth: CGFloat = 1000 * reveal
  fillRounded(context, rect: CGRect(x: 74, y: barY, width: maxWidth * 0.2, height: 36), radius: 8, fill: color(22, 163, 74))
  fillRounded(context, rect: CGRect(x: 74 + maxWidth * 0.2, y: barY, width: maxWidth * 0.2, height: 36), radius: 8, fill: color(202, 138, 4))
  fillRounded(context, rect: CGRect(x: 74 + maxWidth * 0.4, y: barY, width: maxWidth * 0.6, height: 36), radius: 8, fill: color(234, 88, 12))

  let rows = [
    ("Northbridge University Research Office", "RELEASE_INVOICE", color(21, 128, 61)),
    ("Helix Bioinformatics Studio", "REVIEW_BEFORE_RELEASE", color(161, 98, 7)),
    ("Meridian Lab Collaborative", "HOLD_INVOICE", color(194, 65, 12)),
    ("Civic Methods Consortium", "HOLD_INVOICE", color(194, 65, 12)),
    ("Pacific Applied Science Center", "HOLD_INVOICE", color(194, 65, 12))
  ]

  for (index, row) in rows.enumerated() {
    let y = CGFloat(390 + index * 44)
    let rowReveal = progress > CGFloat(index) * 0.12 ? CGFloat(1) : CGFloat(0)
    if rowReveal > 0 {
      fillRounded(context, rect: CGRect(x: 74, y: y - 24, width: 1132, height: 34), radius: 8, fill: color(255, 255, 255))
      drawText(context, row.0, x: 98, y: y, size: 20, color: color(30, 41, 59))
      drawText(context, row.1, x: 820, y: y, size: 20, color: row.2, weight: "Bold")
    }
  }

  drawText(
    context,
    "Checks: notice window, price lock, consent threshold, add-on parity, usage regression, reviewer evidence.",
    x: 74,
    y: 650,
    size: 19,
    color: color(71, 85, 105)
  )
}

for frame in 0..<totalFrames {
  while !input.isReadyForMoreMediaData {
    Thread.sleep(forTimeInterval: 0.01)
  }

  var pixelBuffer: CVPixelBuffer?
  guard let pool = adaptor.pixelBufferPool else {
    fatalError("Missing pixel buffer pool")
  }
  CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
  guard let buffer = pixelBuffer else {
    fatalError("Could not allocate pixel buffer")
  }

  renderFrame(buffer, frame: frame)
  let time = CMTime(value: CMTimeValue(frame), timescale: fps)
  adaptor.append(buffer, withPresentationTime: time)
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting {
  semaphore.signal()
}
semaphore.wait()

if writer.status != .completed {
  let message = writer.error?.localizedDescription ?? "unknown writer error"
  fatalError("Could not write demo video: \(message)")
}

print("Wrote demo video to \(outputPath)")
