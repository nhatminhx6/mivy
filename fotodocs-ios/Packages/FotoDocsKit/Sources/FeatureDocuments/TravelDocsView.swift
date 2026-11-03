import SwiftUI
import FotoDocsCore
import FotoDocsDesign

enum VisaExtraRoute: Hashable {
    case itinerary
    case translations
    case translation(String)
}

/// A Codable value kept as one JSON file in Application Support (encrypted at rest).
@MainActor
@Observable
final class LocalJSON<Value: Codable & Equatable> {
    var value: Value {
        didSet { if value != oldValue, let data = try? JSONEncoder().encode(value) { try? data.write(to: url, options: [.atomic, .completeFileProtection]) } }
    }
    private let url: URL

    init(_ name: String, default empty: Value) {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        url = dir.appendingPathComponent(name)
        value = (try? Data(contentsOf: url)).flatMap { try? JSONDecoder().decode(Value.self, from: $0) } ?? empty
    }
}

// MARK: - Itinerary

struct ItineraryView: View {
    let profile: VisaProfile
    @State private var store = LocalJSON("itinerary.json", default: Itinerary())
    @State private var start = Date.now
    @State private var end = Date.now.addingTimeInterval(4 * 86_400)
    @State private var share: SharePayload?

    var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Lịch trình từng ngày (viết bằng tiếng Anh) mà lãnh sự hay yêu cầu. Ô Nơi ở / Liên hệ để trống sẽ lấy theo ngày trước.")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                    VStack(spacing: 10) {
                        TextField("Nước / thành phố đến, vd: Tokyo, Japan", text: $store.value.destination)
                        Divider()
                        DatePicker("Ngày đi", selection: $start, displayedComponents: .date)
                        DatePicker("Ngày về", selection: $end, in: start..., displayedComponents: .date)
                    }
                    .environment(\.locale, Locale(identifier: "vi_VN"))
                    .padding(16)
                    .fotoCard(16)
                    ForEach($store.value.days) { $day in dayCard($day) }
                    if !store.value.days.isEmpty {
                        PillButton("Xuất PDF lịch trình", systemImage: "doc.fill") {
                            share = TravelDocsPDF.itinerary(store.value, profile: profile).map(SharePayload.init)
                        }
                    }
                }
                .padding(20)
                .padding(.bottom, 40)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("Lịch trình chuyến đi")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
        .onAppear {
            if let first = store.value.days.first, let last = store.value.days.last {
                start = first.date.date
                end = last.date.date
            } else {
                store.value.setDates(from: DayDate(start), to: DayDate(end))
            }
        }
        .onChange(of: start) { _, s in
            if end < s { end = s }
            store.value.setDates(from: DayDate(s), to: DayDate(end))
        }
        .onChange(of: end) { _, e in store.value.setDates(from: DayDate(start), to: DayDate(e)) }
        .sheet(item: $share) { ShareSheet(items: [$0.url]) }
    }

    private func dayCard(_ day: Binding<Itinerary.Day>) -> some View {
        let index = (store.value.days.firstIndex { $0.id == day.wrappedValue.id } ?? 0) + 1
        return VStack(alignment: .leading, spacing: 10) {
            Text("Ngày \(index) · \(day.wrappedValue.date.formatted(.dmySlash))")
                .font(.bvp(.subheadline, .bold))
                .foregroundStyle(FotoDocs.Palette.primary)
            TextField("Kế hoạch, vd: Arrive at Narita Airport. Check in hotel.", text: day.plan, axis: .vertical)
                .lineLimit(1...4)
            TextField("Nơi ở, vd: APA Hotel Shinjuku, 1-2-3 Shinjuku, Tokyo", text: day.accommodation, axis: .vertical)
                .lineLimit(1...3)
            TextField("Liên hệ, vd: +81 3 1234 5678", text: day.contact)
        }
        .font(.bvp(.subheadline))
        .padding(16)
        .fotoCard(16)
    }
}

// MARK: - Reference translations

struct TranslationListView: View {
    var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("App điền thông tin giấy tờ của bạn vào mẫu tiếng Anh. Đây là bản dịch tham khảo: bạn cần mang đi công chứng / chứng thực bản dịch trước khi nộp.")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                    ForEach(TranslationTemplate.all) { t in
                        NavigationLink(value: VisaExtraRoute.translation(t.id)) {
                            HStack(spacing: 14) {
                                Image(systemName: t.isLetter ? "envelope.fill" : "doc.text.fill")
                                    .font(.bvp(.title3))
                                    .foregroundStyle(FotoDocs.Palette.primary)
                                    .frame(width: 44, height: 44)
                                    .background(FotoDocs.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(t.nameVi).font(.bvp(.headline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                                    Text(t.titleEn).font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
                                }
                                Spacer(minLength: 4)
                                Image(systemName: "chevron.right").foregroundStyle(FotoDocs.Palette.textMuted)
                            }
                            .padding(16)
                            .fotoCard(16)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Bản dịch giấy tờ")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
    }
}

struct TranslationEditView: View {
    let template: TranslationTemplate
    let profile: VisaProfile
    @State private var store = LocalJSON("translations.json", default: [String: [String: String]]())
    @State private var share: SharePayload?

    private func binding(_ field: TranslationTemplate.Field) -> Binding<String> {
        Binding(
            get: { store.value[template.id]?[field.id] ?? "" },
            set: { store.value[template.id, default: [:]][field.id] = $0 }
        )
    }

    var body: some View {
        Form {
            Section {
                Text(template.isLetter
                     ? "Thư do công ty bạn ký, đóng dấu. Điền bằng tiếng Anh; tên người, công ty tự đổi sang chữ in không dấu."
                     : "Điền theo đúng giấy tờ gốc, bằng tiếng Anh. Tên người tự đổi sang chữ in không dấu.")
                    .font(.bvp(.footnote))
                    .foregroundStyle(FotoDocs.Palette.textSecondary)
            }
            ForEach(Array(template.sections.enumerated()), id: \.offset) { _, section in
                Section(section.title ?? "") {
                    ForEach(section.fields) { field in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(field.vi) · \(field.en)").font(.bvp(.caption, .semibold)).foregroundStyle(FotoDocs.Palette.textSecondary)
                            TextField(field.placeholder.isEmpty ? field.en : field.placeholder, text: binding(field),
                                      axis: field.kind == .multiline ? .vertical : .horizontal)
                                .textInputAutocapitalization(field.kind == .name ? .characters : .sentences)
                        }
                    }
                }
            }
            Section {
                Button {
                    share = TravelDocsPDF.translation(template, values: store.value[template.id] ?? [:]).map(SharePayload.init)
                } label: {
                    Label("Xuất PDF tiếng Anh", systemImage: "doc.fill")
                        .font(.bvp(.headline, .semibold))
                        .foregroundStyle(FotoDocs.Palette.primary)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(FotoDocs.Palette.background)
        .navigationTitle(template.nameVi)
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .onAppear(perform: prefill)
        .sheet(item: $share) { ShareSheet(items: [$0.url]) }
    }

    /// First visit: fill what the visa profile already knows.
    private func prefill() {
        guard store.value[template.id] == nil else { return }
        var values: [String: String] = [:]
        for f in template.fields {
            if let v = f.prefill?(profile), !v.isEmpty { values[f.id] = v }
        }
        store.value[template.id] = values
    }
}
