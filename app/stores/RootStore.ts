import { PlayerStore } from '@stores/PlayerStore';
import { UIStore } from '@stores/UIStore';

/**
 * Root MobX store that owns and coordinates the PlayerStore and UIStore.
 * Instantiates the sub-stores, then exposes a bootstrap method to hydrate
 * persisted UI state and start the player's background services on app start.
 */
export class RootStore {
  player: PlayerStore;
  ui: UIStore;

  constructor() {
    this.ui = new UIStore();
    this.player = new PlayerStore();
    this.player.root = this;
  }

  /** Hydrates persisted state and wires up player background services. */
  async bootstrap() {
    await this.ui.bootstrap();
    this.player.setup();
  }

  /** Tears down player background services (listeners, timers, reactions). */
  dispose() {
    this.player.dispose();
  }
}
