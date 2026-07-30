import Foundation
import AVFoundation
import AppKit
import QuartzCore
import CoreText

guard CommandLine.arguments.count >= 3 else {
    fputs("usage: edit_social_video.swift <input.mov> <output-dir>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputDirectory = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

let sourceAsset = AVURLAsset(url: inputURL)
guard let sourceVideoTrack = sourceAsset.tracks(withMediaType: .video).first else {
    fputs("No video track found\n", stderr)
    exit(3)
}

enum FramingMode {
    case crop
    case fit
}

struct Clip {
    let sourceStart: Double
    let sourceDuration: Double
    let outputDuration: Double
    let focusX: Double
    let mode: FramingMode
}

struct TimelineClip {
    let definition: Clip
    let range: CMTimeRange
}

// The screen recording is intentionally reshaped into a short narrative:
// result first, then setup, live editing, the strongest spike, and a clean finish.
let clips: [Clip] = [
    Clip(sourceStart: 48.0, sourceDuration: 2.0, outputDuration: 1.8, focusX: 0.58, mode: .crop),
    Clip(sourceStart: 0.0, sourceDuration: 5.6, outputDuration: 3.2, focusX: 0.52, mode: .crop),
    Clip(sourceStart: 15.4, sourceDuration: 10.4, outputDuration: 5.5, focusX: 0.27, mode: .crop),
    Clip(sourceStart: 27.4, sourceDuration: 4.4, outputDuration: 2.6, focusX: 0.55, mode: .crop),
    Clip(sourceStart: 42.0, sourceDuration: 5.8, outputDuration: 3.6, focusX: 0.31, mode: .crop),
    Clip(sourceStart: 48.0, sourceDuration: 8.6, outputDuration: 4.5, focusX: 0.58, mode: .crop),
    Clip(sourceStart: 59.6, sourceDuration: 1.85, outputDuration: 1.8, focusX: 0.50, mode: .fit)
]

let composition = AVMutableComposition()
guard let compositionVideoTrack = composition.addMutableTrack(
    withMediaType: .video,
    preferredTrackID: kCMPersistentTrackID_Invalid
) else {
    fputs("Could not create composition video track\n", stderr)
    exit(4)
}

var cursor = CMTime.zero
var timelineClips: [TimelineClip] = []
for clip in clips {
    let sourceRange = CMTimeRange(
        start: CMTime(seconds: clip.sourceStart, preferredTimescale: 600),
        duration: CMTime(seconds: clip.sourceDuration, preferredTimescale: 600)
    )
    try compositionVideoTrack.insertTimeRange(sourceRange, of: sourceVideoTrack, at: cursor)
    let insertedRange = CMTimeRange(start: cursor, duration: sourceRange.duration)
    let targetDuration = CMTime(seconds: clip.outputDuration, preferredTimescale: 600)
    compositionVideoTrack.scaleTimeRange(insertedRange, toDuration: targetDuration)
    let timelineRange = CMTimeRange(start: cursor, duration: targetDuration)
    timelineClips.append(TimelineClip(definition: clip, range: timelineRange))
    cursor = cursor + targetDuration
}

let totalDuration = CMTimeGetSeconds(cursor)

// MARK: - Original ambient score

struct SeededRandom {
    var state: UInt64 = 0xA19F_0720_2607_19C3

    mutating func noise() -> Float {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        let normalized = Double(state & 0x00FF_FFFF) / Double(0x00FF_FFFF)
        return Float(normalized * 2.0 - 1.0)
    }
}

func makeAmbientScore(url: URL, duration: Double) throws {
    let sampleRate = 48_000.0
    let totalFrames = AVAudioFrameCount(ceil(duration * sampleRate))
    guard let format = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: sampleRate,
        channels: 2,
        interleaved: false
    ), let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: totalFrames) else {
        throw NSError(domain: "RainfallEdit", code: 10, userInfo: [NSLocalizedDescriptionKey: "Audio allocation failed"])
    }

    buffer.frameLength = totalFrames
    guard let channels = buffer.floatChannelData else {
        throw NSError(domain: "RainfallEdit", code: 11, userInfo: [NSLocalizedDescriptionKey: "Audio channel access failed"])
    }

    var random = SeededRandom()
    var lowNoiseL: Float = 0
    var lowNoiseR: Float = 0
    var rainTailL: Float = 0
    var rainTailR: Float = 0
    let transitionTimes = [0.0, 5.0, 10.5, 13.1, 16.7, 21.2]

    for frame in 0..<Int(totalFrames) {
        let t = Double(frame) / sampleRate
        let fadeIn = min(1.0, t / 1.2)
        let fadeOut = min(1.0, max(0.0, duration - t) / 1.4)
        let masterEnvelope = fadeIn * fadeOut

        let nL = random.noise()
        let nR = random.noise()
        lowNoiseL = lowNoiseL * 0.994 + nL * 0.006
        lowNoiseR = lowNoiseR * 0.994 + nR * 0.006
        let airL = (nL - lowNoiseL) * 0.012
        let airR = (nR - lowNoiseR) * 0.012

        if random.noise() > 0.9968 { rainTailL += 0.11 + abs(random.noise()) * 0.08 }
        if random.noise() > 0.9968 { rainTailR += 0.11 + abs(random.noise()) * 0.08 }
        rainTailL *= 0.966
        rainTailR *= 0.966

        let drift = 0.55 + 0.45 * sin(2.0 * Double.pi * 0.043 * t)
        let padL = sin(2.0 * Double.pi * 55.0 * t) * 0.024 * drift
            + sin(2.0 * Double.pi * 82.41 * t + 0.7) * 0.010
        let padR = sin(2.0 * Double.pi * 55.0 * t + 0.05) * 0.024 * drift
            + sin(2.0 * Double.pi * 82.41 * t + 1.1) * 0.010

        var swell = 0.0
        for marker in transitionTimes {
            let d = (t - marker) / 0.52
            swell += exp(-0.5 * d * d)
        }
        let pulse = sin(2.0 * Double.pi * 48.0 * t) * 0.025 * swell
        let shimmerL = sin(2.0 * Double.pi * 1210.0 * t) * Double(rainTailL) * 0.12
        let shimmerR = sin(2.0 * Double.pi * 1280.0 * t) * Double(rainTailR) * 0.12

        let left = (padL + pulse + Double(airL) + shimmerL) * masterEnvelope * 0.72
        let right = (padR + pulse + Double(airR) + shimmerR) * masterEnvelope * 0.72
        channels[0][frame] = Float(max(-0.92, min(0.92, left)))
        channels[1][frame] = Float(max(-0.92, min(0.92, right)))
    }

    let audioFile = try AVAudioFile(forWriting: url, settings: format.settings)
    try audioFile.write(from: buffer)
}

