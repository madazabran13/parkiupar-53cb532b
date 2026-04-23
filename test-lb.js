
const URL = 'http://localhost/parking/health';
const REQUESTS = 10;

async function testLoadBalancer() {
  console.log(`Starting load balancer test with ${REQUESTS} requests to ${URL}...\n`);
  
  const results = {
    'ms-parqueaderos-1': 0,
    'ms-parqueaderos-2': 0,
    'unknown': 0,
    'errors': 0
  };

  for (let i = 0; i < REQUESTS; i++) {
    try {
      const response = await fetch(URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const instance = data.instance || 'unknown';
      results[instance] = (results[instance] || 0) + 1;
      console.log(`Request ${i + 1}: Responded by ${instance}`);
    } catch (error) {
      console.error(`Request ${i + 1}: Failed - ${error.message}`);
      results.errors++;
    }
  }

  console.log('\n--- Test Results ---');
  console.log(JSON.stringify(results, null, 2));
}

testLoadBalancer();
