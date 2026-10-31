import SwiftUI

// MARK: - Buttons

/// Primary CTA: solid navy capsule with white label.
public struct PillButton: View {
    private let title: String
    private let systemImage: String?
    private let action: () -> Void

    public init(_ title: String, systemImage: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text(title).fontWeight(.bold)
                if let systemImage {
                    Image(systemName: systemImage)
                }
            }
            .font(.headline)
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .background(Fotowork.Palette.primary, in: .capsule)
            .shadow(color: Fotowork.ctaShadow, radius: 16, y: 6)
        }
        .buttonStyle(.plain)
    }
}

/// White chip used for the header country selector.
public struct GlassPill: View {
    private let title: String
    private let systemImage: String?
    private let action: () -> Void

    public init(_ title: String, systemImage: String? = "chevron.down", action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title).fontWeight(.semibold)
                if let systemImage {
                    Image(systemName: systemImage).font(.caption2.bold()).foregroundStyle(Fotowork.Palette.textSecondary)
                }
            }
            .font(.subheadline)
            .foregroundStyle(Fotowork.Palette.textPrimary)
            .padding(.horizontal, 14)
            .frame(height: 48)
            .fotoCardCapsule()
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Tiles

/// White feature tile: tinted icon badge, title, subtitle.
public struct GlassTile: View {
    private let title: String
    private let subtitle: String
    private let systemImage: String
    private let tint: Color
    private let action: () -> Void

    public init(
        title: String,
        subtitle: String,
        systemImage: String,
        tint: Color = Fotowork.Palette.primary,
        action: @escaping () -> Void = {}
    ) {
        self.title = title
        self.subtitle = subtitle
        self.systemImage = systemImage
        self.tint = tint
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: systemImage)
                    .font(.title3)
                    .foregroundStyle(tint)
                    .frame(width: 44, height: 44)
                    .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                Spacer(minLength: 6)
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Fotowork.Palette.textPrimary)
                Text(subtitle)
                    .font(.footnote)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
            }
            .frame(maxWidth: .infinity, minHeight: 118, alignment: .leading)
            .padding(16)
            .fotoCard(Fotowork.Radius.tile)
        }
        .buttonStyle(.plain)
    }
}

/// Quick-tool button: tinted rounded square with navy glyph + label.
public struct CircleToolButton: View {
    private let title: String
    private let systemImage: String
    private let tint: Color
    private let action: () -> Void

    public init(
        title: String,
        systemImage: String,
        tint: Color = Fotowork.Palette.primary,
        action: @escaping () -> Void = {}
    ) {
        self.title = title
        self.systemImage = systemImage
        self.tint = tint
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: systemImage)
                    .font(.title3)
                    .foregroundStyle(tint)
                    .frame(width: 60, height: 60)
                    .background(Fotowork.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Fotowork.Palette.textPrimary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Layout helpers

public struct SectionHeader: View {
    private let title: String
    private let actionTitle: String?
    private let action: (() -> Void)?

    public init(_ title: String, actionTitle: String? = nil, action: (() -> Void)? = nil) {
        self.title = title
        self.actionTitle = actionTitle
        self.action = action
    }

    public var body: some View {
        HStack {
            Text(title)
                .font(.headline)
                .foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
            if let action, let actionTitle {
                Button(actionTitle, action: action)
                    .font(.subheadline)
                    .foregroundStyle(Fotowork.Palette.primary)
            }
        }
    }
}

public struct ComingSoonScreen: View {
    private let title: String
    private let subtitle: String
    private let systemImage: String

    public init(title: String, subtitle: String, systemImage: String) {
        self.title = title
        self.subtitle = subtitle
        self.systemImage = systemImage
    }

    public var body: some View {
        ZStack {
            FotoworkBackground()
            VStack(spacing: 16) {
                Image(systemName: systemImage)
                    .font(.system(size: 44))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .frame(width: 92, height: 92)
                    .background(Fotowork.Palette.primaryTint, in: .circle)
                Text(title)
                    .font(.largeTitle.bold())
                    .foregroundStyle(Fotowork.Palette.textPrimary)
                Text(subtitle)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
                Text("Sắp ra mắt")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 9)
                    .background(Fotowork.Palette.primaryTint, in: .capsule)
            }
            .padding(32)
        }
    }
}
