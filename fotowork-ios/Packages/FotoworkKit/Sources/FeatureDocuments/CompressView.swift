import SwiftUI
import PhotosUI
import FotoworkDesign

struct CompressView: View {
    @State private var item: PhotosPickerItem?
    @State private var image: UIImage?
    @State private var originalKB = 0
    @State private var targetKB = 200
    @State private var resultKB: Int?
    @State private var share: SharePayload?

    private let presets = [100, 200, 500, 1000]

    var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(spacing: 18) {
                    PhotosPicker(selection: $item, matching: .images) {
                        preview
                    }
                    .buttonStyle(.plain)

                    if image != nil {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Dung lượng mục tiêu")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.white)
                            FlowChipsSimple(presets, selected: targetKB) { kb in targetKB = kb }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        if let resultKB {
                            Text("\(originalKB) KB → \(resultKB) KB")
                                .font(.headline)
                                .foregroundStyle(Fotowork.Palette.green)
                        }

                        PillButton("Nén & lưu", systemImage: "arrow.down.circle") {
                            compress()
                        }
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Nén file")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: item) { _, newItem in Task { await loadImage(newItem) } }
        .sheet(item: $share) { payload in ShareSheet(items: [payload.url]) }
    }

    private var preview: some View {
        ZStack {
            if let image {
                Image(uiImage: image).resizable().scaledToFit()
            } else {
                VStack(spacing: 10) {
                    Image(systemName: "photo.badge.plus").font(.system(size: 40))
                    Text("Chọn ảnh cần nén").font(.subheadline)
                }
                .foregroundStyle(Fotowork.Palette.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 220)
        .glassEffect(.regular, in: .rect(cornerRadius: 20))
    }

    private func loadImage(_ item: PhotosPickerItem?) async {
        guard let item, let data = try? await item.loadTransferable(type: Data.self), let ui = UIImage(data: data) else { return }
        image = ui
        originalKB = data.count / 1024
        resultKB = nil
    }

    private func compress() {
        guard let image else { return }
        if let result = DocumentBuilder.compressImage(image, maxKB: targetKB) {
            resultKB = result.kb
            share = SharePayload(url: result.url)
        }
    }
}

private struct FlowChipsSimple: View {
    let values: [Int]
    let selected: Int
    let action: (Int) -> Void

    init(_ values: [Int], selected: Int, action: @escaping (Int) -> Void) {
        self.values = values
        self.selected = selected
        self.action = action
    }

    var body: some View {
        HStack(spacing: 10) {
            ForEach(values, id: \.self) { kb in
                Button { action(kb) } label: {
                    Text("\(kb) KB")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .glassEffect(selected == kb ? .regular.tint(Fotowork.Palette.heroMid).interactive() : .regular.interactive(), in: .capsule)
                }
                .buttonStyle(.plain)
            }
        }
    }
}
