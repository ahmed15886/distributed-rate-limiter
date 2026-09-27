import http from 'k6/http';
import { Counter } from 'k6/metrics';

const allowed = new Counter('allowed');
const limited = new Counter('limited');

export const options = {
  scenarios: {
    burst: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
      maxDuration: '10s',
    },
  },
};

export default function () {
  const res = http.get(`http://host.docker.internal:80${__ENV.TARGET || '/api/redis/token-bucket'}`);
  if (res.status === 200) allowed.add(1);
  if (res.status === 429) limited.add(1);
}