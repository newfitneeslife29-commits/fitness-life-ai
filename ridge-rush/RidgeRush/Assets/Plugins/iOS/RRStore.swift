// Ridge Rush — compras dentro de la app con StoreKit 2.
// Funciones C para Unity (Meta/Store.cs): RRStore_Load(ids), RRStore_Buy(id), RRStore_Restore().
// Responde con UnitySendMessage al objeto "RRStoreBridge":
//   OnProducts("id=precio;id=precio"), OnPurchase(id), OnPurchaseFailed(id), OnRestored(id), OnRestoreFinished("").
// Solo se entregan transacciones verificadas por StoreKit. Las consumibles (gemas) se marcan como terminadas
// después de entregarlas; la no consumible (sin anuncios) se recupera con "Restaurar compras".

import Foundation
import StoreKit

@_silgen_name("UnitySendMessage")
private func UnitySendMessage(_ obj: UnsafePointer<CChar>, _ method: UnsafePointer<CChar>, _ msg: UnsafePointer<CChar>)

private func send(_ method: String, _ message: String) {
    DispatchQueue.main.async {
        "RRStoreBridge".withCString { o in method.withCString { m in message.withCString { s in UnitySendMessage(o, m, s) } } }
    }
}

private final class RRStore {
    static let shared = RRStore()
    private var products: [String: Product] = [:]
    private var updates: Task<Void, Never>?

    func load(_ ids: [String]) {
        // Transacciones que llegan fuera de una compra (aprobación parental, renovaciones, otro dispositivo).
        if updates == nil {
            updates = Task.detached {
                for await result in Transaction.updates {
                    if case .verified(let t) = result {
                        send("OnPurchase", t.productID)
                        await t.finish()
                    }
                }
            }
        }
        Task {
            do {
                let list = try await Product.products(for: ids)
                var payload: [String] = []
                for p in list {
                    products[p.id] = p
                    payload.append("\(p.id)=\(p.displayPrice)")
                }
                send("OnProducts", payload.joined(separator: ";"))
            } catch {
                NSLog("RRStore: no se pudieron cargar los productos: \(error)")
            }
        }
    }

    func buy(_ id: String) {
        Task {
            do {
                var product = products[id]
                if product == nil { product = try await Product.products(for: [id]).first }
                guard let p = product else { send("OnPurchaseFailed", id); return }
                let result = try await p.purchase()
                switch result {
                case .success(let verification):
                    if case .verified(let t) = verification {
                        send("OnPurchase", t.productID)
                        await t.finish()
                    } else {
                        send("OnPurchaseFailed", id)
                    }
                default:
                    send("OnPurchaseFailed", id) // cancelada o pendiente
                }
            } catch {
                send("OnPurchaseFailed", id)
            }
        }
    }

    func restore() {
        Task {
            try? await AppStore.sync()
            for await result in Transaction.currentEntitlements {
                if case .verified(let t) = result { send("OnRestored", t.productID) }
            }
            send("OnRestoreFinished", "")
        }
    }
}

@_cdecl("RRStore_Load")
public func RRStore_Load(_ idsCsv: UnsafePointer<CChar>) {
    RRStore.shared.load(String(cString: idsCsv).split(separator: ",").map(String.init))
}

@_cdecl("RRStore_Buy")
public func RRStore_Buy(_ id: UnsafePointer<CChar>) { RRStore.shared.buy(String(cString: id)) }

@_cdecl("RRStore_Restore")
public func RRStore_Restore() { RRStore.shared.restore() }
