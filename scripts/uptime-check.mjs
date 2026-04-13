const TARGET_URL = process.argv[2] || process.env.APP_URL || 'http://localhost:3000';
const PING_ENDPOINT = `${TARGET_URL}/api/ping`;

async function checkUptime() {
  console.log(`[uptime-check] Probing ${PING_ENDPOINT}...`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(PING_ENDPOINT, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[uptime-check] FAIL: Status ${response.status}`);
      const body = await response.text();
      console.error(`[uptime-check] Response: ${body}`);
      process.exit(1);
    }

    const data = await response.json();
    if (data.ok) {
      console.log(`[uptime-check] SUCCESS: Latency ${latency}ms`);
    } else {
      console.error('[uptime-check] FAIL: ok=false');
      process.exit(1);
    }
  } catch (error) {
    console.error(`[uptime-check] ERROR: ${error.message}`);
    process.exit(1);
  }
}

checkUptime();
