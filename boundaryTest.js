const { createSlidingWindow, allowRequest: allowSliding } = require('./slidingWindow');
const { createWindow, allowRequest: allowFixed } = require('./fixedWindow');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function boundaryTest() {
  const sliding = createSlidingWindow(5, 5000);
  const fixed = createWindow(5, 5000);

  // Wait until we're near the end of the window
  console.log('--- Waiting 4.8 seconds first ---');
  await sleep(4800);

  // Burst 1: at end of window
  console.log('\n--- Burst 1: 5 requests near end of window ---');
  for (let i = 0; i < 5; i++) {
    console.log('Sliding:', allowSliding(sliding));
    console.log('Fixed:', allowFixed(fixed));
  }

  // Wait just past the boundary
  console.log('\n--- Waiting 0.3 seconds (crossing boundary) ---');
  await sleep(300);

  // Burst 2: at start of new window
  console.log('\n--- Burst 2: 5 requests just after boundary ---');
  for (let i = 0; i < 5; i++) {
    console.log('Sliding:', allowSliding(sliding));
    console.log('Fixed:', allowFixed(fixed));
  }
}

boundaryTest();

