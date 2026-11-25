import SwiftUI
import PhotosUI
import UIKit
import FotoDocsCore
import FotoDocsDesign

// "Tạo CV" — the Mivy web CV builder (web/src/app/studio/cv/page.tsx) on the phone: pick a layout, colour and
// font, fill in, get an A4 PDF / PNG. Saved on the device only, no account, no AI.

@MainActor @Observable
final class CVEditorModel {
    var doc: CVDocument {
        didSet {
            guard doc != oldValue else { return }
            save()
            scheduleFit()
        }
    }
    private(set) var k: CGFloat = 1
    private(set) var overflow = false
    private var fitTask: Task<Void, Never>?
    private let url: URL

    init() {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        url = dir.appendingPathComponent("cv.json")
        doc = (try? Data(contentsOf: url)).flatMap { try? JSONDecoder().decode(CVDocument.self, from: $0) } ?? CVDocument()
        refit()
    }

    private func save() {
        if let data = try? JSONEncoder().encode(doc) { try? data.write(to: url, options: [.atomic, .completeFileProtection]) }
    }

    private func scheduleFit() {
        fitTask?.cancel()
        fitTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            self?.refit()
        }
    }

    private func refit() {
        let r = CVFit.fit(doc)
        k = r.k; overflow = r.overflow
    }

    /// layout thumbnails use the current text scale (fitting all 10 on every keystroke made typing lag)
    func thumbnailK(_ layout: CVLayout) -> CGFloat { k }

    func resetSample() { doc.data = .sample }

    /// a picked photo → centre-cropped square, 360×360 JPEG (like the web)
    func setPhoto(_ data: Data?) {
        guard let data, let img = UIImage(data: data) else { doc.data.photo = nil; return }
        let side = min(img.size.width, img.size.height)
        let fmt = UIGraphicsImageRendererFormat.default(); fmt.scale = 1
        let out = UIGraphicsImageRenderer(size: CGSize(width: 360, height: 360), format: fmt).image { _ in
            let sc = 360 / side
            img.draw(in: CGRect(x: -(img.size.width - side) / 2 * sc, y: -(img.size.height - side) / 2 * sc,
                                width: img.size.width * sc, height: img.size.height * sc))
        }
        doc.data.photo = out.jpegData(compressionQuality: 0.9)
    }
}

enum CVExport {
    static func fileName(_ name: String, _ ext: String) -> String {
        let folded = name.replacingOccurrences(of: "đ", with: "d").replacingOccurrences(of: "Đ", with: "D")
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "vi_VN")).lowercased()
        let slug = folded.map { $0.isLetter || $0.isNumber ? String($0) : "-" }.joined()
            .split(separator: "-").joined(separator: "-")
        return "cv" + (slug.isEmpty ? "" : "-" + slug) + "." + ext
    }

    /// A4 PDF with real (selectable) text
    @MainActor static func pdf(_ doc: CVDocument, k: CGFloat) -> URL? {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName(doc.data.name, "pdf"))
        try? FileManager.default.removeItem(at: url)
        let renderer = ImageRenderer(content: CVSheetView(doc: doc, k: k))
        var ok = false
        renderer.render { size, draw in
            var box = CGRect(x: 0, y: 0, width: 595.28, height: 841.89)
            guard let ctx = CGContext(url as CFURL, mediaBox: &box, [kCGPDFContextTitle as String: "CV " + doc.data.name] as CFDictionary) else { return }
            ctx.beginPDFPage(nil)
            ctx.scaleBy(x: box.width / size.width, y: box.height / size.height)
            draw(ctx)
            ctx.endPDFPage()
            ctx.closePDF()
            ok = true
        }
        return ok ? url : nil
    }

    /// 1985×2807 PNG (×2.5 like the web) with the "✳ mivy" mark bottom-right
    @MainActor static func png(_ doc: CVDocument, k: CGFloat) -> URL? {
        let renderer = ImageRenderer(content: CVSheetView(doc: doc, k: k))
        renderer.scale = 2.5
        // the very first render can come back empty (fonts / photo not ready yet): one more try
        guard let img = renderer.uiImage ?? renderer.uiImage else { return nil }
        let fmt = UIGraphicsImageRendererFormat.default(); fmt.scale = 1; fmt.opaque = true
        let px = CGSize(width: img.size.width * img.scale, height: img.size.height * img.scale)
        let marked = UIGraphicsImageRenderer(size: px, format: fmt).image { ctx in
            img.draw(in: CGRect(origin: .zero, size: px))
            let fs = max(16, (px.width * 0.018).rounded()), pad = (px.width * 0.026).rounded()
            let shadow = NSShadow(); shadow.shadowColor = UIColor.black.withAlphaComponent(0.5)
            shadow.shadowBlurRadius = (fs * 0.4).rounded(); shadow.shadowOffset = CGSize(width: 0, height: 1)
            let attrs: [NSAttributedString.Key: Any] = [
                .font: UIFont(name: "BeVietnamPro-ExtraBold", size: fs) ?? .systemFont(ofSize: fs, weight: .heavy),
                .foregroundColor: UIColor.white.withAlphaComponent(0.8), .shadow: shadow,
            ]
            let text = "\u{2733}\u{FE0E} mivy" as NSString   // text presentation: not the green emoji
            let sz = text.size(withAttributes: attrs)
            text.draw(at: CGPoint(x: px.width - pad - sz.width, y: px.height - pad - sz.height), withAttributes: attrs)
            _ = ctx
        }
        guard let data = marked.pngData() else { return nil }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName(doc.data.name, "png"))
        do { try data.write(to: url, options: .atomic); return url } catch { return nil }
    }
}

