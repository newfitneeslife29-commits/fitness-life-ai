import Capacitor

// Registers the app's own plugins (not from npm) when the bridge starts.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LauncherIconPlugin())
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(RestLivePlugin())
    }
}
