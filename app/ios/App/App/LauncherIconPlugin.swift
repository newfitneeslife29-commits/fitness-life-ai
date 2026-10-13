import Capacitor
import UIKit

// The app icon color chosen in Settings. Each color other than the default
// is an alternate icon set in Assets.xcassets ("AppIcon-Rojo", ...), listed
// in the ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES build setting.
@objc(LauncherIconPlugin)
public class LauncherIconPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LauncherIconPlugin"
    public let jsName = "LauncherIcon"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]

    static let icons = ["naranja", "rojo", "rosa", "morado", "azul", "verde", "dorado", "blanco", "claro"]
    static let defaultIcon = "naranja"
    static let prefix = "AppIcon-"

    @objc func get(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let name = UIApplication.shared.alternateIconName.map { String($0.dropFirst(Self.prefix.count)).lowercased() }
            call.resolve(["name": name ?? Self.defaultIcon])
        }
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), Self.icons.contains(name) else {
            call.reject("unknown_icon")
            return
        }
        DispatchQueue.main.async {
            guard UIApplication.shared.supportsAlternateIcons else {
                call.reject("unsupported")
                return
            }
            let iconName = name == Self.defaultIcon ? nil : Self.prefix + name.prefix(1).uppercased() + name.dropFirst()
            UIApplication.shared.setAlternateIconName(iconName) { error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve()
                }
            }
        }
    }
}
