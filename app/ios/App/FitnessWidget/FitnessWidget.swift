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
        completion(Timeline(entries: [Entry(date: .now, data: WidgetData.load())], policy: .after(.now.addingTimeInterval(3600))))
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
                stat(value: entry.data.steps, label: entry.data.stepsLabel, icon: "figure.walk", color: .white)
            }
            if !entry.data.next.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.data.nextLabel).font(.caption2.bold()).foregroundStyle(brand).lineLimit(1)
                    Text(entry.data.next).font(.subheadline.bold()).foregroundStyle(.white).lineLimit(1)
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

@main
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
