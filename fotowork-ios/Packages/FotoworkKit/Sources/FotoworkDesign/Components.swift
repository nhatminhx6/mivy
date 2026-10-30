import SwiftUI

// MARK: - Buttons

/// Primary pill CTA with the hero gradient.
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
                Text(title).fontWeight(.semibold)
                if let systemImage {
                    Image(systemName: systemImage)
                }
            }
            .font(.headline)
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 15)
            .background(Fotowork.heroGradient, in: .capsule)
            .shadow(color: Fotowork.Palette.heroStart.opacity(0.55), radius: 16, y: 8)
        }
        .buttonStyle(.plain)
    }
}

/// Glass pill used for the country selector in the header.
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
            HStack(spacing: 5) {
                Text(title).fontWeight(.semibold)
                if let systemImage {
                    Image(systemName: systemImage).font(.caption2.bold())
                }
            }
            .font(.subheadline)
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .glassEffect(.regular.interactive(), in: .capsule)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Tiles

/// Square-ish glass feature tile for the 2×2 home grid.
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
        tint: Color,
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
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: systemImage)
                    .font(.title2)
                    .foregroundStyle(tint)
                    .frame(width: 48, height: 48)
                    .background(tint.opacity(0.18), in: .circle)
                Spacer(minLength: 8)
                Text(title)
                    .font(.title3.bold())
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
            }
            .frame(maxWidth: .infinity, minHeight: 118, alignment: .leading)
            .padding(18)
            .glassEffect(.regular.interactive(), in: .rect(cornerRadius: Fotowork.Radius.tile))
        }
        .buttonStyle(.plain)
    }
}

/// Round glass button for the quick-tools row.
public struct CircleToolButton: View {
    private let title: String
    private let systemImage: String
    private let tint: Color
    private let action: () -> Void

    public init(
        title: String,
        systemImage: String,
        tint: Color = Fotowork.Palette.link,
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
                    .frame(width: 58, height: 58)
                    .glassEffect(.regular.interactive(), in: .circle)
                Text(title)
                    .font(.caption)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
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
                .foregroundStyle(.white)
            Spacer()
            if let action, let actionTitle {
                Button(actionTitle, action: action)
                    .font(.subheadline)
                    .foregroundStyle(Fotowork.Palette.link)
            }
        }
    }
}

/// Simple placeholder screen for features still to come.
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
                    .font(.system(size: 52))
                    .foregroundStyle(Fotowork.Palette.link)
                Text(title)
                    .font(.largeTitle.bold())
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
                Text("Sắp ra mắt")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 9)
                    .glassEffect(.regular, in: .capsule)
            }
            .padding(32)
        }
    }
}
