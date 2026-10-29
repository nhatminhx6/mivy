import SwiftUI
import FotozCore
import FotozDesign

public struct SettingsHomeView: View {
    @Environment(\.presetStore) private var store
    @State private var researched: String = "—"

    public init() {}

    public var body: some View {
        ZStack {
            FotozBackground()
            ScrollView {
                VStack(spacing: 14) {
                    header
                    card {
                        row(icon: "checkmark.seal", tint: Fotoz.Palette.green,
                            title: "Bản quy chuẩn ảnh", value: researched)
                        divider
                        row(icon: "lock.shield", tint: Fotoz.Palette.link,
                            title: "Xử lý trên máy", value: "Ảnh không rời thiết bị")
                        divider
                        row(icon: "info.circle", tint: Fotoz.Palette.purple,
                            title: "Phiên bản", value: "1.0")
                    }
                    Text("Kích thước ảnh theo hướng dẫn của cơ quan lãnh sự, cập nhật \(researched). Fotoz không đảm bảo 100% đạt chuẩn.")
                        .font(.footnote)
                        .foregroundStyle(Fotoz.Palette.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .padding(20)
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
                .foregroundStyle(.white)
            Spacer()
        }
        .padding(.top, 8)
    }

    private func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 0) { content() }
            .padding(6)
            .glassEffect(.regular, in: .rect(cornerRadius: Fotoz.Radius.tile))
    }

    private func row(icon: String, tint: Color, title: String, value: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .foregroundStyle(tint)
                .frame(width: 38, height: 38)
                .background(tint.opacity(0.18), in: .circle)
            Text(title)
                .foregroundStyle(.white)
            Spacer()
            Text(value)
                .foregroundStyle(Fotoz.Palette.textSecondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
    }

    private var divider: some View {
        Rectangle()
            .fill(.white.opacity(0.08))
            .frame(height: 1)
            .padding(.leading, 64)
    }
}

#Preview {
    SettingsHomeView()
}
