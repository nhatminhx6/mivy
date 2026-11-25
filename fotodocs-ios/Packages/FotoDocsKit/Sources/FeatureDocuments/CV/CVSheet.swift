import SwiftUI
import UIKit
import FotoDocsCore

// The CV sheet, drawn in code exactly like the Mivy web CV (web/src/lib/cv-engine.tsx): 794×1123 pt (A4 at
// 96 dpi), 10 layouts × palette × font. Every size the web scales with `--k` is multiplied by `k` here; the
// fixed column widths are not. `fill`: false while measuring (full-height columns would claim any height).

let cvWidth: CGFloat = 794, cvHeight: CGFloat = 1123

extension Color {
    init(cvHex hex: String, opacity: Double = 1) {
        let c = CVColor.rgb(hex)
        self.init(.sRGB, red: Double(c.r) / 255, green: Double(c.g) / 255, blue: Double(c.b) / 255, opacity: opacity)
    }
    static let cvInk = Color(cvHex: "#15181d"), cvBody = Color(cvHex: "#2c3138"), cvSub = Color(cvHex: "#4a515c")
}

struct CVStyle {
    let p: CVPalette
    let font: CVFontChoice
    let k: CGFloat
    var accent: Color { Color(cvHex: p.accent) }
    var dark: Color { Color(cvHex: p.dark) }
    var soft: Color { Color(cvHex: p.soft) }

    func s(_ n: CGFloat) -> CGFloat { n * k }

    /// heading font (names, section titles), at its web weight (800, Playfair 700 → bundled 800)
    func head(_ size: CGFloat) -> Font {
        switch font {
        case .vietnam: .custom("BeVietnamPro-ExtraBold", size: size)
        case .montserrat: .custom("Montserrat-Thin", size: size)            // the bundled file is the 800 weight
        case .playfair: .custom("PlayfairDisplay-Regular", size: size)      // the bundled file is the 800 weight
        // Lora is not bundled; Georgia stands in (full Vietnamese set). Not the iOS system serif: its PDF text
        // turns "Đ" into the look-alike "Ð", so a recruiter's search / ATS misses "Đại học"
        case .lora: .custom("Georgia-Bold", size: size)
        }
    }

    /// body font at a CSS weight (400…800)
    func body(_ size: CGFloat, _ weight: Int = 400) -> Font {
        if font == .lora { return .custom(weight >= 600 ? "Georgia-Bold" : "Georgia", size: size) }
        let name = weight >= 800 ? "BeVietnamPro-ExtraBold" : weight >= 700 ? "BeVietnamPro-Bold"
            : weight >= 600 ? "BeVietnamPro-SemiBold" : weight >= 500 ? "BeVietnamPro-Medium" : "BeVietnamPro-Regular"
        return .custom(name, size: size)
    }
}

/// Wrapping row (CSS flex-wrap).
/// Letter-spaced text (CSS letter-spacing in em) that a recruiter's PDF reader / ATS still reads as words.
/// Desktop PDF readers split a word once the spacing passes ~0.09em ("KINH NGHIỆ M", at 0.12em "K I N H"),
/// measured with this font; so the web's 0.1-0.22em is capped at 0.08em.
func cvSpaced(_ s: String, size: CGFloat, em: CGFloat) -> Text {
    Text(s).tracking(size * min(em, cvMaxLetterSpacing))
}
let cvMaxLetterSpacing: CGFloat = 0.08

