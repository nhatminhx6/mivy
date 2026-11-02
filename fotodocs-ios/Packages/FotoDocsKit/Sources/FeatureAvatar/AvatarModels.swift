import SwiftUI
import UIKit

public enum AvatarShape: Hashable {
    case circle
    case roundedSquare
}

public enum AvatarCategory: String, CaseIterable, Identifiable {
    case work = "Công việc"
    case occasion = "Theo dịp"
    case sticker = "Sticker"
    case family = "Gia đình"

    public var id: String { rawValue }
}

public struct AvatarTemplate: Identifiable, Hashable {
    public let id: String
    public let name: String
    public let hexColors: [UInt32]
    public let shape: AvatarShape

    var swiftColors: [Color] { hexColors.map { Color(hex: $0) } }
    var uiColors: [UIColor] { hexColors.map { UIColor(hex: $0) } }
}

public enum AvatarCatalog {
    public static func templates(for category: AvatarCategory) -> [AvatarTemplate] {
        switch category {
        case .work:
            return [
                .init(id: "w1", name: "Xanh navy", hexColors: [0x1B2A4A, 0x2B72C2], shape: .roundedSquare),
                .init(id: "w2", name: "Xám bạc", hexColors: [0x3A3F4B, 0x8A93A6], shape: .roundedSquare),
                .init(id: "w3", name: "Teal", hexColors: [0x12343B, 0x1E8F9E], shape: .roundedSquare),
                .init(id: "w4", name: "Than chì", hexColors: [0x14151B, 0x3D4350], shape: .roundedSquare),
            ]
        case .occasion:
            return [
                .init(id: "o1", name: "Đỏ vàng", hexColors: [0xB01E2E, 0xF5B301], shape: .roundedSquare),
                .init(id: "o2", name: "Hồng tím", hexColors: [0x8A2BE2, 0xFF6FB5], shape: .roundedSquare),
                .init(id: "o3", name: "Xanh lễ hội", hexColors: [0x0B6E4F, 0xF5D547], shape: .roundedSquare),
                .init(id: "o4", name: "Hoàng hôn", hexColors: [0x3A1C71, 0xFF8A5C], shape: .roundedSquare),
            ]
        case .sticker:
            return [
                .init(id: "s1", name: "Neon", hexColors: [0x00C6FB, 0x005BEA], shape: .circle),
                .init(id: "s2", name: "Kẹo", hexColors: [0xFF6FD8, 0x3813C2], shape: .circle),
                .init(id: "s3", name: "Chanh", hexColors: [0xC8F051, 0x1E8F9E], shape: .circle),
                .init(id: "s4", name: "Cam đào", hexColors: [0xFFA53B, 0xFF5C5C], shape: .circle),
            ]
        case .family:
            return [
                .init(id: "f1", name: "Đào ấm", hexColors: [0xFFD3A5, 0xFD6585], shape: .roundedSquare),
                .init(id: "f2", name: "Kem", hexColors: [0xF5E6CA, 0xD9B38C], shape: .roundedSquare),
                .init(id: "f3", name: "Xanh dịu", hexColors: [0xA8EDEA, 0x8CC4FF], shape: .roundedSquare),
                .init(id: "f4", name: "Oải hương", hexColors: [0xB57CFF, 0xE0C3FC], shape: .roundedSquare),
            ]
        }
    }
}

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}
