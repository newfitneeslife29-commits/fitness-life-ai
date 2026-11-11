import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from './stores/appStore';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { GameScreen } from './screens/GameScreen';
import { VictoryScreen } from './screens/VictoryScreen';

const SCREENS = { home: HomeScreen, setup: SetupScreen, game: GameScreen, victory: VictoryScreen };

export function App() {
  const screen = useApp((a) => a.screen);
  const Screen = SCREENS[screen];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        className="screen-host"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.22 }}
      >
        <Screen />
      </motion.div>
    </AnimatePresence>
  );
}
