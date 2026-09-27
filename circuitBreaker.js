const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

function createCircuitBreaker(failureThreshold = 3, cooldownMs = 10000) {
  return {
    state: STATES.CLOSED,
    failureCount: 0,
    failureThreshold: failureThreshold,
    cooldownMs: cooldownMs,
    openedAt: null
  };
}

function canAttempt(breaker) {
  if (breaker.state === STATES.CLOSED) {
    return true;
  }

  if (breaker.state === STATES.OPEN) {
    const elapsed = Date.now() - breaker.openedAt;
    if (elapsed >= breaker.cooldownMs) {
      breaker.state = STATES.HALF_OPEN;
      return true;
    }
    return false;
  }

  return true;
}

function recordSuccess(breaker) {
  breaker.state = STATES.CLOSED;
  breaker.failureCount = 0;
  breaker.openedAt = null;
}

function recordFailure(breaker) {
  breaker.failureCount += 1;

  if (breaker.state === STATES.HALF_OPEN) {
    breaker.state = STATES.OPEN;
    breaker.openedAt = Date.now();
    return;
  }

  if (breaker.failureCount >= breaker.failureThreshold) {
    breaker.state = STATES.OPEN;
    breaker.openedAt = Date.now();
  }
}

module.exports = { createCircuitBreaker, canAttempt, recordSuccess, recordFailure, STATES };