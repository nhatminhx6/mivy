import SwiftUI
import FotoworkCore
import FotoworkDesign

public struct SettingsHomeView: View {
    @Environment(\.presetStore) private var store
    @State private var researched: String = "—"

    public init() {}

    public var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(spacing: 16) {
                    header
                    card {
                        row(icon: "checkmark.seal.fill", tint: Fotowork.Palette.success,
                            title: "Bản quy chuẩn ảnh", value: researched)
                        divider
                        row(icon: "lock.shield.fill", tint: Fotowork.Palette.primary,
                            title: "Xử lý trên máy", value: "Ảnh không rời thiết bị")
                        divider
                        row(icon: "info.circle.fill", tint: Fotowork.Palette.textSecondary,
                            title: "Phiên bản", value: "1.0")
                    }
                    Text("Kích thước ảnh theo hướng dẫn của cơ quan lãnh sự, cập nhật \(researched). Fotowork không đảm bảo 100% đạt chuẩn.")
                        .font(.footnote)
                        .foregroundStyle(Fotowork.Palette.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .padding(20)
                .padding(.bottom, 96)
            }
        }
        .task {
            if let data = try? store.load() {
                researched = data.researched
            }
        }
    }

    private var header: some View {
        HStack {
            Text("Cài đặt")
                .font(.largeTitle.bold())
                .foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
        }
        .frame(height: 48)
    }

    private func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 0) { content() }
            .padding(6)
            .fotoCard(Fotowork.Radius.tile)
    }

    private func row(icon: String, tint: Color, title: String, value: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .foregroundStyle(tint)
                .frame(width: 38, height: 38)
                .background(tint.opacity(0.12), in: .circle)
            Text(title)
                .foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
            Text(value)
                .foregroundStyle(Fotowork.Palette.textSecondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
    }

    private var divider: some View {
        Rectangle()
            .fill(Fotowork.Palette.border)
            .frame(height: 1)
            .padding(.leading, 64)
    }
}

#Preview {
    SettingsHomeView()
}
