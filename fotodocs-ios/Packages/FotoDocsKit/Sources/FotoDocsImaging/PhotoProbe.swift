import CoreImage
import CoreImage.CIFilterBuiltins
import FotoDocsCore

/// Measures an existing photo file for `OnlinePhotoCheck`. Core Image only (no ML model), so the
/// same numbers come out on the simulator and on a phone.
public enum PhotoProbe {
    private static let context = CIContext(options: [.workingColorSpace: NSNull()])

    public static func input(data: Data, image: CGImage) -> OnlinePhotoCheck.Input {
        let ci = CIImage(cgImage: image)
        let detector = CIDetector(ofType: CIDetectorTypeFace, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
        let face = (detector?.features(in: ci) ?? []).compactMap { $0 as? CIFaceFeature }.max { $0.bounds.width < $1.bounds.width }
        return OnlinePhotoCheck.Input(
            pixelSize: CGSize(width: image.width, height: image.height),
            bytes: data.count,
            isJPEG: data.starts(with: [0xFF, 0xD8, 0xFF]),
            faceFound: face != nil,
            faceHeightRatio: face.map { Double($0.bounds.height) / Double(image.height) },
            borderBrightness: borderBrightness(ci)
        )
    }

    /// Mean luminance of the top band and the two side strips: where the backdrop shows.
    static func borderBrightness(_ image: CIImage) -> Double {
        let e = image.extent
        let bands = [
            CGRect(x: e.minX, y: e.maxY - e.height * 0.12, width: e.width, height: e.height * 0.12),
            CGRect(x: e.minX, y: e.midY, width: e.width * 0.08, height: e.height * 0.38),
            CGRect(x: e.maxX - e.width * 0.08, y: e.midY, width: e.width * 0.08, height: e.height * 0.38),
        ]
        let values = bands.map { average(image, in: $0) }
        return values.reduce(0, +) / Double(values.count)
    }

    private static func average(_ image: CIImage, in rect: CGRect) -> Double {
        let f = CIFilter.areaAverage()
        f.inputImage = image
        f.extent = rect
        guard let out = f.outputImage else { return 0.5 }
        var px = [UInt8](repeating: 0, count: 4)
        context.render(out, toBitmap: &px, rowBytes: 4, bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
                       format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
        return (0.299 * Double(px[0]) + 0.587 * Double(px[1]) + 0.114 * Double(px[2])) / 255
    }
}