let musicURL = outputDirectory.appendingPathComponent("rainfall-original-ambient.wav")
try? FileManager.default.removeItem(at: musicURL)
try makeAmbientScore(url: musicURL, duration: totalDuration + 0.15)

let musicAsset = AVURLAsset(url: musicURL)
guard let musicTrack = musicAsset.tracks(withMediaType: .audio).first,
      let compositionAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
      ) else {
    fputs("Could not create music track\n", stderr)
    exit(5)
}
try compositionAudioTrack.insertTimeRange(
    CMTimeRange(start: .zero, duration: cursor),
    of: musicTrack,
    at: .zero
)

let audioParameters = AVMutableAudioMixInputParameters(track: compositionAudioTrack)
audioParameters.setVolumeRamp(
    fromStartVolume: 0.0,
    toEndVolume: 0.72,
    timeRange: CMTimeRange(start: .zero, duration: CMTime(seconds: 1.1, preferredTimescale: 600))
)
audioParameters.setVolumeRamp(
    fromStartVolume: 0.72,
    toEndVolume: 0.0,
    timeRange: CMTimeRange(
        start: CMTime(seconds: max(0, totalDuration - 1.25), preferredTimescale: 600),
        duration: CMTime(seconds: 1.25, preferredTimescale: 600)
    )
)
let audioMix = AVMutableAudioMix()
audioMix.inputParameters = [audioParameters]

// MARK: - Video framing and captions

struct Caption {
    let start: Double
    let end: Double
    let text: String
    let placement: String
}

