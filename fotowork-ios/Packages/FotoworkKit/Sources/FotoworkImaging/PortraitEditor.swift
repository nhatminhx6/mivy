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
    case keep, vestNavy, vestBlack, womanNavy, womanBlack
    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .keep: "Giữ nguyên"
        case .vestNavy: "Nam xanh"
        case .vestBlack: "Nam đen"
        case .womanNavy: "Nữ xanh"
        case .womanBlack: "Nữ đen"
        }
    }

    /// Bundled body template (`Resources/Garments/<name>.png` + `.json`, generated offline).
    public var templateAsset: String? {
        switch self {
        case .keep: nil
        case .vestNavy: "body-man-navy"
        case .vestBlack: "body-man-black"
        case .womanNavy: "body-woman-navy"
        case .womanBlack: "body-woman-black"
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
    public var outfitTuning = OutfitTuning()

    public init() {}
}

// MARK: - Editor

/// Result of a render. `outfitFitted` is false when an outfit was requested but could not
/// be fitted (no face found / template missing) — the photo is returned without it.
public struct PortraitRender: @unchecked Sendable {
    public let image: CGImage
    public let outfitFitted: Bool
}

/// On-device portrait editor: segments the subject, replaces the background with a
/// solid colour, applies lighting, crops to the preset aspect, and optionally dresses the
/// user in a suit by placing their head on a pre-made body (`HeadSwap`).
public actor PortraitEditor {
    private let context = CIContext(options: [.useSoftwareRenderer: false])
    private var source: CIImage?
    private var mask: CIImage?
    private var bodies: [String: BodyTemplate] = [:]

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
        guard let image = adjusted(settings) else { return nil }
        let crop = Self.aspectCropRect(in: image.extent, aspect: targetAspect, zoom: settings.zoom, offsetY: settings.offsetY)
        return context.createCGImage(image.cropped(to: crop), from: crop)
    }

    /// `render(settings:targetAspect:)` plus the selected outfit. With an outfit the frame comes
    /// from the body template (head placed on it), then zoom / offset are applied to that frame.
    public func renderWithOutfit(settings: EditSettings, targetAspect: CGFloat) -> PortraitRender? {
        guard let name = settings.outfit.templateAsset else {
            return render(settings: settings, targetAspect: targetAspect).map { PortraitRender(image: $0, outfitFitted: true) }
        }
        if bodies[name] == nil { bodies[name] = BodyTemplate.bundled(name) }
        let rgb = settings.background.rgb ?? (1, 1, 1)
        let backdrop = CGColor(srgbRed: rgb.r, green: rgb.g, blue: rgb.b, alpha: 1)
        if let body = bodies[name], let full = adjusted(settings),
           let user = context.createCGImage(full, from: full.extent),
           let dressed = HeadSwap.compose(user: user, body: body, aspect: Double(targetAspect), background: backdrop, tuning: settings.outfitTuning) {
            let ci = CIImage(cgImage: dressed)
            let crop = Self.aspectCropRect(in: ci.extent, aspect: targetAspect, zoom: settings.zoom, offsetY: settings.offsetY)
            if let out = context.createCGImage(ci.cropped(to: crop), from: crop) { return PortraitRender(image: out, outfitFitted: true) }
        }
        return render(settings: settings, targetAspect: targetAspect).map { PortraitRender(image: $0, outfitFitted: false) }
    }

    /// Background replacement + lighting on the full (uncropped) source.
    private func adjusted(_ settings: EditSettings) -> CIImage? {
        guard var image = source else { return nil }
        let extent = image.extent
        if let rgb = settings.background.rgb, let mask {
            let background = CIImage(color: CIColor(red: rgb.r, green: rgb.g, blue: rgb.b)).cropped(to: extent)
            let blend = CIFilter.blendWithMask()
            blend.inputImage = image
            blend.backgroundImage = background
            blend.maskImage = mask
            image = blend.outputImage ?? image
        }
        let colorControls = CIFilter.colorControls()
        colorControls.inputImage = image
        colorControls.brightness = Float(settings.brightness)
        colorControls.contrast = Float(settings.contrast)
        colorControls.saturation = 1
        return colorControls.outputImage?.cropped(to: extent)
    }

    // MARK: Helpers

    private static func foregroundMask(for image: CIImage) -> CIImage? {
        let request = VNGenerateForegroundInstanceMaskRequest()
        VisionCompute.prepare(request)
        let handler = VNImageRequestHandler(ciImage: image, options: [:])
        guard (try? handler.perform([request])) != nil,
              let result = request.results?.first,
              !result.allInstances.isEmpty,
              let buffer = try? result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
        else { return nil }
        return CIImage(cvPixelBuffer: buffer)
    }

    public static func aspectCropRect(in extent: CGRect, aspect: CGFloat, zoom: Double, offsetY: Double) -> CGRect {
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
        target: CaptureTarget,
        backgroundReplaced: Bool = true
    ) -> [ChecklistItem] {
        let neededPx = target.widthMm / 25.4 * 300 * 0.8
        let enoughRes = min(sourcePixels.width, sourcePixels.height) >= neededPx
        // a colour picked but not applied (person could not be cut out) is not a solid background
        let solidBackground = settings.background != .original && backgroundReplaced

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
