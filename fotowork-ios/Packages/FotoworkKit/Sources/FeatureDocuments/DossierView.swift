import SwiftUI
import SwiftData
import FotoworkDesign

@Model
public final class DossierItem {
    public var title: String
    public var isDone: Bool
    public var createdAt: Date

    public init(title: String, isDone: Bool = false, createdAt: Date = .now) {
        self.title = title
        self.isDone = isDone
        self.createdAt = createdAt
    }
}

struct DossierView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \DossierItem.createdAt) private var items: [DossierItem]
    @State private var newTitle = ""

    private let suggestions = [
        "Ảnh thẻ 4×6", "Ảnh thẻ 3×4", "CMND/CCCD (2 mặt)", "Hộ chiếu",
        "Sổ hộ khẩu", "Giấy khai sinh", "Bằng lái xe",
    ]

    var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    addRow

                    if !items.isEmpty {
                        progressBar
                        VStack(spacing: 10) {
                            ForEach(items) { item in
                                row(item)
                            }
                        }
                    }

                    suggestionsSection
                }
                .padding(20)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Bộ hồ sơ")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var addRow: some View {
        HStack(spacing: 10) {
            TextField("Thêm giấy tờ…", text: $newTitle)
                .textFieldStyle(.plain)
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .glassEffect(.regular, in: .capsule)
                .onSubmit(add)
            Button(action: add) {
                Image(systemName: "plus")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(Fotowork.heroGradient, in: .circle)
            }
            .buttonStyle(.plain)
            .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    private var progressBar: some View {
        let done = items.filter(\.isDone).count
        return HStack {
            Text("Đã có \(done)/\(items.count)")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
            Spacer()
        }
    }

    private func row(_ item: DossierItem) -> some View {
        HStack(spacing: 12) {
            Button {
                item.isDone.toggle()
            } label: {
                Image(systemName: item.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(item.isDone ? Fotowork.Palette.green : Fotowork.Palette.textSecondary)
            }
            .buttonStyle(.plain)

            Text(item.title)
                .foregroundStyle(item.isDone ? Fotowork.Palette.textSecondary : .white)
                .strikethrough(item.isDone)

            Spacer()

            Button {
                context.delete(item)
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(Fotowork.Palette.red.opacity(0.9))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .glassEffect(.regular, in: .rect(cornerRadius: 16))
    }

    private var suggestionsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Gợi ý thêm nhanh")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
            FlowChips(suggestions.filter { title in !items.contains { $0.title == title } }) { title in
                Button {
                    context.insert(DossierItem(title: title))
                } label: {
                    Text(title)
                        .font(.footnote)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .glassEffect(.regular.interactive(), in: .capsule)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func add() {
        let trimmed = newTitle.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        context.insert(DossierItem(title: trimmed))
        newTitle = ""
    }
}

/// Lightweight wrapping chip layout.
private struct FlowChips<Item: Hashable, Content: View>: View {
    let items: [Item]
    @ViewBuilder let content: (Item) -> Content

    init(_ items: [Item], @ViewBuilder content: @escaping (Item) -> Content) {
        self.items = items
        self.content = content
    }

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(items, id: \.self) { content($0) }
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: maxWidth == .infinity ? x : maxWidth, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
