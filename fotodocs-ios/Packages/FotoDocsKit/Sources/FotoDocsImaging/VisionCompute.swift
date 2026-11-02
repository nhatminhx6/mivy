import Vision
import CoreML

/// The iOS Simulator has no Neural Engine; Vision requests left on their default
/// device fail there ("no face / no subject"). Pin them to the CPU on the simulator.
enum VisionCompute {
    static func prepare(_ request: VNRequest) {
        #if targetEnvironment(simulator)
        guard let devices = try? request.supportedComputeStageDevices else { return }
        for (stage, options) in devices {
            if let cpu = options.first(where: { if case .cpu = $0 { true } else { false } }) {
                request.setComputeDevice(cpu, for: stage)
            }
        }
        #endif
    }
}
