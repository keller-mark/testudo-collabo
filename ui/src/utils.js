import { ITEMS } from './constants';

export const itemToPath = (item) => `img/items/${item}.png`;
export const itemToInt = (item) => (item === "rubs" ? 99 : ITEMS.indexOf(item));
export const intToItem = (i) => (i === 99 ? "rubs" : ITEMS[i]);
export const sum = (previousValue, currentValue)  => (previousValue + currentValue);