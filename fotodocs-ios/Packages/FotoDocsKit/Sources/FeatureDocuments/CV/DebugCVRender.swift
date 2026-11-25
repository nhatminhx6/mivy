#if DEBUG
import SwiftUI
import FotoDocsCore

/// Debug builds only: launched with `-renderCV`, the app renders the sample CV in every layout (and every
/// font / the custom colour on the first layout) to `Documents/debug-cv-<name>.png`, and an A4 PDF, then
/// `debug-cv-done.txt` — the CV QC without tapping through the editor.
public enum DebugCVRender {
    @MainActor public static func runIfRequested() async {
        guard ProcessInfo.processInfo.arguments.contains("-renderCV"),
              let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        var log = ""
        func render(_ doc: CVDocument, _ name: String) {
            let fit = CVFit.fit(doc)
            let r = ImageRenderer(content: CVSheetView(doc: doc, k: fit.k))
            r.scale = 1.5
            if let png = (r.uiImage ?? r.uiImage)?.pngData() { try? png.write(to: docs.appendingPathComponent("debug-cv-\(name).png")) }
            log += "\(name): k \(fit.k) overflow \(fit.overflow)\n"
        }
        for l in CVLayout.allCases {
            var d = CVDocument(); d.spec.layout = l
            render(d, l.rawValue)
        }
        for f in CVFontChoice.allCases where f != .vietnam {
            var d = CVDocument(); d.spec.font = f; d.spec.layout = .banner
            render(d, "font-\(f.rawValue)")
        }
        var c = CVDocument(); c.spec.palette = "custom"; c.spec.color = "#c2410c"
        render(c, "custom")
        var long = CVDocument(); long.spec.layout = .classic
        long.data.jobs += long.data.jobs + long.data.jobs
        render(long, "long")
        if let url = CVExport.pdf(CVDocument(), k: CVFit.fit(CVDocument()).k) {
            try? FileManager.default.removeItem(at: docs.appendingPathComponent("debug-cv.pdf"))
            try? FileManager.default.copyItem(at: url, to: docs.appendingPathComponent("debug-cv.pdf"))
        }
        if let url = CVExport.png(CVDocument(), k: CVFit.fit(CVDocument()).k) {
            try? FileManager.default.removeItem(at: docs.appendingPathComponent("debug-cv-export.png"))
            try? FileManager.default.copyItem(at: url, to: docs.appendingPathComponent("debug-cv-export.png"))
        }
        try? (log + "done\n").write(to: docs.appendingPathComponent("debug-cv-done.txt"), atomically: true, encoding: .utf8)
    }
}
#endif
