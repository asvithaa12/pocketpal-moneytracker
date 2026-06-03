import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a new transaction object with all required fields.
 * @param {Partial<Transaction>} fields
 * @returns {Transaction}
 */
export function createTransaction(fields = {}) {
  return {
    id: uuidv4(),
    type: 'expense',
    amount: 0,
    category: 'other',
    subcategory: 'cash',
    description: '',
    date: new Date().toISOString(),
    friendName: null,
    source: 'manual',
    qrId: null,
    ...fields,
  };
}

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {'expense'|'friend_gave'|'friend_received'|'settlement'} type
 * @property {number} amount
 * @property {'food'|'education'|'transport'|'entertainment'|'clothing'|'health'|'friend_gave'|'other'} category
 * @property {'cash'|'fampay'|'phonepe'|'online'} subcategory
 * @property {string} description
 * @property {string} date
 * @property {string|null} friendName
 * @property {'voice'|'screenshot'|'qr'|'manual'} source
 * @property {string|null} qrId
 */

/**
 * @typedef {Object} QRTag
 * @property {string} label
 * @property {string} categoryId
 * @property {number} timesScanned
 */
