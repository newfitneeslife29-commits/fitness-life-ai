// Ridge Rush — vibración con Core Haptics (iOS 13+; el juego requiere iOS 17).
// Expone funciones C para Unity (DllImport "__Internal") desde Platform/Haptics.cs:
//   RRHaptics_Init, RRHaptics_Engine(intensidad, nitidez), RRHaptics_Impact(intensidad, nitidez), RRHaptics_Stop.
// El "motor" es un patrón continuo en bucle cuya intensidad y nitidez se modulan en tiempo real
// con parámetros dinámicos (rpm y gas). Los golpes son eventos transitorios.

import Foundation
import CoreHaptics

private final class RRHapticsEngine {
    static let shared = RRHapticsEngine()

    private var engine: CHHapticEngine?
    private var continuous: CHHapticAdvancedPatternPlayer?
    private var running = false
    private var supported: Bool { CHHapticEngine.capabilitiesForHardware().supportsHaptics }

    func start() -> Bool {
        guard supported else { return false }
        if engine != nil { return true }
        do {
            let e = try CHHapticEngine()
            e.playsHapticsOnly = true
            e.isAutoShutdownEnabled = false
            // Si el sistema detiene o reinicia el motor (llamada, segundo plano), se vuelve a crear el patrón.
            e.stoppedHandler = { [weak self] _ in self?.continuous = nil; self?.running = false }
            e.resetHandler = { [weak self] in
                self?.continuous = nil; self?.running = false
                try? self?.engine?.start()
            }
            try e.start()
            engine = e
            return true
        } catch {
            NSLog("RRHaptics: no se pudo iniciar Core Haptics: \(error)")
            return false
        }
    }

    private func makeContinuous() throws -> CHHapticAdvancedPatternPlayer? {
        guard let engine = engine else { return nil }
        let event = CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.5),
            ],
            relativeTime: 0,
            duration: 30)
        let pattern = try CHHapticPattern(events: [event], parameters: [])
        let player = try engine.makeAdvancedPlayer(with: pattern)
        player.loopEnabled = true
        return player
    }

    func setEngine(intensity: Float, sharpness: Float) {
        guard engine != nil else { return }
        do {
            if intensity <= 0.01 {
                if running { try continuous?.stop(atTime: CHHapticTimeImmediate); running = false }
                return
            }
            if continuous == nil { continuous = try makeContinuous() }
            guard let player = continuous else { return }
            if !running { try player.start(atTime: CHHapticTimeImmediate); running = true }
            try player.sendParameters([
                CHHapticDynamicParameter(parameterID: .hapticIntensityControl, value: max(0, min(1, intensity)), relativeTime: 0),
                CHHapticDynamicParameter(parameterID: .hapticSharpnessControl, value: max(-1, min(1, sharpness * 2 - 1)), relativeTime: 0),
            ], atTime: CHHapticTimeImmediate)
        } catch {
            continuous = nil
            running = false
        }
    }

    func impact(intensity: Float, sharpness: Float) {
        guard let engine = engine else { return }
        do {
            let event = CHHapticEvent(
                eventType: .hapticTransient,
                parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: max(0, min(1, intensity))),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: max(0, min(1, sharpness))),
                ],
                relativeTime: 0)
            let player = try engine.makePlayer(with: CHHapticPattern(events: [event], parameters: []))
            try player.start(atTime: CHHapticTimeImmediate)
        } catch {
            // Ignorar: la vibración nunca debe afectar al juego.
        }
    }

    func stop() {
        try? continuous?.stop(atTime: CHHapticTimeImmediate)
        running = false
    }
}

@_cdecl("RRHaptics_Init")
public func RRHaptics_Init() -> Bool { RRHapticsEngine.shared.start() }

@_cdecl("RRHaptics_Engine")
public func RRHaptics_Engine(_ intensity: Float, _ sharpness: Float) {
    RRHapticsEngine.shared.setEngine(intensity: intensity, sharpness: sharpness)
}

@_cdecl("RRHaptics_Impact")
public func RRHaptics_Impact(_ intensity: Float, _ sharpness: Float) {
    RRHapticsEngine.shared.impact(intensity: intensity, sharpness: sharpness)
}

@_cdecl("RRHaptics_Stop")
public func RRHaptics_Stop() { RRHapticsEngine.shared.stop() }
