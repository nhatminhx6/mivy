import SwiftUI
import PhotosUI
import FotoDocsDesign

struct CCCDView: View {
    @State private var frontItem: PhotosPickerItem?
    @State private var backItem: PhotosPickerItem?
    @State private var front: UIImage?
    @State private var back: UIImage?
    @State private var share: SharePayload?
    @State private var isBusy = false

    var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(spacing: 18) {
                    Text("Ghép 2 mặt CCCD/CMND lên một trang A4 đúng kích thước thẻ (85.6 × 54 mm) để in.")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 4)

                    cardSlot(title: "Mặt trước", image: front, item: $frontItem)
                    cardSlot(title: "Mặt sau", image: back, item: $backItem)

                    PillButton("Tạo trang A4", systemImage: "doc.fill") {
                        makeA4()
                    }
                    .opacity(front == nil ? 0.5 : 1)
                    .disabled(front == nil || isBusy)
                }
                .padding(20)
            }
        }
        .navigationTitle("CCCD 2 mặt")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
        .onChange(of: frontItem) { _, item in Task { front = await load(item) } }
        .onChange(of: backItem) { _, item in Task { back = await load(item) } }
        .sheet(item: $share) { payload in ShareSheet(items: [payload.url]) }
    }

    private func cardSlot(title: String, image: UIImage?, item: Binding<PhotosPickerItem?>) -> some View {
        PhotosPicker(selection: item, matching: .images) {
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                ZStack {
                    if let image {
                        Image(uiImage: image).resizable().scaledToFill()
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "plus.viewfinder").font(.bvp(.largeTitle))
                            Text("Chọn ảnh").font(.bvp(.footnote))
                        }
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                    }
                }
                .frame(height: 150)
                .frame(maxWidth: .infinity)
                .clipShape(.rect(cornerRadius: 16))
                .fotoCard(16)
            }
        }
        .buttonStyle(.plain)
    }

    private func load(_ item: PhotosPickerItem?) async -> UIImage? {
        guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return nil }
        return UIImage(data: data)
    }

    private func makeA4() {
        guard let front else { return }
        isBusy = true
        defer { isBusy = false }
        if let url = DocumentBuilder.cccdA4(front: front, back: back) {
            share = SharePayload(url: url)
        }
    }
}
