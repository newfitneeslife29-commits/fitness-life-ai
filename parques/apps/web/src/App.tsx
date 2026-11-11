import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp, type Screen } from './stores/appStore';
import { useSettings } from './stores/settingsStore';
import { Background } from './components/Background';
import { Overlays } from './components/Overlays';
import { SplashScreen } from './screens/SplashScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { TablesScreen } from './screens/TablesScreen';
import { SetupScreen } from './screens/SetupScreen';
import { GameScreen } from './screens/GameScreen';
import { VictoryScreen } from './screens/VictoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ShopScreen } from './screens/ShopScreen';
import { EventsScreen } from './screens/EventsScreen';
import { RankingScreen } from './screens/RankingScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { FriendsScreen } from './screens/FriendsScreen';
import { OnlineScreen } from './screens/OnlineScreen';
import { TournamentScreen } from './screens/TournamentScreen';

const SCREENS: Record<Screen, () => JSX.Element | null> = {
  splash: SplashScreen,
  lobby: LobbyScreen,
  tables: TablesScreen,
  setup: SetupScreen,
  game: GameScreen,
  victory: VictoryScreen,
  profile: ProfileScreen,
  shop: ShopScreen,
  events: EventsScreen,
  ranking: RankingScreen,
  settings: SettingsScreen,
  friends: FriendsScreen,
  online: OnlineScreen,
  tournament: TournamentScreen,
};

/** Pantallas con su propio fondo (juego y victoria usan el del tablero). */
const OWN_BG: Screen[] = ['game', 'victory'];

export function App() {
  const screen = useApp((a) => a.screen);
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const Screen = SCREENS[screen];
  return (
    <>
      {!OWN_BG.includes(screen) ? <Background /> : null}
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="screen-host"
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 1.01 }}
          transition={{ duration: 0.22 }}
        >
          <Screen />
        </motion.div>
      </AnimatePresence>
      <Overlays />
    </>
  );
}