let chineseCaptions: [Caption] = [
    Caption(start: 0.0, end: 1.8, text: "我没画折线，我让它下雨", placement: "top"),
    Caption(start: 1.8, end: 5.0, text: "24 小时降雨数据 → 珍珠雨", placement: "top"),
    Caption(start: 5.0, end: 10.5, text: "改一个数值，雨幕实时重构", placement: "top"),
    Caption(start: 10.5, end: 13.1, text: "每个小时，都有自己的雨势", placement: "top"),
    Caption(start: 13.1, end: 16.7, text: "从一条曲线，长出一场暴雨", placement: "top"),
    Caption(start: 16.7, end: 21.2, text: "数据不只被看见，也能被感受", placement: "top"),
    Caption(start: 21.2, end: totalDuration, text: "你想把什么数据变成场景？", placement: "bottom")
]

let englishCaptions: [Caption] = [
    Caption(start: 0.0, end: 1.8, text: "I didn't draw a chart. I made it rain.", placement: "top"),
    Caption(start: 1.8, end: 5.0, text: "24 hours of rainfall → a pearl curtain", placement: "top"),
    Caption(start: 5.0, end: 10.5, text: "Change one value. The rain rebuilds.", placement: "top"),
    Caption(start: 10.5, end: 13.1, text: "Every hour has its own weather.", placement: "top"),
    Caption(start: 13.1, end: 16.7, text: "A storm grows from a single curve.", placement: "top"),
    Caption(start: 16.7, end: 21.2, text: "Data can be felt, not just seen.", placement: "top"),
    Caption(start: 21.2, end: totalDuration, text: "What data should become a scene next?", placement: "bottom")
]

func normalizedSourceTransform() -> CGAffineTransform {
    let preferred = sourceVideoTrack.preferredTransform
    let sourceRect = CGRect(origin: .zero, size: sourceVideoTrack.naturalSize).applying(preferred)
    let fixOrigin = CGAffineTransform(translationX: -sourceRect.minX, y: -sourceRect.minY)
    return preferred.concatenating(fixOrigin)
}

func verticalTransform(for clip: Clip) -> CGAffineTransform {
    let sourceWidth = 3860.0
    let sourceHeight = 2408.0
    let renderWidth = 1080.0
    let renderHeight = 1920.0
    let normalized = normalizedSourceTransform()

    switch clip.mode {
    case .fit:
        let cropX = 120.0
        let cropY = 220.0
        let cropWidth = sourceWidth - 240.0
        let cropHeight = sourceHeight - 570.0
        let scale = renderWidth / cropWidth
        let displayedHeight = cropHeight * scale
        let tx = -cropX * scale
        let ty = (renderHeight - displayedHeight) * 0.5 - cropY * scale
        return normalized.concatenating(CGAffineTransform(a: scale, b: 0, c: 0, d: scale, tx: tx, ty: ty))
    case .crop:
        let cropTop = 220.0
        let cropBottom = 350.0
        let visibleHeight = sourceHeight - cropTop - cropBottom
        let targetHeight = 1360.0
        let scale = targetHeight / visibleHeight
        let focusSourceX = sourceWidth * clip.focusX
        var tx = renderWidth * 0.5 - focusSourceX * scale
        let scaledWidth = sourceWidth * scale
        tx = min(0, max(renderWidth - scaledWidth, tx))
        let ty = 280.0 - cropTop * scale
        return normalized.concatenating(CGAffineTransform(a: scale, b: 0, c: 0, d: scale, tx: tx, ty: ty))
    }
}

func landscapeTransform() -> CGAffineTransform {
    let normalized = normalizedSourceTransform()
    let cropY = 220.0
    let cropHeight = 1968.0
    let cropWidth = cropHeight * (16.0 / 9.0)
    let cropX = (3860.0 - cropWidth) * 0.5
    let scale = 1920.0 / cropWidth
    let tx = -cropX * scale
    let ty = (1080.0 - cropHeight * scale) * 0.5 - cropY * scale
    return normalized.concatenating(CGAffineTransform(a: scale, b: 0, c: 0, d: scale, tx: tx, ty: ty))
}

