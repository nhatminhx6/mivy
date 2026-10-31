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
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14),
    ]

    private var ready: Bool { selected != nil && consent }

    public var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Avatar")
                        .font(.largeTitle.bold())
                        .foregroundStyle(.white)
                        .padding(.top, 8)

                    Picker("", selection: $category) {
                        ForEach(AvatarCategory.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    LazyVGrid(columns: columns, spacing: 14) {
                        ForEach(AvatarCatalog.templates(for: category)) { template in
                            cell(template)
                        }
                    }

                    consentRow

                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        HStack(spacing: 8) {
                            Image(systemName: "wand.and.stars")
                            Text("Chọn ảnh & tạo").fontWeight(.semibold)
                        }
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(Fotowork.heroGradient, in: .capsule)
                        .shadow(color: Fotowork.Palette.heroStart.opacity(0.5), radius: 14, y: 6)
                    }
                    .disabled(!ready)
                    .opacity(ready ? 1 : 0.4)

                    Text("Ảnh được xử lý ngay trên máy, không gửi lên máy chủ. Nền được ghép bằng code.")
                        .font(.caption)
                        .foregroundStyle(Fotowork.Palette.textSecondary)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 96)
            }
            if isBusy {
                ProgressView().tint(.white)
                    .padding(20)
                    .glassEffect(.regular, in: .rect(cornerRadius: 16))
            }
        }
        .onChange(of: category) { _, _ in selected = nil }
        .onChange(of: pickerItem) { _, item in Task { await create(item) } }
        .fullScreenCover(isPresented: $showResult) {
            if let result { AvatarResultView(image: result) }
        }
    }

    private func cell(_ template: AvatarTemplate) -> some View {
        let isSelected = selected?.id == template.id
        let shape: AnyShape = template.shape == .circle
            ? AnyShape(Circle())
            : AnyShape(RoundedRectangle(cornerRadius: 22))
        return Button {
            selected = template
        } label: {
            VStack(spacing: 8) {
                shape
                    .fill(LinearGradient(colors: template.swiftColors, startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(height: 120)
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.system(size: 44))
                            .foregroundStyle(.white.opacity(0.85))
                    )
                    .overlay(
                        shape.stroke(isSelected ? Color.white : .clear, lineWidth: 3)
                    )
                Text(template.name)
                    .font(.footnote)
                    .foregroundStyle(isSelected ? .white : Fotowork.Palette.textSecondary)
            }
        }
        .buttonStyle(.plain)
    }

    private var consentRow: some View {
        Button {
            consent.toggle()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: consent ? "checkmark.square.fill" : "square")
                    .font(.title3)
                    .foregroundStyle(consent ? Fotowork.Palette.green : Fotowork.Palette.textSecondary)
                Text("Tôi xác nhận đây là ảnh của tôi hoặc tôi được phép sử dụng.")
                    .font(.footnote)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                Spacer()
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))
        }
        .buttonStyle(.plain)
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
