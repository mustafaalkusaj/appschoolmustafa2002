# implementation-options

## name

Implementation Options

## description

Proposes multiple approaches for implementing a feature or solving a problem, with clear tradeoffs for each. This skill helps make informed architectural decisions.

**When to use this skill:**
- When multiple approaches exist
- Before choosing a technical solution
- When debating between libraries/frameworks
- During architectural decision making
- When team has different opinions on approach
- When you want to present options to stakeholders

## instructions

1. **Understand the Problem**
   - What needs to be solved?
   - What are the constraints?
   - What's the context?

2. **Identify Possible Approaches**
   - Research existing patterns in the codebase
   - Consider industry best practices
   - Think about alternative technologies
   - Consider build vs. buy options
   - Consider gradual migration paths

3. **Research Each Option**
   - How does each approach work?
   - What does the implementation look like?
   - What are the dependencies?
   - What's the learning curve?

4. **Evaluate Against Criteria**
   For each option, assess:
   - **Time to implement**
   - **Complexity**
   - **Maintainability**
   - **Performance**
   - **Scalability**
   - **Security**
   - **Team familiarity**
   - **Future flexibility**

5. **Document Options Clearly**
   For each option provide:
   - Name and brief description
   - How it works (with code example if helpful)
   - Pros
   - Cons
   - Resource requirements
   - Estimated effort

6. **Present Tradeoffs Transparently**
   - Don't bias toward one option
   - Let stakeholders make informed decision
   - Recommend preferred option with reasoning

## expected input

- A feature or problem description
- Optional: constraints or requirements
- Optional: preferred technologies
- Optional: deadline considerations

## expected output

An options analysis document containing:
- Summary of the problem
- 2-4 implementation options
- For each option:
  - Description and approach
  - Code example (if applicable)
  - Pros and cons
  - Effort estimate
  - Comparison matrix
- Recommendation with rationale
- Decision checklist

## example usage

```
User: We need to implement real-time notifications for our web app. How should we approach this?

[Using implementation-options]

Output:
# Implementation Options: Real-Time Notifications

## Problem Summary
Implement real-time notifications for web app users to receive instant updates without page refresh.

## Options Considered

### Option 1: WebSocket (Native)

**Description**: Use native WebSocket connections for bidirectional communication.

**Implementation**:
```javascript
// Server (Node.js with ws library)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Handle incoming messages
  });
  
  // Send notification
  ws.send(JSON.stringify({ type: 'notification', data: 'New message!' }));
});

// Client
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => {
  showNotification(JSON.parse(event.data));
};
```

**Pros**:
- Full control over connection
- Low latency
- No server costs beyond infrastructure
- Efficient for high-frequency updates

**Cons**:
- Need to handle reconnection manually
- Load balancing WebSocket connections is complex
- No built-in fallbacks
- Stateful servers required

**Effort**: 3-4 days
**Team Familiarity**: Medium

---

### Option 2: Server-Sent Events (SSE)

**Description**: One-way server-to-client streaming over HTTP.

**Implementation**:
```javascript
// Server (Express)
app.get('/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Send notification
  res.write(`data: ${JSON.stringify({ message: 'New update!' })}\n\n`);
});

// Client
const eventSource = new EventSource('/notifications/stream');
eventSource.onmessage = (event) => {
  showNotification(JSON.parse(event.data));
};
```

**Pros**:
- Simple to implement
- Works over standard HTTP/2
- Automatic reconnection
- Easy load balancing

**Cons**:
- One-way only (can't send data back)
- Less efficient than WebSocket for bidirectional
- Not supported in IE/Edge (legacy)

**Effort**: 2-3 days
**Team Familiarity**: High

---

### Option 3: Firebase Cloud Messaging (FCM)

**Description**: Use Firebase as managed push notification service.

**Implementation**:
```javascript
// Server (Node.js)
const admin = require('firebase-admin');
admin.messaging().send({
  token: userDeviceToken,
  notification: {
    title: 'New Notification',
    body: 'You have a new message'
  }
});

// Client (Service Worker)
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
firebase.messaging().onMessage((payload) => {
  showNotification(payload.notification);
});
```

**Pros**:
- Handles all complexity
- Includes push notifications (mobile)
- Built-in targeting and analytics
- Scales automatically

**Cons**:
- Third-party dependency
- Cost at scale ($0.05 per notification after free tier)
- Less control over infrastructure
- Vendor lock-in

**Effort**: 1-2 days
**Team Familiarity**: Medium

---

### Option 4: Polling (Long Polling)

**Description**: Client repeatedly polls server for new notifications.

**Implementation**:
```javascript
// Server (Express)
app.get('/notifications/poll', async (req, res) => {
  const timeout = 30 * 1000;
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const notification = await checkForNotification(req.user.id);
    if (notification) {
      return res.json(notification);
    }
    await sleep(1000); // Poll every second
  }
  res.json(null); // No notification
});
```

**Pros**:
- Works everywhere
- Simple to understand
- Stateless server
- Easy to implement

**Cons**:
- High server load
- Latency up to 1 second
- Wastes resources
- Not truly real-time

**Effort**: 1 day
**Team Familiarity**: High

---

## Comparison Matrix

| Criteria | WebSocket | SSE | FCM | Polling |
|----------|-----------|-----|-----|---------|
| Latency | Low | Low | Medium | Medium |
| Implementation Effort | High | Low | Low | Very Low |
| Server Resources | Medium | Low | Low | High |
| Scalability | Complex | Easy | Easy | Difficult |
| Mobile Support | Manual | Manual | Built-in | Manual |
| Reliability | Custom | Built-in | Built-in | Built-in |
| Cost | Infrastructure | Infrastructure | Usage-based | Infrastructure |
| Learning Curve | Medium | Low | Low | Low |

## Recommendation

**Recommended: Option 2 (Server-Sent Events) for MVP**

**Rationale**:
1. Simplest implementation with good performance
2. Works well with existing Express infrastructure
3. Easy to add WebSocket later if bidirectional needed
4. Fallback to polling is simple if needed

**Consider Option 3 (FCM) if**:
- Need mobile push notifications
- Don't want to manage notification infrastructure
- Budget allows for usage costs

**Consider Option 1 (WebSocket) if**:
- Need bidirectional communication (chat, collab)
- High-frequency updates (stock ticker, gaming)
- Already have WebSocket infrastructure

## Decision Checklist

- [ ] Real-time or near-real-time? (SSE/WS vs Polling)
- [ ] Mobile support needed? (Consider FCM)
- [ ] Team has WebSocket experience?
- [ ] Budget for third-party service?
- [ ] Need horizontal scaling?
```