func captionOpacity(at time: Double, caption: Caption, fade: Double) -> CGFloat {
    guard time >= caption.start, time <= caption.end else { return 0 }
    let fadeIn = min(1.0, max(0.0, (time - caption.start) / fade))
    let fadeOut = min(1.0, max(0.0, (caption.end - time) / fade))
    return CGFloat(min(fadeIn, fadeOut))
}

func makeOverlayVideo(
    url: URL,
    renderSize: CGSize,
    captions: [Caption],
    vertical: Bool,
    duration: Double
) throws {
    try? FileManager.default.removeItem(at: url)
    let writer = try AVAssetWriter(outputURL: url, fileType: .mov)
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.proRes4444,
        AVVideoWidthKey: Int(renderSize.width),
        AVVideoHeightKey: Int(renderSize.height)
    ]
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: Int(renderSize.width),
            kCVPixelBufferHeightKey as String: Int(renderSize.height),
            kCVPixelBufferIOSurfacePropertiesKey as String: [:]
        ]
    )
    guard writer.canAdd(input) else {
        throw NSError(domain: "RainfallEdit", code: 30, userInfo: [NSLocalizedDescriptionKey: "Cannot add overlay writer input"])
    }
    writer.add(input)
    guard writer.startWriting() else {
        throw writer.error ?? NSError(domain: "RainfallEdit", code: 31, userInfo: [NSLocalizedDescriptionKey: "Cannot start overlay writer"])
    }
    writer.startSession(atSourceTime: .zero)
    guard let pool = adaptor.pixelBufferPool else {
        throw NSError(domain: "RainfallEdit", code: 32, userInfo: [NSLocalizedDescriptionKey: "No overlay pixel buffer pool"])
    }

    let fps = 30
    let frameCount = Int(ceil(duration * Double(fps)))
    let fade = vertical ? 0.14 : 0.10
    for frameIndex in 0..<frameCount {
        while !input.isReadyForMoreMediaData { usleep(1_000) }
        autoreleasepool {
            var optionalBuffer: CVPixelBuffer?
            guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer) == kCVReturnSuccess,
                  let pixelBuffer = optionalBuffer else { return }
            CVPixelBufferLockBaseAddress(pixelBuffer, [])
            defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
            guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else { return }

            let bitmapInfo = CGBitmapInfo.byteOrder32Little.rawValue
                | CGImageAlphaInfo.premultipliedFirst.rawValue
            guard let context = CGContext(
                data: baseAddress,
                width: Int(renderSize.width),
                height: Int(renderSize.height),
                bitsPerComponent: 8,
                bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: bitmapInfo
            ) else { return }
            context.clear(CGRect(origin: .zero, size: renderSize))

            let graphicsContext = NSGraphicsContext(cgContext: context, flipped: true)
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = graphicsContext

            if vertical {
                NSColor.black.setFill()
                NSBezierPath(rect: CGRect(x: 0, y: 0, width: renderSize.width, height: 350)).fill()
                NSBezierPath(rect: CGRect(x: 0, y: 1470, width: renderSize.width, height: 450)).fill()
            }

            let signatureFontSize: CGFloat = vertical ? 22 : 17
            let signature = NSAttributedString(
                string: "AFTERIMAGE  /  INTERACTIVE DATAVIZ",
                attributes: [
                    .font: NSFont(name: "HelveticaNeue-Medium", size: signatureFontSize)
                        ?? NSFont.systemFont(ofSize: signatureFontSize, weight: .medium),
                    .foregroundColor: NSColor.white.withAlphaComponent(0.48),
                    .kern: 1.2
                ]
            )
            signature.draw(at: vertical ? CGPoint(x: 68, y: 38) : CGPoint(x: 78, y: 26))

            let time = Double(frameIndex) / Double(fps)
            if let caption = captions.first(where: { time >= $0.start && time <= $0.end }) {
                let opacity = captionOpacity(at: time, caption: caption, fade: fade)
                let rect: CGRect
                let fontSize: CGFloat
                if vertical {
                    rect = caption.placement == "bottom"
                        ? CGRect(x: 64, y: 1510, width: renderSize.width - 128, height: 330)
                        : CGRect(x: 64, y: 92, width: renderSize.width - 128, height: 230)
                    fontSize = 62
                } else {
                    rect = caption.placement == "bottom"
                        ? CGRect(x: 76, y: renderSize.height - 265, width: 1040, height: 205)
                        : CGRect(x: 76, y: 62, width: 1040, height: 170)
                    fontSize = 42
                }

                NSColor.black.withAlphaComponent((vertical ? 0.56 : 0.50) * opacity).setFill()
                NSBezierPath(roundedRect: rect, xRadius: vertical ? 22 : 16, yRadius: vertical ? 22 : 16).fill()

                let paragraph = NSMutableParagraphStyle()
                paragraph.alignment = .left
                paragraph.lineSpacing = vertical ? 10 : 5
                let text = NSAttributedString(
                    string: caption.text,
                    attributes: [
                        .font: NSFont(name: "PingFangSC-Semibold", size: fontSize)
                            ?? NSFont.systemFont(ofSize: fontSize, weight: .semibold),
                        .foregroundColor: NSColor.white.withAlphaComponent(opacity),
                        .paragraphStyle: paragraph,
                        .kern: vertical ? 0.4 : 0.2
                    ]
                )
                text.draw(in: rect.insetBy(dx: vertical ? 34 : 28, dy: vertical ? 24 : 18))
            }

            NSGraphicsContext.restoreGraphicsState()
            _ = adaptor.append(pixelBuffer, withPresentationTime: CMTime(value: CMTimeValue(frameIndex), timescale: CMTimeScale(fps)))
        }
    }

    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    guard writer.status == .completed else {
        throw writer.error ?? NSError(domain: "RainfallEdit", code: 33, userInfo: [NSLocalizedDescriptionKey: "Overlay export failed"])
    }
}

