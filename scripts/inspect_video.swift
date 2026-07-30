import Foundation
import AVFoundation
import AppKit

guard CommandLine.arguments.count >= 3 else {
    fputs("usage: inspect_video.swift <input.mov> <output-dir>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

let asset = AVURLAsset(url: inputURL)
let durationSeconds = CMTimeGetSeconds(asset.duration)
guard durationSeconds.isFinite, durationSeconds > 0,
      let videoTrack = asset.tracks(withMediaType: .video).first else {
    fputs("Could not read video track\n", stderr)
    exit(3)
}

let transformedRect = CGRect(origin: .zero, size: videoTrack.naturalSize)
    .applying(videoTrack.preferredTransform)
let displayWidth = abs(transformedRect.width)
let displayHeight = abs(transformedRect.height)
let hasAudio = !asset.tracks(withMediaType: .audio).isEmpty

let requestedSampleCount = CommandLine.arguments.count >= 4 ? Int(CommandLine.arguments[3]) : nil
let sampleCount = requestedSampleCount ?? min(16, max(8, Int(ceil(durationSeconds / 3.0))))
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 640, height: 640)
generator.requestedTimeToleranceBefore = CMTime(seconds: 0.08, preferredTimescale: 600)
generator.requestedTimeToleranceAfter = CMTime(seconds: 0.08, preferredTimescale: 600)

var samples: [(time: Double, image: NSImage)] = []
for index in 0..<sampleCount {
    let fraction = sampleCount == 1 ? 0.0 : Double(index) / Double(sampleCount - 1)
    let second = min(max(0, durationSeconds * fraction), max(0, durationSeconds - 0.05))
    let requestedTime = CMTime(seconds: second, preferredTimescale: 600)
    do {
        let cgImage = try generator.copyCGImage(at: requestedTime, actualTime: nil)
        samples.append((second, NSImage(cgImage: cgImage, size: .zero)))
    } catch {
        fputs("frame \(index) failed: \(error)\n", stderr)
    }
}

let columns = sampleCount > 20 ? 6 : 4
let thumbWidth: CGFloat = sampleCount > 20 ? 320 : 480
let aspect = displayHeight / max(displayWidth, 1)
let imageHeight = thumbWidth * aspect
let labelHeight: CGFloat = 34
let cellHeight = imageHeight + labelHeight
let rows = Int(ceil(Double(samples.count) / Double(columns)))
let sheetSize = CGSize(width: thumbWidth * CGFloat(columns), height: cellHeight * CGFloat(rows))
let sheet = NSImage(size: sheetSize)
sheet.lockFocus()
NSColor.black.setFill()
NSBezierPath(rect: CGRect(origin: .zero, size: sheetSize)).fill()

for (index, sample) in samples.enumerated() {
    let column = index % columns
    let row = index / columns
    let x = CGFloat(column) * thumbWidth
    let y = sheetSize.height - CGFloat(row + 1) * cellHeight
    sample.image.draw(in: CGRect(x: x, y: y + labelHeight, width: thumbWidth, height: imageHeight),
                      from: .zero,
                      operation: .copy,
                      fraction: 1)
    let label = String(format: "%05.2fs", sample.time)
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.monospacedDigitSystemFont(ofSize: 18, weight: .medium),
        .foregroundColor: NSColor.white
    ]
    label.draw(at: CGPoint(x: x + 10, y: y + 7), withAttributes: attributes)
}
sheet.unlockFocus()

guard let tiff = sheet.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not encode contact sheet\n", stderr)
    exit(4)
}
try png.write(to: outputURL.appendingPathComponent("contact-sheet.png"))

let metadata: [String: Any] = [
    "duration": durationSeconds,
    "displayWidth": displayWidth,
    "displayHeight": displayHeight,
    "nominalFrameRate": videoTrack.nominalFrameRate,
    "estimatedDataRate": videoTrack.estimatedDataRate,
    "hasAudio": hasAudio,
    "sampleCount": samples.count
]
let data = try JSONSerialization.data(withJSONObject: metadata, options: [.prettyPrinted, .sortedKeys])
try data.write(to: outputURL.appendingPathComponent("metadata.json"))
print(String(data: data, encoding: .utf8)!)
