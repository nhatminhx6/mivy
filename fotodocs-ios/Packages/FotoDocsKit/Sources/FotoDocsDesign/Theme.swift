import SwiftUI

public extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        let red = Double((hex >> 16) & 0xFF) / 255
        let green = Double((hex >> 8) & 0xFF) / 255
        let blue = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
    }
}

/// FotoDocs design tokens — light theme: soft blue-gray ground, white cards,
/// navy primary. (The camera screen is the one dark surface.)
public enum FotoDocs {
    public enum Palette {
        // Base
        public static let background = Color(hex: 0xF4F6FB)
        public static let surface = Color(hex: 0xFFFFFF)
        public static let border = Color(hex: 0xE4E8F1)
        public static let borderStrong = Color(hex: 0xD4DAE8)
        public static let track = Color(hex: 0xE6EAF2)

        // Brand
        public static let primary = Color(hex: 0x1E3A8A)
        public static let primaryDark = Color(hex: 0x15306F)
        public static let primaryTint = Color(hex: 0xEAF0FB)
        public static let onPrimarySoft = Color(hex: 0xD6E0F3)

        // Text
        public static let textPrimary = Color(hex: 0x121726)
        public static let textSecondary = Color(hex: 0x5B6579)
        public static let textMuted = Color(hex: 0x8A92A6)

        // Status
        public static let success = Color(hex: 0x1F7A4D)
        public static let successBright = Color(hex: 0x46C27C)
        public static let warning = Color(hex: 0xB45309)
        public static let warningSoft = Color(hex: 0xF0B45A)
        public static let pro = Color(hex: 0xC2710C)

        // Camera (dark surface)
        public static let cameraBg = Color(hex: 0x2A313E)

        // Category accents (avatar / tiles)
        public static let link = primary
        public static let green = success
        public static let orange = Color(hex: 0xFFA53B)
        public static let red = Color(hex: 0xC8323C)
        public static let redSoft = Color(hex: 0xFF8A8A)
        public static let purple = Color(hex: 0xB57CFF)
        public static let yellow = Color(hex: 0xF5D547)
        public static let lime = Color(hex: 0xC8F051)

        // Legacy aliases (kept so older call sites compile)
        public static let heroStart = primary
        public static let heroMid = primary
        public static let heroEnd = primaryDark
    }

    public enum Radius {
        public static let card: CGFloat = 20
        public static let tile: CGFloat = 20
        public static let hero: CGFloat = 24
        public static let pill: CGFloat = 999
    }

    /// Solid navy "hero" fill (kept as a gradient type for existing call sites).
    public static let heroGradient = LinearGradient(
        colors: [Palette.primary, Palette.primary],
        startPoint: .top, endPoint: .bottom
    )

    public static let cardShadow = Color(hex: 0x121726, alpha: 0.05)
    public static let barShadow = Color(hex: 0x121726, alpha: 0.10)
    public static let ctaShadow = Color(hex: 0x1E3A8A, alpha: 0.28)
}

// MARK: - Card surfaces

public extension View {
    /// White card: subtle border + soft shadow.
    nonisolated func fotoCard(_ cornerRadius: CGFloat = FotoDocs.Radius.card) -> some View {
        background(FotoDocs.Palette.surface, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(FotoDocs.Palette.border, lineWidth: 1)
            )
            .shadow(color: FotoDocs.cardShadow, radius: 2, y: 1)
    }

    nonisolated func fotoCardCircle() -> some View {
        background(FotoDocs.Palette.surface, in: Circle())
            .overlay(Circle().stroke(FotoDocs.Palette.border, lineWidth: 1))
            .shadow(color: FotoDocs.cardShadow, radius: 2, y: 1)
    }

    nonisolated func fotoCardCapsule() -> some View {
        background(FotoDocs.Palette.surface, in: Capsule())
            .overlay(Capsule().stroke(FotoDocs.Palette.border, lineWidth: 1))
            .shadow(color: FotoDocs.cardShadow, radius: 2, y: 1)
    }

    /// Elevated floating surface (bottom bars, sheets).
    nonisolated func fotoBar(_ cornerRadius: CGFloat) -> some View {
        background(FotoDocs.Palette.surface, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(FotoDocs.Palette.border, lineWidth: 1)
            )
            .shadow(color: FotoDocs.barShadow, radius: 24, y: 8)
    }
}
