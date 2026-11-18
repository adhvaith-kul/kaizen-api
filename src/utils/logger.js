import path from 'path';
import os from 'os';
import util from 'util';
import fs from 'fs';

// ANSI color codes for terminal output
const COLOR_OFF = '\x1b[0m';
const ITALIC_START = '\x1b[3m';
const RED_START = '\x1b[31m';
const GREEN_START = '\x1b[32m';
const YELLOW_START = '\x1b[33m';

/** @typedef {(...d: any[]) => void} LogFunction */

// Basic logging functions with color coding
const log = (...params) => console.log(COLOR_OFF, ...params);

const errorLog = (...params) => console.log(RED_START, ...params, COLOR_OFF);

const warnLog = (...params) => console.log(YELLOW_START, ...params, COLOR_OFF);

const successLog = (...params) => console.log(GREEN_START, ...params, COLOR_OFF);

/** @param {'success' | 'error' | 'warn' | null} logType */
function italicLog(logType, ...params) {
  const color =
    logType === 'error'
      ? RED_START
      : logType === 'success'
        ? GREEN_START
        : logType === 'warn'
          ? YELLOW_START
          : COLOR_OFF;
  console.log(ITALIC_START, color, ...params, COLOR_OFF);
}

/**
 * Returns a log function that can be used to log to console and/or file
 * @param {{ prefix?: string, logType?: 'success' | 'error' | 'warn' | 'italic', logToFile?: boolean, filePath?: string }} options
 * @returns {(...d: any[]) => void}
 */
function logFactory({
  prefix = '',
  logType = null,
  logToFile = false,
  filePath = path.join(os.homedir(), '.debug', 'logger.log'),
}) {
  if (logToFile) {
    const log_file = fs.createWriteStream(filePath, { flags: 'w' });
    return (...logs) => {
      const d = new Date().toISOString();
      log_file.write(`${prefix} ${d} ${util.format(...logs)}\n`);
    };
  } else {
    switch (logType) {
      case 'success':
        return (...logs) => {
          successLog(`${prefix} ${util.format(...logs)}`);
        };
      case 'error':
        return (...logs) => {
          errorLog(`${prefix} ${util.format(...logs)}`);
        };
      case 'warn':
        return (...logs) => {
          warnLog(`${prefix} ${util.format(...logs)}`);
        };
      case 'italic':
        return (...logs) => {
          italicLog(null, `${prefix} ${util.format(...logs)}`);
        };
      default:
        return (...logs) => {
          log(`${prefix} ${util.format(...logs)}`);
        };
    }
  }
}

/**
 * Creates all kinds of logs: `log`, `success`, `error`, `warn`, `italic`
 * @param {string} [prefix]
 * @returns {{ log: LogFunction, successLog: LogFunction, errorLog: LogFunction, warnLog: LogFunction, italicLog: LogFunction }}
 */
function createAllLogsFactory(prefix = '') {
  return {
    log: logFactory({ prefix }),
    successLog: logFactory({ prefix, logType: 'success' }),
    errorLog: logFactory({ prefix, logType: 'error' }),
    warnLog: logFactory({ prefix, logType: 'warn' }),
    italicLog: logFactory({ prefix, logType: 'italic' }),
  };
}

export { log, errorLog, warnLog, successLog, italicLog, logFactory, createAllLogsFactory };
