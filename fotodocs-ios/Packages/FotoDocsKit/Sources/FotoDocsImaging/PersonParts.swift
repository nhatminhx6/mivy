import CoreML
import CoreGraphics
import Vision

/// On-device person parsing (MediaPipe Selfie Multiclass 256, Apache-2.0, converted to Core ML — see
/// `Tools/person-parts`): per pixel, how likely it is hair, skin (face or body) or clothes. Used by the suit
/// overlay to tell a neck in shadow from an old T-shirt collar, and hair from clothes.
public struct PersonParts: @unchecked Sendable {
    static let side = 256
    let hair: [Float], skin: [Float], face: [Float], clothes: [Float]      // side × side, rows top-first
    let w: Double, h: Double                                // image the map was made for

    nonisolated(unsafe) private static let model: MLModel? = {   // MLModel prediction is thread-safe
        guard let url = Bundle.module.url(forResource: "PersonParts", withExtension: "mlmodelc", subdirectory: "Models") else { return nil }
        let cfg = MLModelConfiguration()
        cfg.computeUnits = .all
        return try? MLModel(contentsOf: url, configuration: cfg)
    }()

    public static func parse(_ image: CGImage) -> PersonParts? {
        guard let model, let constraint = model.modelDescription.inputDescriptionsByName["image"]?.imageConstraint,
              let input = try? MLFeatureValue(cgImage: image, constraint: constraint,
                                              options: [.cropAndScale: VNImageCropAndScaleOption.scaleFill.rawValue]),
              let provider = try? MLDictionaryFeatureProvider(dictionary: ["image": input]),
              let out = try? model.prediction(from: provider),
              let arr = out.featureValue(for: "classes")?.multiArrayValue else { return nil }
        // 1 × 6 × 256 × 256: background, hair, body skin, face skin, clothes, others
        let n = side * side
        var hair = [Float](repeating: 0, count: n), skin = hair, face = hair, clothes = hair
        let s = arr.strides.map(\.intValue)
        for y in 0..<side {
            for x in 0..<side {
                func v(_ c: Int) -> Float { arr[c * s[1] + y * s[2] + x * s[3]].floatValue }
                let i = y * side + x
                hair[i] = v(1); skin[i] = v(2) + v(3); face[i] = v(3); clothes[i] = v(4)
            }
        }
        // the model's maps come in 4×4 blocks: soften them, or thresholds on them cut stair-stepped edges
        return PersonParts(hair: soften(hair), skin: soften(skin), face: soften(face), clothes: soften(clothes),
                           w: Double(image.width), h: Double(image.height))
    }

    /// Box blur (radius 2) along rows then columns, twice: ~ a Gaussian of 2.5 cells.
    private static func soften(_ a: [Float]) -> [Float] {
        var a = a, t = a
        let r = 2, n = side
        for _ in 0..<2 {
            for y in 0..<n {
                var acc: Float = 0
                for x in -r...r { acc += a[y * n + min(n - 1, max(0, x))] }
                for x in 0..<n {
                    t[y * n + x] = acc / Float(2 * r + 1)
                    acc += a[y * n + min(n - 1, x + r + 1)] - a[y * n + max(0, x - r)]
                }
            }
            for x in 0..<n {
                var acc: Float = 0
                for y in -r...r { acc += t[min(n - 1, max(0, y)) * n + x] }
                for y in 0..<n {
                    a[y * n + x] = acc / Float(2 * r + 1)
                    acc += t[min(n - 1, y + r + 1) * n + x] - t[max(0, y - r) * n + x]
                }
            }
        }
        return a
    }

    private func sample(_ a: [Float], _ x: Double, _ y: Double) -> Double {
        let fx = max(0, min(Double(Self.side - 1), x / w * Double(Self.side) - 0.5))
        let fy = max(0, min(Double(Self.side - 1), y / h * Double(Self.side) - 0.5))
        let x0 = Int(fx), y0 = Int(fy), x1 = min(Self.side - 1, x0 + 1), y1 = min(Self.side - 1, y0 + 1)
        let tx = fx - Double(x0), ty = fy - Double(y0)
        func at(_ xx: Int, _ yy: Int) -> Double { Double(a[yy * Self.side + xx]) }
        return (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) + (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty
    }
    public func hair(_ x: Double, _ y: Double) -> Double { sample(hair, x, y) }
    public func skin(_ x: Double, _ y: Double) -> Double { sample(skin, x, y) }
    /// face skin only (incl. a beard / stubble): not the neck
    public func face(_ x: Double, _ y: Double) -> Double { sample(face, x, y) }
    public func clothes(_ x: Double, _ y: Double) -> Double { sample(clothes, x, y) }
}
