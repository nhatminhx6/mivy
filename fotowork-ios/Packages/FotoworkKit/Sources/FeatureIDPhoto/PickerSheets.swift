import SwiftUI
import FotoworkCore
import FotoworkDesign

/// "Bạn đang ở đâu?" — pick the applicant's country (8 SEA origins).
struct CountryPickerSheet: View {
    let origins: [OriginPassport]
    let selected: OriginPassport?
    let onPick: (OriginPassport) -> Void

    var body: some View {
        SheetScaffold(title: "Bạn đang ở đâu?", subtitle: "Dùng để chọn ngôn ngữ, mẫu giấy tờ và giá.") {
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
        case .selfSuppliedAbroad: return origin.print?.summary ?? "Tự chuẩn bị"
        case .liveCapture: return "Chụp tại cơ quan"
        case .uncertain: return "Chưa có quy chuẩn"
        }
    }
}

/// "Xin visa đi đâu?" — pick a visa destination (8 countries from presets.json).
struct VisaPickerSheet: View {
    let destinations: [VisaDestination]
    let onPick: (VisaDestination) -> Void

    var body: some View {
        SheetScaffold(title: "Xin visa đi đâu?", subtitle: "Kích thước & nền theo cơ quan lãnh sự.") {
            ForEach(destinations) { destination in
                Button {
                    onPick(destination)
                } label: {
                    PickerRow(
                        title: destination.nameVi,
                        detail: visaDetail(destination),
                        leading: destination.id.uppercased(),
                        isSelected: false
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func visaDetail(_ destination: VisaDestination) -> String {
        destination.sizeLabel
    }
}

// MARK: - Shared sheet pieces

private struct SheetScaffold<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content

    var body: some View {
        ZStack(alignment: .top) {
            FotoworkBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    Capsule()
                        .fill(Fotowork.Palette.borderStrong)
                        .frame(width: 40, height: 5)
                        .frame(maxWidth: .infinity)
                        .padding(.bottom, 8)
                    Text(title)
                        .font(.bvp(.title2, .bold))
                        .foregroundStyle(Fotowork.Palette.textPrimary)
                    Text(subtitle)
                        .font(.bvp(.subheadline))
                        .foregroundStyle(Fotowork.Palette.textSecondary)
                    VStack(spacing: 8) {
                        content
                    }
                    .padding(.top, 12)
                }
                .padding(20)
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.hidden)
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
                .font(.bvp(.caption, .bold))
                .foregroundStyle(Fotowork.Palette.primary)
                .frame(width: 42, height: 42)
                .background(Fotowork.Palette.primaryTint, in: .circle)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.bvp(.body, .semibold))
                    .foregroundStyle(Fotowork.Palette.textPrimary)
                Text(detail)
                    .font(.bvp(.footnote))
                    .foregroundStyle(Fotowork.Palette.textSecondary)
            }
            Spacer()
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Fotowork.Palette.primary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .fotoCard(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Fotowork.Palette.primary, lineWidth: isSelected ? 2 : 0)
        )
    }
}

/// Every size the app can shoot, from the home menu button: Vietnamese ID sizes, passports by
/// country (those with a print spec) and visas.
struct AllSizesSheet: View {
    let origins: [OriginPassport]
    let destinations: [VisaDestination]
    let onPick: (CaptureTarget) -> Void

    var body: some View {
        SheetScaffold(title: "Tất cả cỡ ảnh", subtitle: "Chọn loại ảnh cần chụp.") {
            section("Ảnh thẻ Việt Nam")
            ForEach([CaptureTarget.idCard3x4, .idCard4x6, .jobApplication]) { target in
                row(target, leading: "VN")
            }
            section("Hộ chiếu")
            ForEach(origins.filter { $0.print != nil }) { origin in
                row(.passport(origin), leading: origin.id.uppercased())
            }
            section("Visa")
            ForEach(destinations) { destination in
                row(.visa(destination), leading: destination.id.uppercased())
            }
        }
    }

    private func section(_ title: String) -> some View {
        Text(title)
            .font(.bvp(.footnote, .bold))
            .foregroundStyle(Fotowork.Palette.textSecondary)
            .padding(.top, 10)
    }

    private func row(_ target: CaptureTarget, leading: String) -> some View {
        Button { onPick(target) } label: {
            PickerRow(title: target.title, detail: "\(target.sizeText) · \(target.subtitle)", leading: leading, isSelected: false)
        }
        .buttonStyle(.plain)
    }
}
