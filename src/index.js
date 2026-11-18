import app from './app.js';
import { query } from './config/db.js';
import { errorLog, successLog } from './utils/logger.js';
import asciiArt from './utils/asciiArt.js';

const PORT = process.env.PORT || 8000;

app.listen(PORT, '0.0.0.0', async () => {
  successLog(asciiArt);
  successLog(`Server is running at http://localhost:${PORT}`);

  if (process.env.DATABASE_URL) {
    try {
      await query('SELECT 1');
      successLog('Successfully connected to the PostgreSQL database.');
    } catch (err) {
      errorLog('Failed to connect to the PostgreSQL database:', err.message);
    }
  }
});
