import ActivityKit
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

// ---------- Rest countdown on the lock screen ----------

// What the Live Activity shows (the same type, field for field, is in
// FitnessWidget.swift, which draws it): the rest's end time and what's next.
@available(iOS 16.1, *)
struct RestActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var startedAt: Date
        var endsAt: Date
        var subtitle: String
    }
    var title: String
}

// Starts or moves the rest's Live Activity (lock screen and Dynamic Island)
// and ends it. The countdown runs on its own, without the app.
@objc(RestLivePlugin)
public class RestLivePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RestLivePlugin"
    public let jsName = "RestLive"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        guard let endsAtMs = call.getDouble("endsAt") else {
            call.reject("bad_data")
            return
        }
        let endsAt = Date(timeIntervalSince1970: endsAtMs / 1000)
        let now = Date()
        guard ActivityAuthorizationInfo().areActivitiesEnabled, endsAt > now else {
            call.resolve()
            return
        }
        let title = call.getString("title") ?? ""
        let subtitle = call.getString("subtitle") ?? ""
        let content = ActivityContent(
            state: RestActivityAttributes.ContentState(startedAt: now, endsAt: endsAt, subtitle: subtitle),
            staleDate: endsAt
        )
        Task {
            if let current = Activity<RestActivityAttributes>.activities.first {
                await current.update(content)
            } else {
                _ = try? Activity.request(attributes: RestActivityAttributes(title: title), content: content)
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            for activity in Activity<RestActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
