import Testing
import Foundation
import FotoDocsCore

@Suite("VisaProfile")
struct VisaProfileTests {
    // ICAO 9303 specimen, Utopia
    private let specimen = ["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", "L898902C36UTO7408122F1204159ZE184226B<<<<<10"]

    @Test("CCCD QR payload")
    func cccd() throws {
        let c = try #require(CCCDInfo.parse("079090001234|212345678|Nguyễn Văn Mẫu|15031990|Nam|12 Lê Lợi, Phường Bến Nghé, Quận 1, TP Hồ Chí Minh|20042021"))
        #expect(c.idNumber == "079090001234")
        #expect(c.oldIDNumber == "212345678")
        #expect(c.fullName == "Nguyễn Văn Mẫu")
        #expect(c.dateOfBirth == DayDate(year: 1990, month: 3, day: 15))
        #expect(c.sex == .male)
        #expect(c.issueDate == DayDate(year: 2021, month: 4, day: 20))
        #expect(CCCDInfo.parse("https://example.com") == nil)
        #expect(CCCDInfo.parse("123|x|Nguyễn A|01011990|Nữ|HN|01012020") == nil)  // id must be 12 digits
    }

    @Test("Passport MRZ with check digits")
    func mrz() throws {
        let p = try #require(PassportMRZ.parse(specimen, today: Date(timeIntervalSince1970: 1_790_000_000)))
        #expect(p.surname == "ERIKSSON")
        #expect(p.givenNames == "ANNA MARIA")
        #expect(p.number == "L898902C3")
        #expect(p.nationality == "UTO")
        #expect(p.dateOfBirth == DayDate(year: 1974, month: 8, day: 12))
        #expect(p.sex == .female)
        #expect(p.expiry == DayDate(year: 2012, month: 4, day: 15))
    }

    @Test("MRZ survives OCR noise: spaces, guillemets, O for 0 in dates")
    func mrzNoise() throws {
        let noisy = ["Passport / Hộ chiếu", "P<UTOERIKSSON<<ANNA<MARIA«««««««««««««««««««", "L898902C36UTO74O8122F12O4159ZE184226B<<<<< 10"]
        #expect(PassportMRZ.parse(noisy)?.number == "L898902C3")
        // a wrong check digit is refused
        #expect(PassportMRZ.parse([specimen[0], "L898902C37UTO7408122F1204159ZE184226B<<<<<10"]) == nil)
    }

    @Test("Profile merge: passport wins the Latin name, CCCD fills the rest")
    func merge() throws {
        var p = VisaProfile()
        p.apply(try #require(CCCDInfo.parse("079090001234||Nguyễn Văn Mẫu|15031990|Nam|12 Lê Lợi, Quận 1|20042021")))
        #expect(p.surname == "NGUYEN" && p.givenNames == "VAN MAU")
        #expect(p.latinFullName == "NGUYEN VAN MAU")
        p.apply(PassportMRZ(surname: "NGUYEN", givenNames: "VAN MAU", number: "C1234567", nationality: "VNM",
                            dateOfBirth: DayDate(year: 1990, month: 3, day: 15), sex: .male, expiry: DayDate(year: 2031, month: 5, day: 2)))
        #expect(p.hasCCCD && p.hasPassport)
        #expect(p.nationalityEN == "VIETNAMESE")
    }

    @Test("Each form formats dates its own way")
    func formats() throws {
        var p = VisaProfile()
        p.dateOfBirth = DayDate(year: 1990, month: 3, day: 5)
        p.address = "12 Lê Lợi, Phường Bến Nghé"
        let value = { (country: String, field: String) in VisaForms.spec(country)!.fields.first { $0.id == field }!.value(p) }
        #expect(value("kr", "dob") == "1990/03/05")
        #expect(value("jp", "dob") == "05/03/1990")
        #expect(value("us", "dob") == "05-MAR-1990")
        #expect(value("schengen", "dob") == "05-03-1990")
        #expect(value("jp", "address") == "12 LE LOI, PHUONG BEN NGHE")
        #expect(VisaForms.all.map(\.id).sorted() == ["au", "cn", "jp", "kr", "schengen", "tw", "uk", "us"])
    }
}
