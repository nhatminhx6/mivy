import SwiftUI
import FotozCore
import FotozDesign

/// "Bạn đang ở đâu?" — pick the applicant's country (8 SEA origins).
struct CountryPickerSheet: View {
    let origins: [OriginPassport]
    let selected: OriginPassport?
    let onPick: (OriginPassport) -> Void

    var body: some View {
        SheetScaffold(title: "Bạn đang ở đâu?", subtitle: "Chọn nơi bạn làm hộ chiếu") {
            ForEach(origins) { origin in
                Button {
                    onPick(origin)
                } label: {
                    PickerRow(
                        title: origin.nameVi,
                        detail: originDetail(origin),
                        leading: origin.id.uppercased(),
                        isSelected: origin.id == selected?.id
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func originDetail(_ origin: OriginPassport) -> String {
        switch origin.photoMode {
        case .selfSupplied: return origin.print?.summary ?? "Tự chuẩn bị ảnh"
        case .selfSuppliedAbroad: return origin.print?.summary ?? "Tự chuẩn bị (ở nước ngoài)"
        case .liveCapture: return "Chụp tại cơ quan"
        case .uncertain: return "Chưa có quy chuẩn"
        }
    }
}

/// "Xin visa đi đâu?" — pick a visa destination (8 countries from presets.json).
struct VisaPickerSheet: View {
    let destinations: [VisaDestination]

    var body: some View {
        SheetScaffold(title: "Xin visa đi đâu?", subtitle: "Kích thước & nền theo cơ quan lãnh sự") {
            ForEach(destinations) { destination in
                PickerRow(
                    title: destination.nameVi,
                    detail: visaDetail(destination),
                    leading: destination.id.uppercased(),
                    isSelected: false
                )
            }
        }
    }

    private func visaDetail(_ destination: VisaDestination) -> String {
        let size = destination.sizeLabel
        if let background = destination.background {
            return "\(size) · nền \(background.contains("white") ? "trắng" : background)"
        }
        return size
    }
}

// MARK: - Shared sheet pieces

private struct SheetScaffold<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content

    var body: some View {
        ZStack {
            FotozBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    Text(title)
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(Fotoz.Palette.textSecondary)
                    VStack(spacing: 10) {
                        content
                    }
                    .padding(.top, 12)
                }
                .padding(22)
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationBackground(.clear)
    }
}

private struct PickerRow: View {
    let title: String
    let detail: String
    let leading: String
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 14) {
            Text(leading)
                .font(.caption.bold())
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(Fotoz.Palette.heroStart.opacity(0.35), in: .circle)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.white)
                Text(detail)
                    .font(.footnote)
                    .foregroundStyle(Fotoz.Palette.textSecondary)
            }
            Spacer()
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Fotoz.Palette.green)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular, in: .rect(cornerRadius: 20))
    }
}
