import Foundation
import SwiftData
import FotoDocsCore

/// One receipt in the expense claim ("Công tác phí"). Image stays on the device.
@Model
public final class ExpenseReceipt {
    public var createdAt: Date
    public var date: Date
    /// VND; nil until read or typed.
    public var amount: Int?
    public var vendor: String
    public var categoryRaw: String
    public var note: String
    @Attribute(.externalStorage) public var imageData: Data?

    public init(date: Date, amount: Int?, vendor: String, category: ExpenseCategory, imageData: Data?, createdAt: Date = .now) {
        self.createdAt = createdAt
        self.date = date
        self.amount = amount
        self.vendor = vendor
        self.categoryRaw = category.rawValue
        self.note = ""
        self.imageData = imageData
    }

    public var category: ExpenseCategory {
        get { ExpenseCategory(rawValue: categoryRaw) ?? .other }
        set { categoryRaw = newValue.rawValue }
    }
}
