// Ridge Rush — Game Center: inicio de sesión, clasificaciones y logros.
// Funciones C para Unity (Platform/GameServices.cs). Si el jugador no inicia sesión, todo se ignora en silencio.

import Foundation
import GameKit
import UIKit

private final class RRGameCenter: NSObject, GKGameCenterControllerDelegate {
    static let shared = RRGameCenter()

    func authenticate() {
        GKLocalPlayer.local.authenticateHandler = { viewController, error in
            if let vc = viewController {
                UIApplication.shared.connectedScenes
                    .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
                    .first?.present(vc, animated: true)
            } else if let error = error {
                NSLog("RRGameCenter: sin Game Center: \(error.localizedDescription)")
            }
        }
    }

    func score(_ board: String, _ value: Int) {
        guard GKLocalPlayer.local.isAuthenticated else { return }
        GKLeaderboard.submitScore(value, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [board]) { error in
            if let error = error { NSLog("RRGameCenter: puntuación no enviada (\(board)): \(error.localizedDescription)") }
        }
    }

    func achievement(_ id: String, _ percent: Double) {
        guard GKLocalPlayer.local.isAuthenticated else { return }
        let a = GKAchievement(identifier: id)
        a.percentComplete = percent
        a.showsCompletionBanner = true
        GKAchievement.report([a]) { error in
            if let error = error { NSLog("RRGameCenter: logro no enviado (\(id)): \(error.localizedDescription)") }
        }
    }

    func dashboard() {
        guard GKLocalPlayer.local.isAuthenticated else { authenticate(); return }
        let vc = GKGameCenterViewController(state: .leaderboards)
        vc.gameCenterDelegate = self
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
            .first?.present(vc, animated: true)
    }

    func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}

@_cdecl("RRGC_Authenticate")
public func RRGC_Authenticate() { DispatchQueue.main.async { RRGameCenter.shared.authenticate() } }

@_cdecl("RRGC_Score")
public func RRGC_Score(_ board: UnsafePointer<CChar>, _ value: Int64) {
    let b = String(cString: board)
    DispatchQueue.main.async { RRGameCenter.shared.score(b, Int(value)) }
}

@_cdecl("RRGC_Achievement")
public func RRGC_Achievement(_ id: UnsafePointer<CChar>, _ percent: Double) {
    let i = String(cString: id)
    DispatchQueue.main.async { RRGameCenter.shared.achievement(i, percent) }
}

@_cdecl("RRGC_Dashboard")
public func RRGC_Dashboard() { DispatchQueue.main.async { RRGameCenter.shared.dashboard() } }
