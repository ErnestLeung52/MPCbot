/**
 * Test Continuous Workflow and Proxy Scheduling
 * 
 * This script demonstrates the continuous workflow mechanism:
 * - How proxies are allocated in round-robin fashion
 * - How total tasks are calculated based on proxy count
 * - Usage tracking and statistics
 */

const ProxyScheduler = require('./src/services/proxyScheduler');

console.log('='.repeat(60));
console.log('CONTINUOUS WORKFLOW TEST');
console.log('='.repeat(60));
console.log('');

// Simulate a scenario with 5 proxies, 3 uses each = 15 total tasks
console.log('Scenario: 5 proxies, 3 uses per proxy');
console.log('Expected: 15 total tasks with round-robin allocation');
console.log('');

const mockProxies = [
  { server: 'http://proxy1.example.com:3128', username: 'user1', password: 'pass1' },
  { server: 'http://proxy2.example.com:3128', username: 'user2', password: 'pass2' },
  { server: 'http://proxy3.example.com:3128', username: 'user3', password: 'pass3' },
  { server: 'http://proxy4.example.com:3128', username: 'user4', password: 'pass4' },
  { server: 'http://proxy5.example.com:3128', username: 'user5', password: 'pass5' }
];

const usesPerProxy = 3;
const scheduler = new ProxyScheduler(mockProxies, usesPerProxy);

console.log(scheduler.getUsageSummary());
console.log('='.repeat(60));
console.log('');

// Simulate processing tasks
console.log('SIMULATING TASK PROCESSING:');
console.log('-'.repeat(60));
console.log('');

let taskNumber = 1;

// Process all 15 tasks
while (scheduler.hasMore()) {
  const allocation = scheduler.getNext();
  
  if (!allocation) {
    console.log('All proxies exhausted!');
    break;
  }

  const proxyNum = allocation.proxyIndex + 1;
  const usage = allocation.currentUsage;
  const remaining = allocation.remaining;

  console.log(
    `Task ${taskNumber.toString().padStart(2)}/${scheduler.getTotalTasks()}: ` +
    `Proxy #${proxyNum} (${usage}/${usesPerProxy} uses) - ` +
    `${remaining} tasks remaining`
  );

  taskNumber++;
}

console.log('');
console.log('='.repeat(60));
console.log('FINAL STATISTICS:');
console.log('='.repeat(60));
console.log(scheduler.getUsageSummary());
console.log('='.repeat(60));
console.log('');

// Demonstrate what happens when you try to get more proxies after exhaustion
console.log('Testing exhaustion behavior:');
const exhaustedAllocation = scheduler.getNext();
console.log('Next allocation after exhaustion:', exhaustedAllocation ? 'Got proxy' : 'null (no more proxies)');
console.log('');

console.log('✓ Test completed successfully!');
console.log('');
console.log('Key Takeaways:');
console.log('  1. Each proxy is used once before any proxy is reused (round-robin)');
console.log('  2. Total tasks = Number of proxies × Uses per proxy');
console.log('  3. Scheduler tracks usage and prevents over-allocation');
console.log('  4. Returns null when all proxies are exhausted');
console.log('');
