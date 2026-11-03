import Foundation

/// Minimal one-sheet .xlsx (Office Open XML in an uncompressed zip) — enough for an expense table
/// that opens in Excel / Numbers / Google Sheets with real numbers and a SUM formula.
public enum XLSXWriter {
    public enum Cell: Sendable {
        case text(String, bold: Bool = false)
        case number(Int, bold: Bool = false)
        /// Formula without "=", plus the value shown before the sheet recalculates.
        case formula(String, cached: Int, bold: Bool = false)
        case empty
    }

    public static func workbook(sheet: String, rows: [[Cell]], columnWidths: [Double], merges: [String] = []) -> Data {
        var zip = StoredZip()
        zip.add("[Content_Types].xml", """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\
        <Default Extension="xml" ContentType="application/xml"/>\
        <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\
        <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\
        <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\
        </Types>
        """)
        zip.add("_rels/.rels", """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\
        </Relationships>
        """)
        zip.add("xl/workbook.xml", """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\
        <sheets><sheet name="\(escape(String(sheet.prefix(31))))" sheetId="1" r:id="rId1"/></sheets></workbook>
        """)
        zip.add("xl/_rels/workbook.xml.rels", """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\
        </Relationships>
        """)
        // xf 0 plain · 1 bold · 2 "#,##0" · 3 bold "#,##0"
        zip.add("xl/styles.xml", """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\
        <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>\
        <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>\
        <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\
        <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\
        <cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>\
        <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>\
        <xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>\
        <xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs>\
        </styleSheet>
        """)
        zip.add("xl/worksheets/sheet1.xml", sheetXML(rows: rows, widths: columnWidths, merges: merges))
        return zip.finish()
    }

    /// "A", "B", … "Z", "AA" for a 0-based column.
    public static func column(_ i: Int) -> String {
        var n = i + 1, s = ""
        while n > 0 { n -= 1; s = String(UnicodeScalar(65 + n % 26)!) + s; n /= 26 }
        return s
    }

    private static func sheetXML(rows: [[Cell]], widths: [Double], merges: [String]) -> String {
        var x = #"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">"#
        let lastCol = max(rows.map(\.count).max() ?? 1, widths.count, 1) - 1
        x += #"<dimension ref="A1:\#(column(lastCol))\#(max(rows.count, 1))"/>"#
        if !widths.isEmpty {
            x += "<cols>" + widths.enumerated().map { #"<col min="\#($0.offset + 1)" max="\#($0.offset + 1)" width="\#($0.element)" customWidth="1"/>"# }.joined() + "</cols>"
        }
        x += "<sheetData>"
        for (r, row) in rows.enumerated() {
            x += #"<row r="\#(r + 1)">"#
            for (c, cell) in row.enumerated() {
                let ref = column(c) + String(r + 1)
                switch cell {
                case let .text(s, bold):
                    x += #"<c r="\#(ref)" t="inlineStr"\#(bold ? #" s="1""# : "")><is><t xml:space="preserve">\#(escape(s))</t></is></c>"#
                case let .number(v, bold):
                    x += #"<c r="\#(ref)" s="\#(bold ? 3 : 2)"><v>\#(v)</v></c>"#
                case let .formula(f, cached, bold):
                    x += #"<c r="\#(ref)" s="\#(bold ? 3 : 2)"><f>\#(escape(f))</f><v>\#(cached)</v></c>"#
                case .empty:
                    break
                }
            }
            x += "</row>"
        }
        x += "</sheetData>"
        if !merges.isEmpty {
            x += #"<mergeCells count="\#(merges.count)">"# + merges.map { #"<mergeCell ref="\#($0)"/>"# }.joined() + "</mergeCells>"
        }
        return x + "</worksheet>"
    }

    static func escape(_ s: String) -> String {
        var out = ""
        for ch in s.unicodeScalars {
            switch ch {
            case "&": out += "&amp;"
            case "<": out += "&lt;"
            case ">": out += "&gt;"
            case "\"": out += "&quot;"
            case _ where ch.value < 0x20 && ch != "\t" && ch != "\n": continue  // not allowed in XML 1.0
            default: out.unicodeScalars.append(ch)
            }
        }
        return out
    }
}

/// Zip archive with every entry STORED (no compression): what .xlsx needs, no zlib.
struct StoredZip {
    private var body = Data()
    private var central = Data()
    private var count: UInt16 = 0

    mutating func add(_ name: String, _ text: String) {
        let data = Data(text.utf8), path = Data(name.utf8)
        let crc = Self.crc32(data), offset = UInt32(body.count)
        // local file header
        body.le32(0x0403_4B50); body.le16(20); body.le16(0x0800); body.le16(0); body.le16(0); body.le16(0x21)
        body.le32(crc); body.le32(UInt32(data.count)); body.le32(UInt32(data.count))
        body.le16(UInt16(path.count)); body.le16(0)
        body.append(path); body.append(data)
        // central directory entry
        central.le32(0x0201_4B50); central.le16(20); central.le16(20); central.le16(0x0800); central.le16(0)
        central.le16(0); central.le16(0x21); central.le32(crc); central.le32(UInt32(data.count)); central.le32(UInt32(data.count))
        central.le16(UInt16(path.count)); central.le16(0); central.le16(0); central.le16(0); central.le16(0)
        central.le32(0); central.le32(offset)
        central.append(path)
        count += 1
    }

    func finish() -> Data {
        var out = body
        out.append(central)
        out.le32(0x0605_4B50); out.le16(0); out.le16(0); out.le16(count); out.le16(count)
        out.le32(UInt32(central.count)); out.le32(UInt32(body.count)); out.le16(0)
        return out
    }

    private static let table: [UInt32] = (0..<256).map { i in
        var c = UInt32(i)
        for _ in 0..<8 { c = c & 1 != 0 ? 0xEDB8_8320 ^ (c >> 1) : c >> 1 }
        return c
    }

    static func crc32(_ data: Data) -> UInt32 {
        var c: UInt32 = 0xFFFF_FFFF
        for b in data { c = table[Int((c ^ UInt32(b)) & 0xFF)] ^ (c >> 8) }
        return c ^ 0xFFFF_FFFF
    }
}

private extension Data {
    mutating func le16(_ v: UInt16) { append(UInt8(v & 0xFF)); append(UInt8(v >> 8)) }
    mutating func le32(_ v: UInt32) { for s in stride(from: 0, to: 32, by: 8) { append(UInt8((v >> UInt32(s)) & 0xFF)) } }
}