func makeTextLayer(
    caption: Caption,
    renderSize: CGSize,
    totalDuration: Double,
    vertical: Bool
) -> CATextLayer {
    let layer = CATextLayer()
    layer.contentsScale = 2.0
    layer.isWrapped = true
    layer.alignmentMode = .left
    layer.opacity = 0
    layer.cornerRadius = vertical ? 22 : 16
    layer.masksToBounds = true
    layer.backgroundColor = NSColor.black.withAlphaComponent(vertical ? 0.52 : 0.46).cgColor

    let fontSize: CGFloat = vertical ? 62 : 48
    layer.string = "  " + caption.text
    layer.font = CTFontCreateWithName("PingFangSC-Semibold" as CFString, fontSize, nil)
    layer.fontSize = fontSize
    layer.foregroundColor = NSColor.white.cgColor

    if vertical {
        if caption.placement == "bottom" {
            layer.frame = CGRect(x: 64, y: 120, width: renderSize.width - 128, height: 330)
        } else {
            layer.frame = CGRect(x: 64, y: renderSize.height - 330, width: renderSize.width - 128, height: 230)
        }
    } else {
        if caption.placement == "bottom" {
            layer.frame = CGRect(x: 76, y: 62, width: 980, height: 225)
        } else {
            layer.frame = CGRect(x: 76, y: renderSize.height - 260, width: 980, height: 170)
        }
    }

    let fade = vertical ? 0.14 : 0.10
    let start = max(0, caption.start)
    let end = min(totalDuration, caption.end)
    let visibleDuration = max(0.2, end - start)
    let animation = CAKeyframeAnimation(keyPath: "opacity")
    animation.beginTime = AVCoreAnimationBeginTimeAtZero + start
    animation.duration = visibleDuration
    animation.values = [0, 1, 1, 0]
    animation.keyTimes = [
        0,
        NSNumber(value: min(0.45, fade / visibleDuration)),
        NSNumber(value: max(0.55, 1.0 - fade / visibleDuration)),
        1
    ]
    animation.fillMode = .both
    animation.isRemovedOnCompletion = false
    layer.add(animation, forKey: "caption-opacity")
    return layer
}

