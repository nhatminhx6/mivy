import CoreImage
import CoreImage.CIFilterBuiltins
import Vision
import ImageIO
import FotoworkCore

// MARK: - Settings

public enum BackgroundOption: String, Sendable, CaseIterable, Identifiable {
    case white, blue, gray, original
    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .white: "Trắng"
        case .blue: "Xanh"
        case .gray: "Xám"
        case .original: "Gốc"
        }
    }

    /// RGB for the replaced background. `nil` = keep original.
    var rgb: (r: Double, g: Double, b: Double)? {
        switch self {
        case .white: (1, 1, 1)
        case .blue: (0.227, 0.431, 0.647)
        case .gray: (0.788, 0.804, 0.839)
        case .original: nil
        }
    }
}

public enum OutfitOption: String, Sendable, CaseIterable, Identifiable {
    case keep, vest, shirt, aodai
    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .keep: "Giữ nguyên"
        case .vest: "Vest"
        case .shirt: "Sơ mi"
        case .aodai: "Áo dài"
        }
    }

    /// Asset name for the pre-made outfit template PNG (generated offline).
    var templateAsset: String? {
        switch self {
        case .keep: nil
        case .vest: "outfit-vest"
        case .shirt: "outfit-shirt"
        case .aodai: "outfit-aodai"
        }
    }
}

public struct EditSettings: Sendable, Equatable {
    public var background: BackgroundOption = .white
    public var brightness: Double = 0        // -0.3…0.3
    public var contrast: Double = 1.0        // 0.8…1.2
    public var zoom: Double = 1.0            // 1.0…1.6
    public var offsetY: Double = 0           // -0.2…0.2 (fraction of height; + moves up)
    public var outfit: OutfitOption = .keep

    public init() {}
}

// MARK: - Editor

/// On-device portrait editor: segments the subject, replaces the background with a
/// solid colour, applies lighting, and crops to the preset aspect. Outfit overlay is
/// a template-based slot (templates are pre-made PNGs approved offline).
public actor PortraitEditor {
    private let context = CIContext(options: [.useSoftwareRenderer: false])
    private var source: CIImage?
    private var mask: CIImage?

    public init() {}

    public func prepare(cgImage: CGImage, orientation: CGImagePropertyOrientation) {
        let oriented = CIImage(cgImage: cgImage).oriented(orientation)
        let normalized = oriented.transformed(
            by: CGAffineTransform(translationX: -oriented.extent.origin.x, y: -oriented.extent.origin.y)
        )
        source = normalized
        mask = Self.foregroundMask(for: normalized)
    }

    public func hasMask() -> Bool { mask != nil }

    public func render(settings: EditSettings, targetAspect: CGFloat) -> CGImage? {
        guard var image = source else { return nil }
        let extent = image.extent

        // 1. Background replacement (needs a subject mask).
        if let rgb = settings.background.rgb, let mask {
            let background = CIImage(color: CIColor(red: rgb.r, green: rgb.g, blue: rgb.b))
                .cropped(to: extent)
            let blend = CIFilter.blendWithMask()
            blend.inputImage = image
            blend.backgroundImage = background
            blend.maskImage = mask
            image = blend.outputImage ?? image
        }

        // 2. Lighting.
        let colorControls = CIFilter.colorControls()
        colorControls.inputImage = image
        colorControls.brightness = Float(settings.brightness)
        colorControls.contrast = Float(settings.contrast)
        colorControls.saturation = 1
        image = colorControls.outputImage ?? image

        // 3. Crop to the preset aspect (zoom + vertical offset).
        let crop = Self.aspectCropRect(in: extent, aspect: targetAspect, zoom: settings.zoom, offsetY: settings.offsetY)
        image = image.cropped(to: crop)

        return context.createCGImage(image, from: image.extent)
    }

    // MARK: Helpers

    private static func foregroundMask(for image: CIImage) -> CIImage? {
        let request = VNGenerateForegroundInstanceMaskRequest()
        let handler = VNImageRequestHandler(ciImage: image, options: [:])
        guard (try? handler.perform([request])) != nil,
              let result = request.results?.first,
              !result.allInstances.isEmpty,
              let buffer = try? result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
        else { return nil }
        return CIImage(cvPixelBuffer: buffer)
    }

    static func aspectCropRect(in extent: CGRect, aspect: CGFloat, zoom: Double, offsetY: Double) -> CGRect {
        let sourceAspect = extent.width / extent.height
        var cropW: CGFloat
        var cropH: CGFloat
        if aspect < sourceAspect {
            cropH = extent.height
            cropW = cropH * aspect
        } else {
            cropW = extent.width
            cropH = cropW / aspect
        }
        cropW /= CGFloat(max(zoom, 1))
        cropH /= CGFloat(max(zoom, 1))

        let x = extent.midX - cropW / 2
        let y = extent.midY - cropH / 2 - CGFloat(offsetY) * extent.height

        let clampedX = min(max(x, extent.minX), extent.maxX - cropW)
        let clampedY = min(max(y, extent.minY), extent.maxY - cropH)
        return CGRect(x: clampedX, y: clampedY, width: cropW, height: cropH)
    }
}

// MARK: - Standard checklist

public struct ChecklistItem: Sendable, Identifiable, Equatable {
    public let id: String
    public let label: String
    public let ok: Bool
    /// Not auto-verified; guidance for the user (shown neutral, counts as ok).
    public let advisory: Bool
}

public enum StandardChecklist {
    public static func build(
        face: FaceCheckResult,
        settings: EditSettings,
        sourcePixels: CGSize,
        target: CaptureTarget
    ) -> [ChecklistItem] {
        let neededPx = target.widthMm / 25.4 * 300 * 0.8
        let enoughRes = min(sourcePixels.width, sourcePixels.height) >= neededPx
        let solidBackground = settings.background != .original

        return [
            ChecklistItem(id: "face", label: "Thấy rõ khuôn mặt", ok: face.faceFound, advisory: false),
            ChecklistItem(id: "bright", label: "Đủ sáng, không chói", ok: face.brightnessOK, advisory: false),
            ChecklistItem(id: "straight", label: "Mặt thẳng, không nghiêng", ok: face.straightOK, advisory: false),
            ChecklistItem(id: "ears", label: "Lộ hai tai", ok: face.earsVisible, advisory: false),
            ChecklistItem(id: "bg-solid", label: "Nền đồng màu", ok: solidBackground, advisory: false),
            ChecklistItem(id: "bg-white", label: "Nền sáng đúng chuẩn", ok: solidBackground, advisory: false),
            ChecklistItem(id: "aspect", label: "Đúng tỉ lệ \(target.sizeText)", ok: true, advisory: false),
            ChecklistItem(id: "res", label: "Đủ độ phân giải in", ok: enoughRes, advisory: false),
            ChecklistItem(id: "neutral", label: "Biểu cảm trung tính", ok: true, advisory: true),
            ChecklistItem(id: "noglass", label: "Không kính / vật che", ok: true, advisory: true),
        ]
    }
}