struct CVFlow: Layout {
    var spacing: CGFloat
    var lineSpacing: CGFloat
    var centered = false

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(width: proposal.width ?? .infinity, subviews)
        let w = rows.map(\.width).max() ?? 0
        let h = rows.reduce(0) { $0 + $1.height } + lineSpacing * CGFloat(max(0, rows.count - 1))
        return CGSize(width: proposal.width.map { min($0, w) } ?? w, height: h)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(width: bounds.width, subviews) {
            var x = centered ? bounds.minX + (bounds.width - row.width) / 2 : bounds.minX
            for i in row.items {
                let sz = subviews[i].sizeThatFits(ProposedViewSize(width: bounds.width, height: nil))
                subviews[i].place(at: CGPoint(x: x, y: y + (row.height - sz.height) / 2), proposal: ProposedViewSize(sz))
                x += sz.width + spacing
            }
            y += row.height + lineSpacing
        }
    }

    private func arrange(width: CGFloat, _ subviews: Subviews) -> [(items: [Int], width: CGFloat, height: CGFloat)] {
        var rows: [(items: [Int], width: CGFloat, height: CGFloat)] = []
        var cur: [Int] = [], cw: CGFloat = 0, ch: CGFloat = 0
        for i in subviews.indices {
            let sz = subviews[i].sizeThatFits(ProposedViewSize(width: width, height: nil))
            let add = cur.isEmpty ? sz.width : cw + spacing + sz.width
            if !cur.isEmpty, add > width + 0.5 {
                rows.append((cur, cw, ch)); cur = [i]; cw = sz.width; ch = sz.height
            } else {
                cur.append(i); cw = add; ch = max(ch, sz.height)
            }
        }
        if !cur.isEmpty { rows.append((cur, cw, ch)) }
        return rows
    }
}

/// One layout of the CV, at text scale k.
struct CVLayoutView: View {
    let data: CVData
    let spec: CVSpec
    let k: CGFloat
    var fill = true

    private var st: CVStyle { CVStyle(p: spec.resolvedPalette, font: spec.font, k: k) }
    private func s(_ n: CGFloat) -> CGFloat { n * k }

    var body: some View {
        Group {
            switch spec.layout {
            case .sidebar: sidebar
            case .classic: classic
            case .banner: banner
            case .timeline: timeline
            case .split: split
            case .gutter: gutter
            case .cards: cards
            case .centered: centered
            case .bold: bold
            case .ats: ats
            }
        }
        .frame(width: cvWidth, alignment: .topLeading)
    }

    // MARK: shared pieces

    @ViewBuilder private func photo(_ size: CGFloat, ring: Color? = nil, square: Bool = false, bg: Color? = nil) -> some View {
        let d = s(size)
        let shape = RoundedRectangle(cornerRadius: square ? s(10) : d / 2, style: .continuous)
        Group {
            if let jpg = data.photo, let img = UIImage(data: jpg) {
                Image(uiImage: img).resizable().scaledToFill()
            } else {
                ZStack {
                    bg ?? st.soft
                    Text(data.initials).font(st.head(d * 0.34)).foregroundStyle(st.accent)
                }
            }
        }
        .frame(width: d, height: d)
        .clipShape(shape)
        .padding(ring == nil ? 0 : s(4))
        .background(ring.map { r in shape.fill(r) })
    }

    private func title(_ t: String, color: Color? = nil, line: Bool = true) -> some View {
        let col = color ?? st.accent
        return HStack(spacing: s(10)) {
            cvSpaced(t.uppercased(), size: s(14), em: 0.12).font(st.head(s(14))).foregroundStyle(col)
                .lineLimit(1).fixedSize()
            if line { Rectangle().fill(col.opacity(0.25)).frame(height: 1.5) }
        }
        .padding(.bottom, s(10))
    }

    private var contactRows: [(String, String)] {
        [("phone", data.phone), ("envelope", data.email), ("mappin.and.ellipse", data.address), ("link", data.link)]
            .filter { !$0.1.trimmingCharacters(in: .whitespaces).isEmpty }
    }

