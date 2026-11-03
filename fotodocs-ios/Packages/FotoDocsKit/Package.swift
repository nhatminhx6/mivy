// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "FotoDocsKit",
    defaultLocalization: "vi",
    platforms: [.iOS(.v26)],
    products: [
        .library(name: "FotoDocsCore", targets: ["FotoDocsCore"]),
        .library(name: "FotoDocsImaging", targets: ["FotoDocsImaging"]),
        .library(name: "FotoDocsDesign", targets: ["FotoDocsDesign"]),
        .library(name: "FeatureIDPhoto", targets: ["FeatureIDPhoto"]),
        .library(name: "FeatureDocuments", targets: ["FeatureDocuments"]),
        .library(name: "FeatureAvatar", targets: ["FeatureAvatar"]),
        .library(name: "FeatureSettings", targets: ["FeatureSettings"]),
    ],
    targets: [
        .target(
            name: "FotoDocsCore",
            resources: [.process("Resources")]
        ),
        .target(
            name: "FotoDocsImaging",
            dependencies: ["FotoDocsCore"],
            resources: [.copy("Resources/Garments")]
        ),
        .target(
            name: "FotoDocsDesign",
            resources: [.process("Resources")]
        ),
        .target(
            name: "FeatureIDPhoto",
            dependencies: ["FotoDocsCore", "FotoDocsImaging", "FotoDocsDesign"]
        ),
        .target(
            name: "FeatureDocuments",
            dependencies: ["FotoDocsCore", "FotoDocsImaging", "FotoDocsDesign"],
            resources: [.copy("Resources/VisaForms")]
        ),
        .target(
            name: "FeatureAvatar",
            dependencies: ["FotoDocsCore", "FotoDocsImaging", "FotoDocsDesign"]
        ),
        .target(
            name: "FeatureSettings",
            dependencies: ["FotoDocsCore", "FotoDocsDesign"]
        ),
    ]
)
