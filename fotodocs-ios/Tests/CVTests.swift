import Testing
import Foundation
import FotoDocsCore

@Suite("CV builder model")
struct CVTests {
    @Test("Comma lists and bullet lines are split like the web")
    func lists() {
        #expect(CVText.list(" Excel, Canva ,\nTikTok Ads,, ") == ["Excel", "Canva", "TikTok Ads"])
        #expect(CVText.lines("- Viết bài\n• Chạy ads\n\n  * Báo cáo  \n+ Họp") == ["Viết bài", "Chạy ads", "Báo cáo", "Họp"])
    }

    @Test("Initials come from the last two words, CV when empty")
    func initials() {
        var d = CVData()
        #expect(d.initials == "CV")
        #expect(d.displayName == "Họ và tên")
        d.name = "Trần Quốc Bảo"
        #expect(d.initials == "QB")
        d.name = "Hà"
        #expect(d.initials == "H")
    }

    @Test("A custom colour gives the web's accent / dark / soft")
    func customPalette() throws {
        var spec = CVSpec()
        spec.palette = "custom"; spec.color = "#c2410c"
        let p = spec.resolvedPalette
        // the web QC checks the sidebar background (dark) of #c2410c is rgb(126,42,8)
        #expect(CVColor.rgb(p.dark) == (126, 42, 8))
        #expect(p.id == "custom")
        spec.color = "red"            // not a hex colour: back to the first palette
        #expect(spec.resolvedPalette.id == "navy")
    }

    @Test("Empty entries are hidden, the sample fills every section")
    func shownEntries() {
        var d = CVData.sample
        #expect(d.shownJobs.count == 3 && d.shownEdus.count == 2)
        d.jobs.append(CVJob(time: "2020"))
        d.edus.append(CVEdu(time: "2019"))
        #expect(d.shownJobs.count == 3 && d.shownEdus.count == 2)
        #expect(d.skillList.count == 6)
    }

    @Test("The saved document round-trips through JSON")
    func codable() throws {
        var doc = CVDocument()
        doc.spec.layout = .timeline; doc.spec.font = .playfair
        doc.data.photo = Data([1, 2, 3])
        let back = try JSONDecoder().decode(CVDocument.self, from: JSONEncoder().encode(doc))
        #expect(back == doc)
    }
}
