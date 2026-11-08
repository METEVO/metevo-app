import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

import { isValidNodePubkey } from './contacts';

/**
 * Check words: six everyday words derived from a node pubkey. Both people
 * compare them face-to-face, with both screens visible; if they match, the
 * shared link belongs to the phone in front of you and not to someone who
 * copied the name. The words are SHA-256 over a fixed domain tag and the
 * whole compressed key, keeping 6 x 8 = 48 bits: grinding a key to match
 * them is not cheap. Never relay them by voice call or NFC.
 */
const CHECK_WORDS: readonly string[] = [
  'apple', 'arrow', 'bag', 'ball', 'banana', 'bank', 'basket', 'bath', 'beach', 'bean', 'bear',
  'bed', 'bee', 'bell', 'belt', 'bench', 'bike', 'bird', 'boat', 'bone', 'book', 'boot', 'bottle',
  'bowl', 'box', 'bread', 'brick', 'bridge', 'brush', 'bucket', 'bus', 'butter', 'button', 'cake',
  'camel', 'camera', 'candle', 'car', 'carrot', 'cat', 'chair', 'cheese', 'cherry', 'chicken',
  'clock', 'cloud', 'coat', 'coconut', 'coffee', 'coin', 'comb', 'corn', 'cow', 'crab', 'crown',
  'cup', 'deer', 'desk', 'dog', 'doll', 'door', 'dragon', 'drum', 'duck', 'eagle', 'egg',
  'elephant', 'engine', 'eye', 'fan', 'farm', 'feather', 'fence', 'fire', 'fish', 'flag', 'flower',
  'fork', 'fox', 'frog', 'garden', 'gate', 'ghost', 'gift', 'giraffe', 'glass', 'glove', 'goat',
  'gold', 'grape', 'guitar', 'hammer', 'hand', 'hat', 'heart', 'hill', 'horse', 'house', 'ice',
  'island', 'jacket', 'jar', 'jeans', 'key', 'kite', 'knife', 'ladder', 'lake', 'lamp', 'leaf',
  'lemon', 'lion', 'lock', 'map', 'melon', 'milk', 'mirror', 'monkey', 'moon', 'mountain', 'mouse',
  'mouth', 'nail', 'nest', 'net', 'nose', 'ocean', 'onion', 'orange', 'owl', 'panda', 'paper',
  'park', 'parrot', 'peach', 'pear', 'pen', 'pencil', 'pepper', 'piano', 'pig', 'pillow', 'pizza',
  'plane', 'plant', 'plate', 'pocket', 'potato', 'pumpkin', 'queen', 'rabbit', 'radio', 'rain',
  'ring', 'river', 'road', 'robot', 'rock', 'roof', 'rope', 'rose', 'sail', 'salt', 'sand',
  'scarf', 'school', 'sea', 'seed', 'sheep', 'shell', 'ship', 'shirt', 'shoe', 'sky', 'snake',
  'snow', 'sock', 'sofa', 'soup', 'spoon', 'star', 'stone', 'sugar', 'sun', 'swan', 'table',
  'tent', 'tiger', 'toast', 'tomato', 'tooth', 'towel', 'tower', 'toy', 'tractor', 'train', 'tree',
  'truck', 'turtle', 'umbrella', 'van', 'vase', 'violin', 'wall', 'watch', 'water', 'whale',
  'wheel', 'window', 'wolf', 'yogurt', 'zebra', 'acorn', 'anchor', 'badge', 'barrel', 'beard',
  'berry', 'blanket', 'bubble', 'cactus', 'canoe', 'castle', 'chain', 'chalk', 'cloak', 'compass',
  'cookie', 'cotton', 'couch', 'dice', 'dolphin', 'donut', 'eel', 'feast', 'flute', 'forest',
  'fridge', 'gem', 'globe', 'hive', 'honey', 'hook', 'igloo', 'jelly', 'jungle', 'kettle', 'koala',
  'lantern', 'lizard', 'mango', 'medal', 'meadow', 'mitten', 'moth', 'mug',
];

const CHECK_WORD_DOMAIN = 'metevo-contact-check-v1';

export const CHECK_WORD_COUNT = 6;

export function contactCheckWords(nodePubkey: string): string[] {
  if (!isValidNodePubkey(nodePubkey)) {
    throw new Error('contact node pubkey is invalid');
  }
  const compressedKey = hexToBytes(nodePubkey.trim().toLowerCase());
  const digest = sha256(concatBytes(utf8ToBytes(CHECK_WORD_DOMAIN), compressedKey));
  return Array.from(digest.subarray(0, CHECK_WORD_COUNT), (byte) => CHECK_WORDS[byte]);
}
