import { writable } from 'svelte/store';
import { initGame } from '../common/utils';

function createGameState() {
  const { set, update, subscribe } = writable(initGame());
  const syncState = (partial) => {
    return update((state) => ({ ...state, ...partial }));
  };

  return { set, update, subscribe, syncState };
}

export const gameState = createGameState();
