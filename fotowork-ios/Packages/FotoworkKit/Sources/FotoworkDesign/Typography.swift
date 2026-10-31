import SwiftUI
import CoreText

public enum FotoFontWeight {
    case regular, medium, semibold, bold

    var fontName: String {
        switch self {
        case .regular: "BeVietnamPro-Regular"
        case .medium: "BeVietnamPro-Medium"
        case .semibold: "BeVietnamPro-SemiBold"
        case .bold: "BeVietnamPro-Bold"
        }
    }
}

public extension Font {
    /// Be Vietnam Pro at a text style's reference size (scales with Dynamic Type).
    static func bvp(_ style: Font.TextStyle, _ weight: FotoFontWeight = .regular) -> Font {
        .custom(weight.fontName, size: referenceSize(style), relativeTo: style)
    }

    /// Be Vietnam Pro at a fixed point size.
    static func bvp(size: CGFloat, _ weight: FotoFontWeight = .regular) -> Font {
        .custom(weight.fontName, size: size)
    }

    private static func referenceSize(_ style: Font.TextStyle) -> CGFloat {
        switch style {
        case .largeTitle: 34
        case .title: 28
        case .title2: 22
        case .title3: 20
        case .headline: 17
        case .body: 17
        case .callout: 16
        case .subheadline: 15
        case .footnote: 13
        case .caption: 12
        case .caption2: 11
        default: 17
        }
    }
}

public enum FotoFonts {
    /// Register the bundled Be Vietnam Pro files. Safe to call once at launch.
    public static func register() {
        let bundle = Bundle.module
        let urls = (bundle.urls(forResourcesWithExtension: "ttf", subdirectory: nil) ?? [])
        if !urls.isEmpty {
            CTFontManagerRegisterFontURLs(urls as CFArray, .process, true, nil)
        }
    }
}