/// The sheet scaled to the width it is given.
struct CVScaledView: View {
    let doc: CVDocument
    let k: CGFloat

    var body: some View {
        GeometryReader { g in
            CVSheetView(doc: doc, k: k)
                .scaleEffect(g.size.width / cvWidth, anchor: .topLeading)
                .frame(width: g.size.width, height: g.size.height, alignment: .topLeading)
        }
        .aspectRatio(cvWidth / cvHeight, contentMode: .fit)
        .clipped()
    }
}

struct CVEditorView: View {
    @State private var model = CVEditorModel()
    @State private var open: Set<Int> = [1, 3]
    @State private var photoItem: PhotosPickerItem?
    @State private var share: SharePayload?
    @State private var showPreview = false
    @State private var confirmReset = false
    @State private var exporting = false
    @State private var error: String?
    @State private var customColor = Color(cvHex: "#c2410c")

    var body: some View {
        ZStack(alignment: .bottom) {
            FotoDocsBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Chọn mẫu, điền thông tin, tải CV khổ A4 (PDF) gửi nhà tuyển dụng. Nội dung tự lưu trên máy của bạn.")
                        .font(.bvp(.footnote)).foregroundStyle(FotoDocs.Palette.textSecondary)
                    previewCard
                    section(1, "Chọn bố cục (\(CVLayout.allCases.count))") { layouts }
                    section(2, "Màu & font") { colorsAndFonts }
                    section(3, "Thông tin cá nhân") { personal }
                    section(4, "Kinh nghiệm làm việc (\(model.doc.data.jobs.count))") { jobs }
                    section(5, "Học vấn (\(model.doc.data.edus.count))") { edus }
                    section(6, "Kỹ năng & khác") { others }
                    Button("Dùng lại nội dung ví dụ") { confirmReset = true }
                        .font(.bvp(.footnote, .medium)).foregroundStyle(FotoDocs.Palette.textSecondary)
                        .frame(maxWidth: .infinity).padding(.top, 4)
                }
                .padding(.horizontal, 20).padding(.top, 8).padding(.bottom, 120)
            }
            .scrollDismissesKeyboard(.interactively)
            exportBar
        }
        .navigationTitle("Tạo CV")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .sheet(item: $share) { FilePreviewSheet(url: $0.url) }
        .fullScreenCover(isPresented: $showPreview) { fullPreview }
        .confirmationDialog("Xoá hết nội dung đã điền và dùng lại mẫu ví dụ?", isPresented: $confirmReset, titleVisibility: .visible) {
            Button("Dùng lại mẫu ví dụ", role: .destructive) { model.resetSample() }
            Button("Huỷ", role: .cancel) {}
        }
        .alert("Lỗi tạo file", isPresented: .constant(error != nil)) {
            Button("OK") { error = nil }
        } message: { Text(error ?? "") }
        .onChange(of: photoItem) { _, item in
            Task {
                guard let item else { return }
                let data = try? await item.loadTransferable(type: Data.self)
                if data == nil { error = "Không đọc được ảnh" } else { model.setPhoto(data) }
                photoItem = nil
            }
        }
        .onAppear { if let c = model.doc.spec.color { customColor = Color(cvHex: c) } }
    }

    // MARK: preview

    private var previewCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Xem trước").font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                Spacer()
                Text("Khổ A4 · 210 × 297 mm").font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textMuted)
            }
            Button { showPreview = true } label: {
                CVScaledView(doc: model.doc, k: model.k)
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(FotoDocs.Palette.border))
                    .shadow(color: FotoDocs.cardShadow, radius: 6, y: 2)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Xem CV toàn màn hình")
            if model.overflow {
                Label("Nội dung dài quá 1 trang A4 — rút gọn bớt mô tả hoặc bỏ mục ít quan trọng.", systemImage: "exclamationmark.triangle.fill")
                    .font(.bvp(.footnote, .medium)).foregroundStyle(FotoDocs.Palette.warning)
            }
        }
        .padding(14)
        .fotoCard()
    }

    private var fullPreview: some View {
        NavigationStack {
            ScrollView([.vertical]) {
                CVScaledView(doc: model.doc, k: model.k).padding(12)
            }
            .background(Color(white: 0.92))
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Xong") { showPreview = false } } }
            .navigationTitle("Xem trước").navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: sections

    private func section<C: View>(_ n: Int, _ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                withAnimation(.snappy) { if open.contains(n) { open.remove(n) } else { open.insert(n) } }
            } label: {
                HStack {
                    Text("\(n) · \(title)").font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.down").font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(FotoDocs.Palette.textMuted).rotationEffect(.degrees(open.contains(n) ? 180 : 0))
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if open.contains(n) { content() }
        }
        .padding(14)
        .fotoCard()
    }

    private var layouts: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 12) {
            ForEach(CVLayout.allCases) { l in
                let selected = model.doc.spec.layout == l
                Button { model.doc.spec.layout = l } label: {
                    VStack(spacing: 6) {
                        CVScaledView(doc: withLayout(l), k: model.thumbnailK(l))
                            .overlay(RoundedRectangle(cornerRadius: 3).stroke(selected ? FotoDocs.Palette.primary : FotoDocs.Palette.border, lineWidth: selected ? 2 : 1))
                        Text(l.name).font(.bvp(size: 11, selected ? .semibold : .regular))
                            .foregroundStyle(selected ? FotoDocs.Palette.primary : FotoDocs.Palette.textSecondary)
                            .lineLimit(2).multilineTextAlignment(.center)
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func withLayout(_ l: CVLayout) -> CVDocument { var d = model.doc; d.spec.layout = l; return d }

    private var colorsAndFonts: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Màu chủ đạo").font(.bvp(.footnote, .medium)).foregroundStyle(FotoDocs.Palette.textSecondary)
            // 6 equal cells across the card: nothing hides off the edge ("Màu kh…" in a side-scroller)
            HStack(alignment: .top, spacing: 4) {
                ForEach(CVPalette.all, id: \.id) { p in
                    swatch(Color(cvHex: p.accent), p.name, selected: model.doc.spec.palette == p.id) { model.doc.spec.palette = p.id }
                }
                let custom = model.doc.spec.palette == "custom"
                VStack(spacing: 4) {
                    ColorPicker("Màu khác", selection: Binding(get: { customColor }, set: { c in
                        customColor = c
                        model.doc.spec.color = hex(c); model.doc.spec.palette = "custom"
                    }), supportsOpacity: false)
                    .labelsHidden()
                    .frame(width: 30, height: 30)
                    .overlay(Circle().stroke(custom ? FotoDocs.Palette.primary : .clear, lineWidth: 2).padding(-4))
                    Text("Màu khác").font(.bvp(size: 10.5, custom ? .semibold : .regular)).foregroundStyle(FotoDocs.Palette.textSecondary)
                        .multilineTextAlignment(.center).lineLimit(2)
                }
                .padding(.top, 4)
                .frame(maxWidth: .infinity)
            }
            Text("Font tiêu đề").font(.bvp(.footnote, .medium)).foregroundStyle(FotoDocs.Palette.textSecondary)
            HStack(spacing: 8) {
                ForEach(CVFontChoice.allCases) { f in
                    let selected = model.doc.spec.font == f
                    Button { model.doc.spec.font = f } label: {
                        // equal widths, one line each ("Mạnh mẽ" in a wide font used to wrap)
                        Text(f.name).font(CVStyle(p: CVPalette.all[0], font: f, k: 1).head(13))
                            .lineLimit(1).minimumScaleFactor(0.7)
                            .foregroundStyle(selected ? .white : FotoDocs.Palette.textPrimary)
                            .padding(.vertical, 8).padding(.horizontal, 6)
                            .frame(maxWidth: .infinity)
                            .background(Capsule().fill(selected ? FotoDocs.Palette.primary : FotoDocs.Palette.track))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func swatch(_ c: Color, _ name: String, selected: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Circle().fill(c).frame(width: 30, height: 30)
                    .overlay(Circle().stroke(selected ? FotoDocs.Palette.primary : .clear, lineWidth: 2).padding(-4))
                Text(name).font(.bvp(size: 10.5, selected ? .semibold : .regular)).foregroundStyle(FotoDocs.Palette.textSecondary)
                    .multilineTextAlignment(.center).lineLimit(2)
            }
            .padding(.top, 4)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    private func hex(_ c: Color) -> String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(c).getRed(&r, green: &g, blue: &b, alpha: &a)
        func ch(_ v: CGFloat) -> Int { max(0, min(255, Int((v * 255).rounded()))) }
        return String(format: "#%02x%02x%02x", ch(r), ch(g), ch(b))
    }

    private var personal: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Group {
                    if let d = model.doc.data.photo, let img = UIImage(data: d) {
                        Image(uiImage: img).resizable().scaledToFill()
                    } else {
                        ZStack { FotoDocs.Palette.primaryTint; Image(systemName: "person.fill").foregroundStyle(FotoDocs.Palette.primary) }
                    }
                }
                .frame(width: 64, height: 64).clipShape(Circle())
                VStack(alignment: .leading, spacing: 6) {
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        Text(model.doc.data.photo == nil ? "Thêm ảnh đại diện" : "Đổi ảnh").font(.bvp(.footnote, .semibold))
                            .foregroundStyle(FotoDocs.Palette.primary)
                    }
                    if model.doc.data.photo != nil {
                        Button("Bỏ ảnh") { model.setPhoto(nil) }.font(.bvp(.footnote)).foregroundStyle(FotoDocs.Palette.red)
                    }
                    if !model.doc.spec.layout.showsPhoto {
                        Text("Bố cục này không có ảnh").font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textMuted)
                    }
                }
            }
            field("Họ và tên", "Trần Quốc Bảo", $model.doc.data.name)
            field("Vị trí ứng tuyển", "Chuyên viên Marketing", $model.doc.data.title)
            field("Số điện thoại", "0901 234 567", $model.doc.data.phone, keyboard: .phonePad)
            field("Email", "ten@gmail.com", $model.doc.data.email, keyboard: .emailAddress)
            field("Địa chỉ", "Quận 3, TP. Hồ Chí Minh", $model.doc.data.address)
            field("LinkedIn / website", "linkedin.com/in/ten", $model.doc.data.link, keyboard: .URL)
            field("Giới thiệu bản thân", "2–3 câu về kinh nghiệm và điểm mạnh", $model.doc.data.summary, multiline: true)
        }
    }

    private var jobs: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach($model.doc.data.jobs) { $job in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .bottom) {
                        field("Chức danh", "Chức danh", $job.role)
                        deleteButton { model.doc.data.jobs.removeAll { $0.id == job.id } }
                    }
                    field("Công ty", "Công ty", $job.org)
                    field("Thời gian", "03/2023 – nay", $job.time)
                    field("Mô tả", "Mỗi dòng 1 việc / thành tích", $job.desc, multiline: true)
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 14).fill(FotoDocs.Palette.background))
            }
            addButton("Thêm kinh nghiệm") { model.doc.data.jobs.append(CVJob()) }
        }
    }

    private var edus: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach($model.doc.data.edus) { $edu in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .bottom) {
                        field("Bằng cấp / chuyên ngành", "Bằng cấp / chuyên ngành", $edu.degree)
                        deleteButton { model.doc.data.edus.removeAll { $0.id == edu.id } }
                    }
                    field("Trường", "Trường", $edu.school)
                    field("Thời gian", "2017 – 2021", $edu.time)
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 14).fill(FotoDocs.Palette.background))
            }
            addButton("Thêm học vấn") { model.doc.data.edus.append(CVEdu()) }
        }
    }

    private var others: some View {
        VStack(alignment: .leading, spacing: 10) {
            field("Kỹ năng · cách nhau bằng dấu phẩy", "Facebook Ads, Excel, Canva…", $model.doc.data.skills, multiline: true)
            field("Ngoại ngữ · cách nhau bằng dấu phẩy", "Tiếng Anh — IELTS 7.0", $model.doc.data.langs)
            field("Sở thích · cách nhau bằng dấu phẩy", "Đọc sách, chạy bộ", $model.doc.data.hobbies)
        }
    }

    private func field(_ label: String, _ placeholder: String, _ text: Binding<String>, multiline: Bool = false,
                       keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.bvp(.caption, .medium)).foregroundStyle(FotoDocs.Palette.textSecondary)
            Group {
                if multiline {
                    TextField(placeholder, text: text, axis: .vertical).lineLimit(2...8)
                } else {
                    TextField(placeholder, text: text).keyboardType(keyboard)
                        .textInputAutocapitalization(keyboard == .default ? .sentences : .never)
                }
            }
            .font(.bvp(.subheadline))
            .autocorrectionDisabled(keyboard != .default)
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: 12).fill(FotoDocs.Palette.surface))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(FotoDocs.Palette.border))
        }
    }

    private func deleteButton(_ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: "trash").font(.system(size: 15)).foregroundStyle(FotoDocs.Palette.red)
                .frame(width: 40, height: 42)
        }
        .accessibilityLabel("Xoá")
    }

    private func addButton(_ title: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: "plus").font(.bvp(.footnote, .semibold)).foregroundStyle(FotoDocs.Palette.primary)
                .frame(maxWidth: .infinity).padding(.vertical, 11)
                .background(RoundedRectangle(cornerRadius: 12).stroke(FotoDocs.Palette.primary.opacity(0.4), style: StrokeStyle(lineWidth: 1, dash: [5, 4])))
        }
        .buttonStyle(.plain)
    }

    // MARK: export

    private var exportBar: some View {
        HStack(spacing: 10) {
            Button { export(pdf: true) } label: {
                Label("Tải PDF", systemImage: "arrow.down.doc").font(.bvp(.subheadline, .semibold)).foregroundStyle(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(RoundedRectangle(cornerRadius: 16).fill(FotoDocs.Palette.primary))
            }
            Button { export(pdf: false) } label: {
                Text("PNG").font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.primary)
                    .padding(.vertical, 14).padding(.horizontal, 22)
                    .background(RoundedRectangle(cornerRadius: 16).fill(FotoDocs.Palette.primaryTint))
            }
        }
        .buttonStyle(.plain)
        .disabled(exporting)
        .padding(.horizontal, 20).padding(.vertical, 12)
        .background(FotoDocs.Palette.surface.shadow(color: FotoDocs.barShadow, radius: 12, y: -2).ignoresSafeArea())
    }

    private func export(pdf: Bool) {
        exporting = true
        defer { exporting = false }
        let fit = CVFit.fit(model.doc)
        guard let url = pdf ? CVExport.pdf(model.doc, k: fit.k) : CVExport.png(model.doc, k: fit.k) else {
            error = "Chưa dựng xong CV, thử lại nhé."
            return
        }
        share = SharePayload(url: url)
    }
}
