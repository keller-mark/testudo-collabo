export const SERVER_URL = "localhost:8000";
export const WS_URL = `ws://${SERVER_URL}`;
export const HTTP_URL = `http://${SERVER_URL}`;

export const AR = 1674/935; // aspect ratio
export const GRID_WIDTH = 50;
export const GRID_HEIGHT = Math.floor(GRID_WIDTH/AR);
export const GRID_SIZE = GRID_WIDTH*GRID_HEIGHT;

export const HAND_PLACING = "placing";
export const HAND_RUBBING = "rubbing";
export const EVENT_LOAD = "load";

export const ITEMS = [
    "beer1",
    "bottle1",
    "bottle2",
    "bottle3",
    "brick1",
    "candy1",
    "candy2",
    "chips1",
    "cone",
    "hifive",
    "oculus",
    "coffee1",
    "fire"
];