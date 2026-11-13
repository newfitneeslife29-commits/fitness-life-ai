import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp, type Screen } from './stores/appStore';
import { useSettings } from './stores/settingsStore';
import { resumePurchase } from './lib/payments';
import { Background } from './components/Background';
import { Overlays } from './components/Overlays';
import { GlobalDefs } from './components/GlobalDefs';
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
import { PassScreen } from './screens/PassScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { TutorialScreen } from './screens/TutorialScreen';
import { StoryScreen } from './screens/StoryScreen';
import { VipScreen } from './screens/VipScreen';
import { ClubScreen } from './screens/ClubScreen';
import { FlashScreen } from './screens/FlashScreen';
import { setMusicTrack } from './audio/audio';

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
  pass: PassScreen,
  achievements: AchievementsScreen,
  welcome: WelcomeScreen,
  tutorial: TutorialScreen,
  story: StoryScreen,
  vip: VipScreen,
  club: ClubScreen,
  flash: FlashScreen,
};

/** Pantallas con su propio fondo (juego y victoria usan el del tablero). */
const OWN_BG: Screen[] = ['game', 'victory', 'welcome', 'splash', 'tutorial'];

export function App() {
  const screen = useApp((a) => a.screen);
  useEffect(() => {
    setMusicTrack(screen === 'game' ? 'game' : 'lobby');
  }, [screen]);
  const theme = useSettings((s) => s.theme);
  const lang = useSettings((s) => s.language);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    void resumePurchase();
  }, []);
  const Screen = SCREENS[screen];
  return (
    <>
      <GlobalDefs />
      {!OWN_BG.includes(screen) ? <Background /> : null}
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="screen-host"
          initial={{ opacity: 0, y: 24, scale: 0.96, rotateX: 6 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: -14, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
          style={{ transformPerspective: 900 }}
        >
          <Screen />
        </motion.div>
      </AnimatePresence>
      <Overlays />
      <div className="status-veil" aria-hidden />
    </>
  );
}
