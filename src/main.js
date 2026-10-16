import './style.css';
import { WildlandsGame } from './game.js';
const game = new WildlandsGame(document.getElementById('world'), console.log);
document.getElementById('start-btn').addEventListener('click', () => game.start());