    private func contacts(_ color: Color, icon: Color) -> some View {
        VStack(alignment: .leading, spacing: s(7)) {
            ForEach(contactRows, id: \.1) { row in
                HStack(spacing: s(8)) {
                    Image(systemName: row.0).font(.system(size: 11, weight: .medium)).foregroundStyle(icon).frame(width: 13)
                    Text(row.1).font(st.body(s(11.5))).foregroundStyle(color).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func contactsInline(_ color: Color, centered: Bool = false) -> some View {
        CVFlow(spacing: s(14), lineSpacing: s(4), centered: centered) {
            ForEach(contactRows, id: \.1) { Text($0.1).font(st.body(s(12))).foregroundStyle(color).lineLimit(1) }
        }
    }

    @ViewBuilder private func jobs(timeline: Bool = false) -> some View {
        let list = data.shownJobs
        VStack(alignment: .leading, spacing: s(14)) {
            ForEach(Array(list.enumerated()), id: \.element.id) { i, j in
                let entry = VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .firstTextBaseline, spacing: s(10)) {
                        Text(j.role).font(st.body(s(14), 700)).foregroundStyle(Color.cvInk)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                        Text(j.time).font(st.body(s(11.5), 600)).foregroundStyle(st.accent).lineLimit(1).fixedSize()
                    }
                    if !j.org.isEmpty {
                        Text(j.org).font(st.body(s(12.5), 500)).foregroundStyle(Color.cvSub).padding(.top, s(2))
                    }
                    let bullets = CVText.lines(j.desc)
                    if !bullets.isEmpty {
                        VStack(alignment: .leading, spacing: s(2)) {
                            ForEach(Array(bullets.enumerated()), id: \.offset) { _, l in
                                HStack(alignment: .firstTextBaseline, spacing: 0) {
                                    Text("•").frame(width: s(16), alignment: .leading)
                                    Text(l).lineSpacing(s(12.5) * 0.25).fixedSize(horizontal: false, vertical: true)
                                }
                                .font(st.body(s(12.5))).foregroundStyle(Color.cvBody)
                            }
                        }
                        .padding(.top, s(6))
                    }
                }
                if timeline {
                    entry.padding(.leading, s(22))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(alignment: .topLeading) {
                            ZStack(alignment: .topLeading) {
                                if i < list.count - 1 {
                                    Rectangle().fill(st.accent.opacity(0.3)).frame(width: 1.5)
                                        .padding(.top, s(18)).padding(.bottom, -s(14)).offset(x: s(8.25))
                                }
                                Circle().fill(st.accent).frame(width: s(10), height: s(10)).offset(x: s(4), y: s(5))
                            }
                        }
                } else {
                    entry
                }
            }
        }
    }

    private func edus(color: Color = .cvInk, sub: Color = .cvSub, time: Color? = nil) -> some View {
        VStack(alignment: .leading, spacing: s(10)) {
            ForEach(data.shownEdus) { e in
                VStack(alignment: .leading, spacing: s(2)) {
                    Text(e.degree.isEmpty ? e.school : e.degree).font(st.body(s(13.5), 700)).foregroundStyle(color)
                        .fixedSize(horizontal: false, vertical: true)
                    if !e.degree.isEmpty, !e.school.isEmpty {
                        Text(e.school).font(st.body(s(12.5))).foregroundStyle(sub).fixedSize(horizontal: false, vertical: true)
                    }
                    if !e.time.isEmpty {
                        Text(e.time).font(st.body(s(11.5), 600)).foregroundStyle(time ?? st.accent)
                    }
                }
            }
        }
    }

    private func chips(_ items: [String], bg: Color, color: Color) -> some View {
        CVFlow(spacing: s(6), lineSpacing: s(6)) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, t in
                Text(t).font(st.body(s(11.5), 600)).foregroundStyle(color).lineLimit(1)
                    .padding(.vertical, s(4)).padding(.horizontal, s(10)).background(Capsule().fill(bg))
            }
        }
    }

