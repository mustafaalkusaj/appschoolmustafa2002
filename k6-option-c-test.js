import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 25 },   // Ramp to 25 users
    { duration: "2m", target: 50 },   // Ramp to 50 users
    { duration: "3m", target: 50 },   // Stay at 50 users
    { duration: "2m", target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<1500"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = "http://localhost:3000";

export default function loadTest() {
  // Test 1: Dashboard (lightweight)
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    "dashboard: 200": (r) => r.status === 200,
    "dashboard: <1000ms": (r) => r.timings.duration < 1000,
  });
  sleep(2);

  // Test 2: Students list (with pagination)
  const page = Math.floor(Math.random() * 5) + 1;
  res = http.get(`${BASE_URL}/api/core/students?page=${page}&limit=50`);
  check(res, {
    "students: 200": (r) => r.status === 200,
    "students: <1000ms": (r) => r.timings.duration < 1000,
  });
  sleep(1);

  // Test 3: Salaries
  res = http.get(`${BASE_URL}/api/core/salaries?page=1&limit=50`);
  check(res, {
    "salaries: 200": (r) => r.status === 200,
    "salaries: <1200ms": (r) => r.timings.duration < 1200,
  });
  sleep(1);

  // Test 4: Expenses
  res = http.get(`${BASE_URL}/api/web/expenses?page=1&limit=50`);
  check(res, {
    "expenses: 200": (r) => r.status === 200,
    "expenses: <1000ms": (r) => r.timings.duration < 1000,
  });
  sleep(1);

  // Test 5: Employees
  res = http.get(`${BASE_URL}/api/core/employees?page=1&limit=20`);
  check(res, {
    "employees: 200": (r) => r.status === 200,
    "employees: <1000ms": (r) => r.timings.duration < 1000,
  });
  sleep(2);
}
