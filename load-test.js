import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_COOKIE = __ENV.AUTH_COOKIE || '';
const authHeaders = AUTH_COOKIE ? { Cookie: AUTH_COOKIE } : {};

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '1m', target: 75 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  },
};

export default function () {
  const responses = [
    http.get(`${BASE_URL}/ar/login`, { headers: authHeaders, tags: { name: 'login-page' } }),
    http.get(`${BASE_URL}/api/ping`, { headers: authHeaders, tags: { name: 'api-ping' } }),
    http.get(`${BASE_URL}/ar/dashboard`, { headers: authHeaders, tags: { name: 'dashboard' } }),
    http.get(`${BASE_URL}/ar/students`, { headers: authHeaders, tags: { name: 'students' } }),
    http.get(`${BASE_URL}/ar/teachers`, { headers: authHeaders, tags: { name: 'teachers' } }),
    http.get(`${BASE_URL}/ar/payments`, { headers: authHeaders, tags: { name: 'payments' } }),
    http.get(`${BASE_URL}/ar/reports`, { headers: authHeaders, tags: { name: 'reports' } }),
    http.get(`${BASE_URL}/api/web/reports/overview`, { headers: authHeaders, tags: { name: 'api-reports-overview' } }),
  ];

  responses.forEach((response) => {
    check(response, {
      'status is acceptable': (res) => res.status >= 200 && res.status < 400,
    });
  });

  sleep(Math.random() * 2 + 0.5);
}
