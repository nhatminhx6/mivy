import SwiftUI
import PhotosUI
import FotoDocsImaging
import FotoDocsDesign

/// Any ID-1 card (CCCD, driving licence, health insurance, student, bank) front + back on one A4
/// page at real size. The card is found in the photo and squared up; bank card numbers are hidden.
struct CCCDView: View {
    enum CardKind: String, CaseIterable, Identifiable {
        case cccd = "CCCD / CMND"
        case license = "Bằng lái xe"
        case insurance = "Thẻ BHYT"
        case student = "Thẻ sinh viên"
        case bank = "Thẻ ngân hàng"
        var id: String { rawValue }
        var file: String {
            switch self {
            case .cccd: "cccd"
            case .license: "bang-lai"
            case .insurance: "bhyt"
            case .student: "the-sinh-vien"
            case .bank: "the-ngan-hang"
            }
        }
    }

    @State private var kind: CardKind = .cccd
    @State private var frontItem: PhotosPickerItem?
    @State private var backItem: PhotosPickerItem?
    @State private var frontRaw: UIImage?
    @State private var backRaw: UIImage?
    @State private var front: UIImage?
    @State private var back: UIImage?
    @State private var notCropped: Set<String> = []
    @State private var maskNumbers = true
    @State private var share: SharePayload?
    @State private var busy = false

    var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Ghép 2 mặt thẻ lên một trang A4 đúng cỡ thẻ thật (85.6 × 54 mm) để in. App tự tìm mép thẻ và nắn thẳng ảnh.")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                        .padding(.top, 4)
                    kindPicker
                    cardSlot(title: "Mặt trước", key: "front", image: front, item: $frontItem)
                    cardSlot(title: "Mặt sau", key: "back", image: back, item: $backItem)
                    if kind == .bank {
                        Toggle(isOn: $maskNumbers) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Che số thẻ và mã CVV").font(.bvp(.subheadline, .semibold))
                                Text("Giữ lại 4 số cuối để người nhận đối chiếu.").font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
                            }
                        }
                        .tint(FotoDocs.Palette.primary)
                        .padding(16)
                        .fotoCard(16)
                    }
                    PillButton("Tạo trang A4", systemImage: "doc.fill") { makeA4() }
                        .opacity(front == nil ? 0.5 : 1)
                        .disabled(front == nil || busy)
                }
                .padding(20)
            }
            if busy { ProgressView().controlSize(.large) }
        }
        .navigationTitle("Thẻ hai mặt")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
        .onChange(of: frontItem) { _, item in Task { frontRaw = await load(item); await process() } }
        .onChange(of: backItem) { _, item in Task { backRaw = await load(item); await process() } }
        .onChange(of: kind) { Task { await process() } }
        .onChange(of: maskNumbers) { Task { await process() } }
        .sheet(item: $share) { payload in ShareSheet(items: [payload.url]) }
    }

    private var kindPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(CardKind.allCases) { k in
                    Button { kind = k } label: {
                        Text(k.rawValue)
                            .font(.bvp(.subheadline, .semibold))
                            .foregroundStyle(kind == k ? .white : FotoDocs.Palette.textPrimary)
                            .padding(.horizontal, 14)
                            .frame(height: 38)
                            .background(kind == k ? FotoDocs.Palette.primary : FotoDocs.Palette.surface, in: .capsule)
                            .overlay(Capsule().stroke(kind == k ? .clear : FotoDocs.Palette.border))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func cardSlot(title: String, key: String, image: UIImage?, item: Binding<PhotosPickerItem?>) -> some View {
        PhotosPicker(selection: item, matching: .images) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(title).font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                    Spacer()
                    if notCropped.contains(key) {
                        Text("Chưa thấy mép thẻ · dùng nguyên ảnh").font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.warning)
                    }
                }
                ZStack {
                    if let image {
                        Image(uiImage: image).resizable().scaledToFit()
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "plus.viewfinder").font(.bvp(.largeTitle))
                            Text("Chọn ảnh").font(.bvp(.footnote))
                        }
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                    }
                }
                .frame(height: 170)
                .frame(maxWidth: .infinity)
                .clipShape(.rect(cornerRadius: 16))
                .fotoCard(16)
            }
        }
        .buttonStyle(.plain)
    }

    private func load(_ item: PhotosPickerItem?) async -> UIImage? {
        guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return nil }
        return UIImage(data: data)?.uprightForVision(maxSide: 2400)
    }

    /// Crop + straighten each side; on bank cards hide the number (front) and CVV (back).
    private func process() async {
        busy = true
        defer { busy = false }
        var missed: Set<String> = []
        func side(_ raw: UIImage?, key: String, back: Bool) async -> UIImage? {
            guard let cg = raw?.cgImage else { return nil }
            let card = CardScanner.extractCard(cg)
            if card == nil { missed.insert(key) }
            var out = card ?? cg
            if kind == .bank && maskNumbers { out = await CardScanner.maskCardNumbers(out, back: back) }
            return UIImage(cgImage: out)
        }
        front = await side(frontRaw, key: "front", back: false)
        back = await side(backRaw, key: "back", back: true)
        notCropped = missed
    }

    private func makeA4() {
        guard let front else { return }
        if let url = DocumentBuilder.cccdA4(front: front, back: back, name: "fotodocs-\(kind.file)-a4.pdf") {
            share = SharePayload(url: url)
        }
    }
}