func makeVideoComposition(vertical: Bool, overlayTrack: AVCompositionTrack) -> AVMutableVideoComposition {
    let renderSize = vertical ? CGSize(width: 1080, height: 1920) : CGSize(width: 1920, height: 1080)
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = renderSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)

    var instructions: [AVMutableVideoCompositionInstruction] = []
    for timelineClip in timelineClips {
        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = timelineClip.range
        instruction.backgroundColor = NSColor.black.cgColor
        instruction.enablePostProcessing = true
        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideoTrack)
        let transform = vertical ? verticalTransform(for: timelineClip.definition) : landscapeTransform()
        layerInstruction.setTransform(transform, at: timelineClip.range.start)
        let overlayInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: overlayTrack)
        overlayInstruction.setTransform(
            CGAffineTransform(
                a: 1,
                b: 0,
                c: 0,
                d: -1,
                tx: 0,
                ty: renderSize.height
            ),
            at: timelineClip.range.start
        )
        instruction.layerInstructions = [overlayInstruction, layerInstruction]
        instructions.append(instruction)
    }
    videoComposition.instructions = instructions
    return videoComposition
}

func exportVideo(url: URL, videoComposition: AVMutableVideoComposition) throws {
    try? FileManager.default.removeItem(at: url)
    guard let exporter = AVAssetExportSession(
        asset: composition,
        presetName: AVAssetExportPresetHighestQuality
    ) else {
        throw NSError(domain: "RainfallEdit", code: 20, userInfo: [NSLocalizedDescriptionKey: "Could not create exporter"])
    }
    exporter.outputURL = url
    exporter.outputFileType = .mp4
    exporter.shouldOptimizeForNetworkUse = true
    exporter.videoComposition = videoComposition
    exporter.audioMix = audioMix

    let semaphore = DispatchSemaphore(value: 0)
    exporter.exportAsynchronously { semaphore.signal() }
    semaphore.wait()
    guard exporter.status == .completed else {
        throw exporter.error ?? NSError(domain: "RainfallEdit", code: 21, userInfo: [NSLocalizedDescriptionKey: "Export failed with status \(exporter.status.rawValue)"])
    }
}

let verticalURL = outputDirectory.appendingPathComponent("rainfall-xhs-vertical-1080x1920.mp4")
let landscapeURL = outputDirectory.appendingPathComponent("rainfall-x-landscape-1920x1080.mp4")
let verticalOverlayURL = outputDirectory.appendingPathComponent(".rainfall-overlay-vertical.mov")
let landscapeOverlayURL = outputDirectory.appendingPathComponent(".rainfall-overlay-landscape.mov")

try makeOverlayVideo(
    url: verticalOverlayURL,
    renderSize: CGSize(width: 1080, height: 1920),
    captions: chineseCaptions,
    vertical: true,
    duration: totalDuration
)
try makeOverlayVideo(
    url: landscapeOverlayURL,
    renderSize: CGSize(width: 1920, height: 1080),
    captions: englishCaptions,
    vertical: false,
    duration: totalDuration
)

let verticalOverlayAsset = AVURLAsset(url: verticalOverlayURL)
let landscapeOverlayAsset = AVURLAsset(url: landscapeOverlayURL)
guard let verticalOverlaySourceTrack = verticalOverlayAsset.tracks(withMediaType: .video).first,
      let landscapeOverlaySourceTrack = landscapeOverlayAsset.tracks(withMediaType: .video).first,
      let verticalOverlayTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
      let landscapeOverlayTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fputs("Could not create caption overlay tracks\n", stderr)
    exit(6)
}
try verticalOverlayTrack.insertTimeRange(CMTimeRange(start: .zero, duration: cursor), of: verticalOverlaySourceTrack, at: .zero)
try landscapeOverlayTrack.insertTimeRange(CMTimeRange(start: .zero, duration: cursor), of: landscapeOverlaySourceTrack, at: .zero)

print(String(format: "Editing %.2f seconds from %.2f seconds of source…", totalDuration, CMTimeGetSeconds(sourceAsset.duration)))
try exportVideo(url: verticalURL, videoComposition: makeVideoComposition(vertical: true, overlayTrack: verticalOverlayTrack))
print("Vertical export: \(verticalURL.path)")
try exportVideo(url: landscapeURL, videoComposition: makeVideoComposition(vertical: false, overlayTrack: landscapeOverlayTrack))
print("Landscape export: \(landscapeURL.path)")
try? FileManager.default.removeItem(at: verticalOverlayURL)
try? FileManager.default.removeItem(at: landscapeOverlayURL)