    private func bullets(_ items: [String], color: Color) -> some View {
        VStack(alignment: .leading, spacing: s(5)) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, t in
                HStack(alignment: .firstTextBaseline, spacing: s(8)) {
                    Text("•").opacity(0.6)
                    Text(t).fixedSize(horizontal: false, vertical: true)
                }
                .font(st.body(s(12.5))).foregroundStyle(color)
            }
        }
    }

    @ViewBuilder private func summary(_ color: Color = .cvBody, italic: Bool = false, center: Bool = false) -> some View {
        if data.hasSummary {
            Text(data.summary).font(st.body(s(12.5))).italic(italic).foregroundStyle(color)
                .lineSpacing(s(12.5) * 0.35).multilineTextAlignment(center ? .center : .leading)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func name(_ color: Color, size: CGFloat = 34) -> some View {
        Text(data.displayName).font(st.head(s(size))).kerning(-s(size) * 0.01).foregroundStyle(color)
            .fixedSize(horizontal: false, vertical: true)
    }

    @ViewBuilder private func role(_ color: Color, size: CGFloat = 15) -> some View {
        if !data.title.isEmpty {
            cvSpaced(data.title, size: s(size), em: 0.02).font(st.body(s(size), 600)).foregroundStyle(color).padding(.top, s(6))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func block<C: View>(_ gap: CGFloat = 22, @ViewBuilder _ c: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 0) { c() }.padding(.bottom, s(gap)).frame(maxWidth: .infinity, alignment: .leading)
    }

    private var skills: [String] { data.skillList }
    private var langs: [String] { data.langList }
    private var hobbies: [String] { data.hobbyList }
    private var hasJob: Bool { !data.shownJobs.isEmpty }
    private var hasEdu: Bool { !data.shownEdus.isEmpty }

    /// a column / band that reaches the bottom of the page when drawing (not while measuring)
    @ViewBuilder private func fullHeight<C: View>(_ c: C) -> some View {
        if fill { c.frame(maxHeight: .infinity, alignment: .top) } else { c }
    }
    private func page<C: View>(_ c: C) -> some View {
        c.frame(minHeight: fill ? cvHeight : nil, alignment: .top)
    }

    // MARK: layouts

    private var sidebar: some View {
        page(HStack(alignment: .top, spacing: 0) {
            fullHeight(VStack(alignment: .leading, spacing: 0) {
                HStack { Spacer(); photo(132, ring: .white.opacity(0.18)); Spacer() }.padding(.bottom, s(26))
                block { title("Liên hệ", color: .white); contacts(.white.opacity(0.88), icon: .white.opacity(0.6)) }
                if !skills.isEmpty { block { title("Kỹ năng", color: .white); bullets(skills, color: .white.opacity(0.88)) } }
                if !langs.isEmpty { block { title("Ngoại ngữ", color: .white); bullets(langs, color: .white.opacity(0.88)) } }
                if !hobbies.isEmpty { block { title("Sở thích", color: .white); bullets(hobbies, color: .white.opacity(0.88)) } }
            }
            .padding(.vertical, s(40)).padding(.horizontal, s(26))
            .frame(width: 268, alignment: .top))
            .background(st.dark)
            VStack(alignment: .leading, spacing: 0) {
                block(26) { name(st.dark); role(st.accent) }
                if data.hasSummary { block { title("Giới thiệu"); summary() } }
                if hasJob { block { title("Kinh nghiệm làm việc"); jobs() } }
                if hasEdu { block { title("Học vấn"); edus() } }
            }
            .padding(.vertical, s(44)).padding(.horizontal, s(40))
            .frame(maxWidth: .infinity, alignment: .topLeading)
        })
    }

    private var classic: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(spacing: 0) {
                name(.cvInk, size: 36).multilineTextAlignment(.center)
                role(st.accent)
                contactsInline(.cvSub, centered: true).padding(.top, s(12))
            }
            .frame(maxWidth: .infinity).padding(.bottom, s(14))
            Rectangle().fill(st.accent).frame(height: 2).padding(.top, s(6)).padding(.bottom, s(24))
            if data.hasSummary { block { title("Giới thiệu"); summary() } }
            if hasJob { block { title("Kinh nghiệm làm việc"); jobs() } }
            if hasEdu { block { title("Học vấn"); edus() } }
            if !skills.isEmpty { block { title("Kỹ năng"); chips(skills, bg: st.soft, color: st.dark) } }
            if !langs.isEmpty || !hobbies.isEmpty {
                HStack(alignment: .top, spacing: s(40)) {
                    if !langs.isEmpty { VStack(alignment: .leading, spacing: 0) { title("Ngoại ngữ"); bullets(langs, color: .cvBody) }.frame(maxWidth: .infinity, alignment: .leading) }
                    if !hobbies.isEmpty { VStack(alignment: .leading, spacing: 0) { title("Sở thích"); bullets(hobbies, color: .cvBody) }.frame(maxWidth: .infinity, alignment: .leading) }
                }
            }
        }
        .padding(.vertical, s(52)).padding(.horizontal, s(60))
    }

    private var banner: some View {
        VStack(spacing: 0) {
            HStack(spacing: s(28)) {
                photo(118, ring: .white.opacity(0.2))
                VStack(alignment: .leading, spacing: 0) {
                    name(.white); role(.white.opacity(0.8))
                    contactsInline(.white.opacity(0.85)).padding(.top, s(14))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.vertical, s(40)).padding(.horizontal, s(48))
            .background(st.dark)
            HStack(alignment: .top, spacing: s(36)) {
                VStack(alignment: .leading, spacing: 0) {
                    if data.hasSummary { block { title("Giới thiệu"); summary() } }
                    if hasJob { block { title("Kinh nghiệm làm việc"); jobs() } }
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
                VStack(alignment: .leading, spacing: 0) {
                    if hasEdu { block { title("Học vấn"); edus() } }
                    if !skills.isEmpty { block { title("Kỹ năng"); chips(skills, bg: st.soft, color: st.dark) } }
                    if !langs.isEmpty { block { title("Ngoại ngữ"); bullets(langs, color: .cvBody) } }
                    if !hobbies.isEmpty { block { title("Sở thích"); bullets(hobbies, color: .cvBody) } }
                }
                .frame(width: 210, alignment: .topLeading)
            }
            .padding(.vertical, s(34)).padding(.horizontal, s(48))
        }
    }

    private var timeline: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: s(24)) {
                photo(104, square: true)
                VStack(alignment: .leading, spacing: 0) { name(.cvInk); role(st.accent) }
                    .frame(maxWidth: .infinity, alignment: .leading)
                contacts(.cvBody, icon: st.accent).frame(width: 220, alignment: .leading)
            }
            .padding(.bottom, s(22))
            .overlay(alignment: .bottom) { Rectangle().fill(st.accent).frame(height: 3) }
            .padding(.bottom, s(26))
            if data.hasSummary { block { title("Giới thiệu"); summary() } }
            HStack(alignment: .top, spacing: s(34)) {
                VStack(alignment: .leading, spacing: 0) {
                    if hasJob { block { title("Kinh nghiệm làm việc"); jobs(timeline: true) } }
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
                VStack(alignment: .leading, spacing: 0) {
                    if hasEdu { block { title("Học vấn"); edus() } }
                    if !skills.isEmpty { block { title("Kỹ năng"); bullets(skills, color: .cvBody) } }
                    if !langs.isEmpty { block { title("Ngoại ngữ"); bullets(langs, color: .cvBody) } }
                    if !hobbies.isEmpty { block { title("Sở thích"); bullets(hobbies, color: .cvBody) } }
                }
                .frame(width: 200, alignment: .topLeading)
            }
        }
        .padding(.vertical, s(46)).padding(.horizontal, s(50))
    }

    private var gutter: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .bottom, spacing: s(24)) {
                VStack(alignment: .leading, spacing: 0) { name(.cvInk, size: 36); role(st.accent) }
                    .frame(maxWidth: .infinity, alignment: .leading)
                contacts(.cvBody, icon: st.accent).frame(width: 230, alignment: .leading)
            }
            .padding(.bottom, s(20))
            if data.hasSummary { gutterRow("Giới thiệu") { summary() } }
            if hasJob { gutterRow("Kinh nghiệm") { jobs() } }
            if hasEdu { gutterRow("Học vấn") { edus() } }
            if !skills.isEmpty { gutterRow("Kỹ năng") { chips(skills, bg: st.soft, color: st.dark) } }
            if !langs.isEmpty { gutterRow("Ngoại ngữ") { bullets(langs, color: .cvBody) } }
            if !hobbies.isEmpty { gutterRow("Sở thích") { bullets(hobbies, color: .cvBody) } }
        }
        .padding(.vertical, s(50)).padding(.horizontal, s(54))
    }

    private func gutterRow<C: View>(_ t: String, @ViewBuilder _ c: () -> C) -> some View {
        HStack(alignment: .top, spacing: s(24)) {
            cvSpaced(t.uppercased(), size: s(12.5), em: 0.1).font(st.head(s(12.5))).foregroundStyle(st.accent)
                .padding(.top, s(2)).frame(width: 132, alignment: .leading)
            VStack(alignment: .leading, spacing: 0) { c() }.frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, s(16))
        .overlay(alignment: .top) { Rectangle().fill(Color(cvHex: "#e3e6ea")).frame(height: 1) }
    }

    private func card<C: View>(_ t: String?, @ViewBuilder _ c: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if let t { title(t, line: false) }
            c()
        }
        .padding(.vertical, s(18)).padding(.horizontal, s(20))
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: s(12), style: .continuous).fill(.white)
            .shadow(color: Color(cvHex: "#0f172a", opacity: 0.06), radius: 1, y: 1))
        .padding(.bottom, s(14))
    }

    private var cards: some View {
        page(VStack(spacing: 0) {
            HStack(spacing: s(22)) {
                photo(96, ring: .white.opacity(0.25))
                VStack(alignment: .leading, spacing: 0) {
                    name(.white, size: 30); role(.white.opacity(0.8), size: 14)
                    contactsInline(.white.opacity(0.85)).padding(.top, s(10))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.vertical, s(24)).padding(.horizontal, s(26))
            .background(RoundedRectangle(cornerRadius: s(14), style: .continuous).fill(st.dark))
            .padding(.bottom, s(14))
            HStack(alignment: .top, spacing: s(14)) {
                VStack(spacing: 0) {
                    if data.hasSummary { card("Giới thiệu") { summary() } }
                    if hasJob { card("Kinh nghiệm làm việc") { jobs() } }
                }
                .frame(maxWidth: .infinity)
                VStack(spacing: 0) {
                    if hasEdu { card("Học vấn") { edus() } }
                    if !skills.isEmpty { card("Kỹ năng") { chips(skills, bg: st.soft, color: st.dark) } }
                    if !langs.isEmpty { card("Ngoại ngữ") { bullets(langs, color: .cvBody) } }
                    if !hobbies.isEmpty { card("Sở thích") { bullets(hobbies, color: .cvBody) } }
                }
                .frame(width: 236)
            }
        }
        .padding(s(28)))
        .background(st.soft)
    }

    private var centered: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(spacing: 0) {
                photo(112, ring: st.accent).padding(.bottom, s(16))
                name(.cvInk, size: 34).multilineTextAlignment(.center)
                role(st.accent)
                Rectangle().fill(st.accent).frame(width: s(56), height: 3).padding(.vertical, s(14))
                contactsInline(.cvSub, centered: true)
            }
            .frame(maxWidth: .infinity).padding(.bottom, s(26))
            if data.hasSummary {
                block { summary(Color(cvHex: "#3a4049"), italic: true, center: true).frame(maxWidth: 560).frame(maxWidth: .infinity) }
            }
            HStack(alignment: .top, spacing: s(34)) {
                // flex 1.45 : 1 of the width inside the page padding
                let inner = cvWidth - 2 * s(52) - s(34)
                VStack(alignment: .leading, spacing: 0) {
                    if hasJob { block { title("Kinh nghiệm làm việc"); jobs() } }
                }
                .frame(width: inner * 1.45 / 2.45, alignment: .topLeading)
                VStack(alignment: .leading, spacing: 0) {
                    if hasEdu { block { title("Học vấn"); edus() } }
                    if !skills.isEmpty { block { title("Kỹ năng"); chips(skills, bg: st.soft, color: st.dark) } }
                    if !langs.isEmpty { block { title("Ngoại ngữ"); bullets(langs, color: .cvBody) } }
                    if !hobbies.isEmpty { block { title("Sở thích"); bullets(hobbies, color: .cvBody) } }
                }
                .frame(width: inner / 2.45, alignment: .topLeading)
            }
        }
        .padding(.vertical, s(44)).padding(.horizontal, s(52))
    }

    private var bold: some View {
        let words = data.displayName.split(whereSeparator: \.isWhitespace).map(String.init)
        let first = words.count > 1 ? words.dropLast().joined(separator: " ") : (words.first ?? "")
        let last = words.count > 1 ? words.last! : ""
        var order: [String] = []
        if data.hasSummary { order.append("sum") }
        if hasJob { order.append("job") }
        if hasEdu { order.append("edu") }
        if !skills.isEmpty || !langs.isEmpty { order.append("skill") }
        func num(_ t: String, _ key: String) -> some View {
            HStack(alignment: .firstTextBaseline, spacing: s(12)) {
                Text(String(format: "%02d", (order.firstIndex(of: key) ?? 0) + 1)).font(st.head(s(22))).foregroundStyle(st.accent)
                cvSpaced(t.uppercased(), size: s(15), em: 0.08).font(st.head(s(15))).foregroundStyle(Color.cvInk).lineLimit(1).fixedSize()
                Rectangle().fill(Color(cvHex: "#d9dde2")).frame(height: 1).alignmentGuide(.firstTextBaseline) { _ in s(5) }
            }
            .padding(.bottom, s(12))
        }
        return page(HStack(alignment: .top, spacing: 0) {
            fullHeight(Rectangle().fill(st.accent).frame(width: 14))
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(first).foregroundStyle(Color.cvInk)
                    if !last.isEmpty { Text(last).foregroundStyle(st.accent) }
                }
                .font(st.head(s(52))).kerning(-s(52) * 0.02).lineSpacing(0)
                if !data.title.isEmpty {
                    cvSpaced(data.title.uppercased(), size: s(14), em: 0.22).font(st.body(s(14), 700)).foregroundStyle(Color.cvSub)
                        .padding(.top, s(12)).fixedSize(horizontal: false, vertical: true)
                }
                contactsInline(.cvBody).padding(.top, s(16)).padding(.bottom, s(28))
                if data.hasSummary { block { num("Giới thiệu", "sum"); summary() } }
                if hasJob { block { num("Kinh nghiệm", "job"); jobs() } }
                HStack(alignment: .top, spacing: s(34)) {
                    if hasEdu { VStack(alignment: .leading, spacing: 0) { num("Học vấn", "edu"); edus() }.frame(maxWidth: .infinity, alignment: .leading) }
                    if !skills.isEmpty || !langs.isEmpty {
                        VStack(alignment: .leading, spacing: 0) {
                            num("Kỹ năng", "skill")
                            if !skills.isEmpty {
                                Text(skills.joined(separator: "  ·  ")).font(st.body(s(12.5))).lineSpacing(s(12.5) * 0.45)
                                    .foregroundStyle(Color.cvBody).fixedSize(horizontal: false, vertical: true)
                            }
                            if !langs.isEmpty { inlineLabel("Ngoại ngữ:", langs).padding(.top, s(8)) }
                            if !hobbies.isEmpty { inlineLabel("Sở thích:", hobbies).padding(.top, s(6)) }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .padding(.top, s(50)).padding(.trailing, s(52)).padding(.bottom, s(40)).padding(.leading, s(46))
            .frame(maxWidth: .infinity, alignment: .topLeading)
        })
    }

    private func inlineLabel(_ label: String, _ items: [String]) -> some View {
        (Text(label + " ").font(st.body(s(12.5), 700)) + Text(items.joined(separator: ", ")).font(st.body(s(12.5))))
            .foregroundStyle(Color.cvBody).fixedSize(horizontal: false, vertical: true)
    }

    private var ats: some View {
        func h2(_ t: String) -> some View {
            VStack(alignment: .leading, spacing: s(4)) {
                cvSpaced(t.uppercased(), size: s(13), em: 0.08).font(st.body(s(13), 800)).foregroundStyle(Color.cvInk)
                Rectangle().fill(Color.cvInk).frame(height: 1.5)
            }
            .padding(.bottom, s(10))
        }
        return VStack(alignment: .leading, spacing: 0) {
            Text(data.displayName).font(st.head(s(30))).foregroundStyle(Color.cvInk).fixedSize(horizontal: false, vertical: true)
            if !data.title.isEmpty { Text(data.title).font(st.body(s(14), 600)).foregroundStyle(st.accent).padding(.top, s(4)) }
            contactsInline(Color(cvHex: "#3a4049")).padding(.top, s(8)).padding(.bottom, s(22))
            if data.hasSummary { block(18) { h2("Giới thiệu"); summary() } }
            if hasJob { block(18) { h2("Kinh nghiệm làm việc"); jobs() } }
            if hasEdu { block(18) { h2("Học vấn"); edus(time: .cvSub) } }
            if !skills.isEmpty {
                block(18) {
                    h2("Kỹ năng")
                    Text(skills.joined(separator: ", ")).font(st.body(s(12.5))).lineSpacing(s(12.5) * 0.35)
                        .foregroundStyle(Color.cvBody).fixedSize(horizontal: false, vertical: true)
                }
            }
            if !langs.isEmpty || !hobbies.isEmpty {
                block(18) {
                    h2("Thông tin thêm")
                    if !langs.isEmpty { inlineLabel("Ngoại ngữ:", langs) }
                    if !hobbies.isEmpty { inlineLabel("Sở thích:", hobbies).padding(.top, s(4)) }
                }
            }
        }
        .padding(.vertical, s(48)).padding(.horizontal, s(58))
    }

    private var split: some View {
        page(HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                block(28) { name(.cvInk, size: 38); role(st.accent, size: 16) }
                if data.hasSummary { block { title("Giới thiệu"); summary() } }
                if hasJob { block { title("Kinh nghiệm làm việc"); jobs() } }
                if hasEdu { block { title("Học vấn"); edus() } }
            }
            .padding(.top, s(52)).padding(.trailing, s(40)).padding(.bottom, s(40)).padding(.leading, s(52))
            .frame(maxWidth: .infinity, alignment: .topLeading)
            fullHeight(VStack(alignment: .leading, spacing: 0) {
                photo(120, square: true, bg: .white).padding(.bottom, s(26))
                block { title("Liên hệ", line: false); contacts(.cvBody, icon: st.accent) }
                if !skills.isEmpty { block { title("Kỹ năng", line: false); bullets(skills, color: .cvBody) } }
                if !langs.isEmpty { block { title("Ngoại ngữ", line: false); bullets(langs, color: .cvBody) } }
                if !hobbies.isEmpty { block { title("Sở thích", line: false); bullets(hobbies, color: .cvBody) } }
            }
            .padding(.vertical, s(52)).padding(.horizontal, s(24))
            .frame(width: 266, alignment: .topLeading))
            .background(st.soft)
        })
    }
}

