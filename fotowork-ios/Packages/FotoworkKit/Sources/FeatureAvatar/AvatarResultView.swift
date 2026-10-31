import SwiftUI
import FotoworkDesign

struct AvatarResultView: View {
    @Environment(\.dismiss) private var dismiss
    let image: UIImage
    @State private var share: SharePayload?

    var body: some View {
        ZStack {
            FotoworkBackground()
            VStack(spacing: 22) {
                Text("Avatar của anh")
                    .font(.bvp(.title3, .bold))
                    .foregroundStyle(Fotowork.Palette.textPrimary)

                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 300, maxHeight: 300)
                    .shadow(color: .black.opacity(0.4), radius: 20, y: 10)

                HStack(spacing: 14) {
                    Button {
                        dismiss()
                    } label: {
                        Text("Tạo lại")
                            .font(.bvp(.headline, .semibold))
                            .foregroundStyle(Fotowork.Palette.primary)
                            .padding(.horizontal, 24).frame(height: 52)
                            .fotoCardCapsule()
                    }
                    .buttonStyle(.plain)

                    PillButton("Lưu / Chia sẻ", systemImage: "square.and.arrow.up") {
                        saveAndShare()
                    }
                }
            }
            .padding(28)
        }
        .sheet(item: $share) { payload in ShareSheet(items: [payload.url]) }
    }

    private func saveAndShare() {
        guard let data = image.pngData() else { return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("fotowork-avatar.png")
        try? data.write(to: url)
        share = SharePayload(url: url)
    }
}
