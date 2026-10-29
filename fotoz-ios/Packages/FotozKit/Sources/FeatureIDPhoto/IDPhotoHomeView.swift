import SwiftUI
import FotozCore
import FotozDesign

public struct IDPhotoHomeView: View {
    @Environment(\.presetStore) private var store
    @State private var model = IDPhotoViewModel()
    @State private var showCountrySheet = false
    @State private var showVisaSheet = false

    public init() {}

    private let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14),
    ]

    public var body: some View {
        ZStack {
            FotozBackground()
            ScrollView {
                VStack(spacing: 18) {
                    header
                    hero
                    grid
                    quickTools
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 96)
            }
        }
        .task { model.loadIfNeeded(using: store) }
        .sheet(isPresented: $showCountrySheet) {
            CountryPickerSheet(origins: model.origins, selected: model.selectedOrigin) { origin in
                model.selectedOrigin = origin
                showCountrySheet = false
            }
        }
        .sheet(isPresented: $showVisaSheet) {
            VisaPickerSheet(destinations: model.visaDestinations)
        }
    }

    // MARK: Header

    private var header: some View {
        HStack {
            Button {
                // menu — hooked up in a later step
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
            .buttonStyle(.plain)

            Spacer()

            Text("Fotoz")
                .font(.title2.bold())
                .foregroundStyle(.white)

            Spacer()

            GlassPill(model.originCode) {
                showCountrySheet = true
            }
        }
    }

    // MARK: Hero

    private var hero: some View {
        ZStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Chụp ảnh thẻ")
                    .font(.largeTitle.bold())
                    .foregroundStyle(.white)
                Text("Hộ chiếu · \(model.passportSizeText) · nền trắng")
                    .font(.headline.weight(.medium))
                    .foregroundStyle(.white.opacity(0.92))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
            .padding(.bottom, 30)
            .background(Fotoz.heroGradient, in: .rect(cornerRadius: Fotoz.Radius.card))
            .shadow(color: Fotoz.Palette.heroStart.opacity(0.45), radius: 24, y: 14)

            PillButton("Bắt đầu", systemImage: "arrow.right") {
                // starts the capture flow in a later step
            }
            .offset(y: 24)
        }
        .padding(.bottom, 8)
    }

    // MARK: 2×2 grid

    private var grid: some View {
        LazyVGrid(columns: columns, spacing: 14) {
            GlassTile(title: "3×4", subtitle: "Hồ sơ", systemImage: "person.text.rectangle", tint: Fotoz.Palette.green)
            GlassTile(title: "4×6", subtitle: "Hộ chiếu", systemImage: "book.closed", tint: Fotoz.Palette.link)
            GlassTile(title: "Xin việc", subtitle: "Ghép vest", systemImage: "briefcase", tint: Fotoz.Palette.orange)
            GlassTile(title: "Visa", subtitle: "\(model.visaDestinations.count) nước", systemImage: "airplane", tint: Fotoz.Palette.purple) {
                showVisaSheet = true
            }
        }
    }

    // MARK: Quick tools

    private var quickTools: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader("Công cụ nhanh")
            GlassEffectContainer(spacing: 14) {
                HStack(alignment: .top, spacing: 6) {
                    CircleToolButton(title: "Scan", systemImage: "doc.viewfinder", tint: Fotoz.Palette.link)
                    CircleToolButton(title: "CCCD", systemImage: "person.crop.rectangle", tint: Fotoz.Palette.green)
                    CircleToolButton(title: "Nén file", systemImage: "archivebox", tint: Fotoz.Palette.orange)
                    CircleToolButton(title: "Ký tên", systemImage: "signature", tint: Fotoz.Palette.yellow)
                    CircleToolButton(title: "Avatar", systemImage: "person.crop.circle", tint: Fotoz.Palette.purple)
                }
            }
        }
    }
}

#Preview {
    IDPhotoHomeView()
}