/// The whole A4 sheet: white page, content clipped to one page.
struct CVSheetView: View {
    let doc: CVDocument
    let k: CGFloat

    var body: some View {
        CVLayoutView(data: doc.data, spec: doc.spec, k: k)
            .frame(width: cvWidth, height: cvHeight, alignment: .top)
            .background(Color.white)
            .clipped()
            .environment(\.colorScheme, .light)
    }
}

enum CVFit {
    /// Text scale for one page, like the web: start at 1.12 (short CVs fill the page), step down 0.03 while
    /// the content is taller than the page, never below 0.7. `overflow`: still too long at 0.7.
    @MainActor static func fit(_ doc: CVDocument) -> (k: CGFloat, overflow: Bool) {
        var k: CGFloat = 1.12
        var h = height(doc, k)
        while h > cvHeight + 1, k > 0.7 {
            k = ((k - 0.03) * 100).rounded() / 100
            h = height(doc, k)
        }
        return (k, h > cvHeight + 1)
    }

    @MainActor static func height(_ doc: CVDocument, _ k: CGFloat) -> CGFloat {
        let v = CVLayoutView(data: doc.data, spec: doc.spec, k: k, fill: false).environment(\.colorScheme, .light)
        let hc = UIHostingController(rootView: v)
        return hc.sizeThatFits(in: CGSize(width: cvWidth, height: .greatestFiniteMagnitude)).height
    }
}
