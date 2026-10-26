import ActivityKit
import SwiftUI
import WidgetKit

// Home screen widget: the streak, today's steps and today's workout, as the
// app last saved them (WidgetBridgePlugin, in the shared App Group).

struct WidgetData: Decodable {
    var streak = "0"
    var streakLabel = ""
    var steps = "0"
    var stepsLabel = ""
    var next = ""
    var nextLabel = ""
    // The day it was saved, and the next workout even if today's is done:
    // after midnight the widget shows 0 steps and that workout.
    var day: String?
    var later: String?

    var isToday: Bool {
        guard let day else { return true }
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return day == f.string(from: .now)
    }
    var shownSteps: String { isToday ? steps : "0" }
    var shownNext: String { isToday ? next : (later ?? next) }

    static func load() -> WidgetData {
        guard let json = UserDefaults(suiteName: "group.com.fitnesslife.app")?.string(forKey: "widget"),
              let data = json.data(using: .utf8),
              let decoded = try? JSONDecoder().decode(WidgetData.self, from: data) else { return WidgetData() }
        return decoded
    }
}

struct Entry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: .now, data: WidgetData(streak: "7", streakLabel: "🔥", steps: "6.240", stepsLabel: "👟", next: "Fitness Life", nextLabel: ""))
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, data: WidgetData.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        // The app reloads it whenever its data changes; an hourly look as well.
        // Every hour, and right after midnight for the new day.
        let midnight = Calendar.current.startOfDay(for: .now.addingTimeInterval(86_400))
        completion(Timeline(entries: [Entry(date: .now, data: WidgetData.load())], policy: .after(min(.now.addingTimeInterval(3600), midnight.addingTimeInterval(60)))))
    }
}

struct FitnessWidgetView: View {
    let entry: Entry
    private let brand = Color(red: 0.95, green: 0.42, blue: 0.11)

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                stat(value: entry.data.streak, label: entry.data.streakLabel, icon: "flame.fill", color: brand)
                Spacer(minLength: 8)
                stat(value: entry.data.shownSteps, label: entry.data.stepsLabel, icon: "figure.walk", color: .white)
            }
            if !entry.data.shownNext.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.data.nextLabel).font(.caption2.bold()).foregroundStyle(brand).lineLimit(1)
                    Text(entry.data.shownNext).font(.subheadline.bold()).foregroundStyle(.white).lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) {
            LinearGradient(colors: [Color(red: 0.11, green: 0.12, blue: 0.15), Color(red: 0.04, green: 0.05, blue: 0.06)], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    private func stat(value: String, label: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Image(systemName: icon).foregroundStyle(color)
                Text(value).font(.title2.bold()).foregroundStyle(.white).minimumScaleFactor(0.6).lineLimit(1)
            }
            Text(label).font(.caption2).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
        }
    }
}

struct FitnessWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FitnessWidget", provider: Provider()) { entry in
            FitnessWidgetView(entry: entry)
        }
        .configurationDisplayName("Fitness Life")
        .description("🔥 👟 🏋️")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// ---------- Rest countdown on the lock screen ----------

// Same type, field for field, as in the app (WidgetBridgePlugin.swift), which
// starts and ends the activity.
struct RestActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var startedAt: Date
        var endsAt: Date
        var subtitle: String
    }
    var title: String
}

// The rest between sets: a countdown that runs without the app, on the lock
// screen and in the Dynamic Island.
struct RestLiveActivity: Widget {
    private let brand = Color(red: 0.95, green: 0.42, blue: 0.11)

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestActivityAttributes.self) { context in
            HStack(spacing: 14) {
                Image(systemName: "timer").font(.title2.bold()).foregroundStyle(brand)
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.title).font(.headline).foregroundStyle(.white)
                    if !context.state.subtitle.isEmpty {
                        Text(context.state.subtitle).font(.caption).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
                    }
                }
                Spacer(minLength: 8)
                countdown(context.state).font(.system(size: 36, weight: .bold).monospacedDigit()).foregroundStyle(brand).frame(width: 96, alignment: .trailing)
            }
            .padding(16)
            .activityBackgroundTint(Color(red: 0.07, green: 0.08, blue: 0.10))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.attributes.title, systemImage: "timer").font(.headline).foregroundStyle(brand)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    countdown(context.state).font(.title2.bold().monospacedDigit()).foregroundStyle(.white).frame(width: 80, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.subtitle).font(.caption).foregroundStyle(.white.opacity(0.75)).lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "timer").foregroundStyle(brand)
            } compactTrailing: {
                countdown(context.state).monospacedDigit().foregroundStyle(brand).frame(width: 46)
            } minimal: {
                Image(systemName: "timer").foregroundStyle(brand)
            }
        }
    }

    // Counts down to the end of the rest by itself; stays at 0:00 after it.
    private func countdown(_ state: RestActivityAttributes.ContentState) -> Text {
        Text(timerInterval: state.startedAt...max(state.startedAt, state.endsAt), countsDown: true)
    }
}

@main
struct FitnessWidgets: WidgetBundle {
    var body: some Widget {
        FitnessWidget()
        RestLiveActivity()
    }
}
