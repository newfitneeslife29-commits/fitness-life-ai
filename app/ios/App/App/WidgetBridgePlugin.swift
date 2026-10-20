import Capacitor
import WidgetKit

// The home screen widget's data (streak, steps, today's workout), written by
// the app as JSON with the texts already in the person's language, in the
// App Group the widget extension reads (FitnessWidget).
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)
    ]

    static let group = "group.com.fitnesslife.app"
    static let key = "widget"

    @objc func update(_ call: CAPPluginCall) {
        guard let data = call.getString("data"), data.count <= 4000, let defaults = UserDefaults(suiteName: Self.group) else {
            call.reject("bad_data")
            return
        }
        defaults.set(data, forKey: Self.key)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
