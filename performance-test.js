
const URL = 'http://localhost/parking/spots?tenantId=a32381dc-decc-4fd0-9924-d9c763db438a';
//const URL = 'http://localhost:30031/v1/parqueaderos/spots?tenantId=a32381dc-decc-4fd0-9924-d9c763db438a';
const TOTAL_REQUESTS = 5000;
const CONCURRENCY = 100;

async function runPerformanceTest() {
  console.log(`--- Starting Performance Test ---`);
  console.log(`URL: ${URL}`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  const results = {
    instances: {},
    latencies: [],
    errors: 0,
    startTime: Date.now()
  };

  const executeRequest = async () => {
    const start = Date.now();
    try {
      const response = await fetch(URL);
      const latency = Date.now() - start;
      results.latencies.push(latency);
      
      if (response.ok) {
        const data = await response.json();
        const inst = data.instance || 'unknown';
        results.instances[inst] = (results.instances[inst] || 0) + 1;
      } else {
        results.errors++;
      }
    } catch (e) {
      results.errors++;
    }
  };

  // Run in batches to simulate concurrency
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && (i + j) < TOTAL_REQUESTS; j++) {
      batch.push(executeRequest());
    }
    await Promise.all(batch);
  }

  const totalTime = (Date.now() - results.startTime) / 1000;
  const avgLatency = results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length;
  const rps = TOTAL_REQUESTS / totalTime;

  console.log('--- Results ---');
  console.log(`Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`Req/sec (RPS): ${rps.toFixed(2)}`);
  console.log(`Errors: ${results.errors}`);
  console.log('\nDistribution per instance:');
  console.table(results.instances);
}

runPerformanceTest();
