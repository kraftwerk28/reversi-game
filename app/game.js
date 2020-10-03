import { writable } from 'svelte/store';
import { initGame } from '../common/utils';

export const gameState = writable(initGame());
