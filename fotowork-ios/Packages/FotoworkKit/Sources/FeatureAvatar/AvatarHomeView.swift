import SwiftUI
import PhotosUI
import FotoworkDesign

public struct AvatarHomeView: View {
    @State private var category: AvatarCategory = .work
    @State private var selected: AvatarTemplate?
    @State private var consent = false
    @State private var pickerItem: PhotosPickerItem?
    @State private var result: UIImage?
    @State private var isBusy = false
    @State private var showResult = false

    public init() {}

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    private var ready: Bool { selected != nil && consent }

    public var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    categoryTabs
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(AvatarCatalog.templates(for: category)) { template in
                            cell(template)
                        }
                    }
                    consentRow
                    createButton
                    Text("Ảnh xử lý ngay trên máy, không gửi lên máy chủ.")
                        .font(.bvp(.caption))
                        .foregroundStyle(Fotowork.Palette.textSecondary)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 96)
            }
            if isBusy {
                ProgressView().tint(Fotowork.Palette.primary).padding(20).fotoCard()
            }
        }
        .onChange(of: category) { _, _ in selected = nil }
        .onChange(of: pickerItem) { _, item in Task { await create(item) } }
        .fullScreenCover(isPresented: $showResult) {
            if let result { AvatarResultView(image: result) }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Avatar")
                .font(.bvp(.largeTitle, .bold))
                .foregroundStyle(Fotowork.Palette.textPrimary)
            Text("Ảnh đại diện từ ảnh của bạn, xử lý ngay trên máy.")
                .font(.bvp(.subheadline))
                .foregroundStyle(Fotowork.Palette.textSecondary)
        }
    }

    private var categoryTabs: some View {
        HStack(spacing: 4) {
            ForEach(AvatarCategory.allCases) { cat in
                Button { category = cat } label: {
                    Text(cat.rawValue)
                        .font(.bvp(.caption, .bold))
                        .foregroundStyle(category == cat ? Fotowork.Palette.primary : Fotowork.Palette.textSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 38)
                        .background(category == cat ? Fotowork.Palette.primaryTint : .clear, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(5)
        .fotoCard(16)
    }

    private func cell(_ template: AvatarTemplate) -> some View {
        let isSelected = selected?.id == template.id
        let shape: AnyShape = template.shape == .circle ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        return Button { selected = template } label: {
            VStack(spacing: 10) {
                shape
                    .fill(LinearGradient(colors: template.swiftColors, startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 92, height: 92)
                    .overlay(Image(systemName: "person.fill").font(.bvp(size: 40)).foregroundStyle(.white.opacity(0.9)))
                    .overlay(shape.stroke(Fotowork.Palette.borderStrong, lineWidth: 1))
                Text(template.name)
                    .font(.bvp(.footnote, .bold))
                    .foregroundStyle(Fotowork.Palette.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 156)
            .fotoCard()
            .overlay(RoundedRectangle(cornerRadius: Fotowork.Radius.card, style: .continuous).stroke(Fotowork.Palette.primary, lineWidth: isSelected ? 2 : 0))
        }
        .buttonStyle(.plain)
    }

    private var consentRow: some View {
        Button { consent.toggle() } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: consent ? "checkmark.square.fill" : "square")
                    .font(.bvp(.title3))
                    .foregroundStyle(consent ? Fotowork.Palette.primary : Fotowork.Palette.textMuted)
                Text("Đây là ảnh của tôi, hoặc tôi được người trong ảnh cho phép sử dụng.")
                    .font(.bvp(.footnote))
                    .foregroundStyle(Fotowork.Palette.textSecondary)
                    .multilineTextAlignment(.leading)
                Spacer()
            }
        }
        .buttonStyle(.plain)
    }

    private var createButton: some View {
        PhotosPicker(selection: $pickerItem, matching: .images) {
            Text("Chọn ảnh và tạo avatar")
                .font(.bvp(.headline, .semibold))
                .foregroundStyle(ready ? .white : Fotowork.Palette.textMuted)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(ready ? Fotowork.Palette.primary : Fotowork.Palette.track, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .shadow(color: ready ? Fotowork.ctaShadow : .clear, radius: 16, y: 6)
        }
        .disabled(!ready)
    }

    private func create(_ item: PhotosPickerItem?) async {
        guard let item, let template = selected else { return }
        isBusy = true
        defer { isBusy = false }
        guard let data = try? await item.loadTransferable(type: Data.self), let photo = UIImage(data: data) else { return }
        result = AvatarComposer.compose(photo: photo, template: template)
        showResult = true
    }
}
