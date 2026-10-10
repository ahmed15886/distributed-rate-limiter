import http from 'k6/http';
import { Counter } from 'k6/metrics';

const allowed = new Counter('allowed');
const limited = new Counter('limited');
const errors = new Counter('errors');

// 429 is a correct answer here, so only real errors count as failed
http.setResponseCallback(http.expectedStatuses(200, 429));

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 200),
      timeUnit: '1s',
      duration: __ENV.DURATION || '30s',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
};

export default function () {
  const res = http.get(`http://host.docker.internal:80${__ENV.TARGET || '/api/redis/token-bucket'}`);
  if (res.status === 200) allowed.add(1);
  else if (res.status === 429) limited.add(1);
  else errors.add(1);
}
