---

# Run Project: AetherConnect - Advanced Microservices-Based Chat Application

## Project Overview
AetherConnect is an enterprise-grade real-time chat application built with a microservices architecture to demonstrate advanced system design. Features include user authentication (JWT/OAuth2), real-time messaging (group/1:1), file sharing, AI-powered moderation, and robust observability. Designed for scalability, fault tolerance, and security, it runs locally via Docker/Kubernetes (Minikube) or on free-tier platforms (Vercel, Render, MongoDB Atlas, Redis Labs). Ideal for portfolios targeting senior backend/system architect roles at top-tier tech companies.

## Project Structure
aetherconnect/
├─ .editorconfig
├─ .gitattributes
├─ .gitignore
├─ .nvmrc
├─ .prettierrc
├─ commitlint.config.cjs
├─ package.json
├─ pnpm-workspace.yaml
├─ README.md
├─ docker-compose.yml
├─ .env.example
├─ tsconfig.base.json
├─ .husky/
│  ├─ pre-commit
│  └─ pre-push
├─ .github/
│  ├─ ISSUE_TEMPLATE.md
│  ├─ PULL_REQUEST_TEMPLATE.md
│  └─ workflows/
│     └─ ci.yml
├─ infrastructure/
│  ├─ helm/
│  │  ├─ Chart.yaml
│  │  ├─ values.dev.yaml
│  │  └─ templates/
│  │     ├─ deployment.yaml
│  │     ├─ service.yaml
│  │     └─ ingress.yaml
│  └─ k8s/
│     ├─ api-gateway.yaml
│     ├─ auth-service.yaml
│     ├─ message-service.yaml
│     └─ notification-service.yaml
├─ packages/
│  └─ shared/
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ src/
│     │  ├─ index.ts
│     │  ├─ env.ts
│     │  ├─ logger.ts
│     │  ├─ errors.ts
│     │  ├─ grpc/
│     │  │  ├─ client.ts
│     │  │  └─ protos/
│     │  │     ├─ auth.proto
│     │  │     ├─ user.proto
│     │  │     └─ message.proto
│     │  └─ validation/
│     │     ├─ dto.ts
│     │     └─ zod.ts
├─ services/
│  ├─ api-gateway/
│  │  ├─ Dockerfile
│  │  ├─ nest-cli.json
│  │  ├─ package.json
│  │  ├─ tsconfig.build.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ main.ts
│  │     ├─ app.module.ts
│  │     ├─ grpc/grpc.module.ts
│  │     ├─ auth/jwt.guard.ts
│  │     └─ common/filters/http-exception.filter.ts
│  ├─ auth-service/
│  │  ├─ Dockerfile
│  │  ├─ nest-cli.json
│  │  ├─ package.json
│  │  ├─ tsconfig.build.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ main.ts
│  │     ├─ app.module.ts
│  │     ├─ prisma/ (or typeorm/)
│  │     │  └─ schema.prisma (or entities/*)
│  │     ├─ users/
│  │     │  ├─ users.module.ts
│  │     │  ├─ users.service.ts
│  │     │  └─ users.controller.ts
│  │     ├─ auth/
│  │     │  ├─ auth.module.ts
│  │     │  ├─ auth.service.ts
│  │     │  └─ auth.controller.ts
│  │     └─ grpc/auth.grpc.ts
│  ├─ message-service/
│  │  ├─ Dockerfile
│  │  ├─ nest-cli.json
│  │  ├─ package.json
│  │  ├─ tsconfig.build.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ main.ts
│  │     ├─ app.module.ts
│  │     ├─ websocket/socket.gateway.ts
│  │     ├─ messages/
│  │     │  ├─ messages.module.ts
│  │     │  ├─ messages.service.ts
│  │     │  └─ message.model.ts
│  │     └─ grpc/auth.client.ts
│  └─ notification-service/
│     ├─ Dockerfile
│     ├─ nest-cli.json
│     ├─ package.json
│     ├─ tsconfig.build.json
│     ├─ tsconfig.json
│     └─ src/
│        ├─ main.ts
│        ├─ app.module.ts
│        └─ kafka/kafka.consumer.ts
└─ apps/
   └─ frontend/
      ├─ Dockerfile
      ├─ next.config.mjs
      ├─ package.json
      ├─ postcss.config.cjs
      ├─ tailwind.config.cjs
      ├─ tsconfig.json
      └─ src/
         ├─ pages/
         │  ├─ _app.tsx
         │  ├─ index.tsx
         │  ├─ login.tsx
         │  └─ register.tsx
         ├─ components/ChatRoom.tsx
         └─ lib/api.ts


### Goals
- Showcase mastery of system design: scalability, decoupling, resilience, observability.
- Deliver a production-ready chat app with real-time features, AI integration, and security.
- Implement DevOps practices: CI/CD, container orchestration, monitoring, automated testing.
- Create a job-ready artifact with UML diagrams, benchmarks, and best practices for LinkedIn/GitHub.

## System Design Concepts
- **Modularity & Decoupling**: Independent services (auth, messaging, notifications) via gRPC (sync) and Kafka (async). Enables isolated scaling/updates; e.g., auth-service redeploys without downtime.
- **Scalability**: Horizontal (Kubernetes autoscaling), vertical (resource tuning). Sharding in MongoDB/PostgreSQL, Redis for distributed cache/sessions.
- **Fault Tolerance & Resilience**: Circuit breakers (Resilience4j), gRPC retries/timeouts, Kafka idempotency. Kubernetes health/readiness probes; chaos testing (pod failure sim).
- **High Availability**: Multi-region replication (local sim), Kafka leader-election, Redis Sentinel failover.
- **Inter-Service Communication**: gRPC (protobuf for efficiency), Kafka (event-driven), Socket.io (real-time client-server).
- **Data Management**: PostgreSQL (ACID, users), MongoDB (messages/logs), Redis (sessions/queues). CQRS for read/write separation.
- **Security**: JWT/OAuth2 (Keycloak), RBAC, TLS, Vault encryption, rate-limiting (Express-rate-limit), OWASP mitigations (Helmet, Joi/Zod validation).
- **Performance**: Redis caching (LRU), Nginx load balancing, Brotli/gzip compression, DB indexing, BullMQ async queues.
- **Observability**: Jaeger/OpenTelemetry (tracing), Prometheus/Grafana (metrics), ELK stack (logging: Elasticsearch, Logstash, Kibana).
- **AI Integration**: Hugging Face Transformers (local) for message moderation (e.g., toxicity detection).
- **DevOps**: Blue-green/canary deployments, GitHub Actions CI/CD, ArgoCD GitOps, Helm charts.
- **Testing**: Jest (unit/integration), Cypress (e2e), Artillery (load), Snyk (security, free tier).
- **Architecture Diagram** (Text UML):
  ```
  Client (Next.js) <-> Ingress (Nginx) <-> WebSocket/Gateway (Socket.io)
                                           |
                                           v
  Auth Service (NestJS/gRPC) <-> User DB (PostgreSQL)
                                           |
                                           v (Kafka Events)
  Message Service (NestJS) <-> Message DB (MongoDB) <-> Cache (Redis)
                                           |
                                           v
  Notification Service (NestJS) <-> Queue (Kafka)
                                           |
                                           +--> AI Moderator (Transformers)
                                           +--> Monitoring (Prometheus/Grafana/Jaeger)
                                           +--> Logging (ELK)
  ```

## Project Structure
- **auth-service**: JWT/OAuth2, RBAC, user management.
  - Files: src/main.ts, src/auth.controller.ts, src/user.entity.ts, src/keycloak.module.ts
- **message-service**: Real-time messaging, file uploads (MinIO local S3), sharding.
  - Files: src/main.ts, src/message.gateway.ts (Socket.io), src/message.consumer.ts (Kafka), src/ai-moderator.service.ts
- **notification-service**: Push notifications, event-driven.
  - Files: src/main.ts, src/notification.producer.ts (Kafka), src/push.gateway.ts (WebSocket)
- **api-gateway**: Aggregates services, rate-limiting, CORS.
  - Files: src/main.ts, src/proxy.middleware.ts
- **frontend**: Next.js SSR, real-time UI.
  - Files: pages/index.tsx, components/ChatRoom.tsx, lib/api-client.ts, styles/tailwind.css
- **infrastructure**: Helm charts, Kubernetes manifests, Prometheus configs.
- **shared**: Protobuf schemas (gRPC), DTOs (Zod).
- **docker-compose.yml**: Local dev orchestration.
- **k8s/**: Minikube manifests.
- **.github/workflows/**: CI/CD pipelines.
- **.env**: Secrets (Vault in prod sim).
- **Root**: tsconfig.json, package.json, README.md

## Technologies
- **Backend**: NestJS (TypeScript) for scalable microservices.
- **Real-Time**: Socket.io (Redis adapter for clustering).
- **Databases**: PostgreSQL (TypeORM), MongoDB (Mongoose), Redis (ioredis).
- **Auth**: Passport.js, Keycloak (OIDC/OAuth2), JWT (jsonwebtoken).
- **Communication**: gRPC (protobuf/grpc-js), Kafka (kafkajs), Socket.io.
- **API Gateway**: NestJS, Nginx proxy.
- **Frontend**: Next.js (React/TypeScript), Tailwind CSS, Socket.io-client.
- **AI/ML**: Hugging Face Transformers (local), optional TensorFlow.js.
- **Containerization**: Docker, Docker Compose, Kubernetes (Minikube), Helm.
- **CI/CD**: GitHub Actions, ArgoCD (GitOps).
- **Observability**: Prometheus, Grafana, Jaeger/OpenTelemetry, ELK (Elasticsearch/Logstash/Kibana).
- **Security**: Helmet, cors, rate-limit, bcrypt, crypto-js, Vault.
- **Testing**: Jest, Supertest, Cypress, Artillery, SonarQube (free), Snyk (free).
- **Tools**: BullMQ (queues), MinIO (local S3), Nodemailer (email), Winston (logging), pm2 (local process).
- **Language**: TypeScript (strict, full-stack).
- **Dev Tools**: ESLint/Prettier, Husky, Vite (frontend), Postman/Newman, wscat.

## Setup
1. Install: Docker, Minikube, Helm, kubectl, Node.js 20+.
2. Clone: `git clone <url> && cd AetherConnect`.
3. Env: Create `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/aetherconnect
   POSTGRES_URI=postgres://user:pass@localhost:5432/aetherconnect
   REDIS_HOST=localhost:6379
   KAFKA_BROKER=localhost:9092
   KEYCLOAK_REALM=aetherconnect
   JWT_SECRET=secret
   PORT_GATEWAY=8080
   PORT_AUTH=3001
   PORT_MESSAGE=3002
   PORT_NOTIFICATION=3003
   ```
4. Local Services:
   - MongoDB: `docker run -d -p 27017:27017 --name mongodb mongo:latest`
   - PostgreSQL: `docker run -d -p 5432:5432 --name postgres postgres`
   - Redis: `docker run -d -p 6379:6379 --name redis redis`
   - Kafka: `docker run -d -p 9092:9092 --name kafka confluentinc/cp-kafka`
   - MinIO: `docker run -d -p 9000:9000 --name minio minio/minio`
   - ELK: `docker run -d -p 9200:9200 -p 5601:5601 sebp/elk`
5. Dev Run: `docker-compose up --build` or `npm run start:dev` per service.
6. Kubernetes: `minikube start && helm install aetherconnect ./infrastructure/helm-chart`.
7. Access: Frontend `http://localhost:3000`, Gateway `http://localhost:8080`, Grafana `http://localhost:3001`, Kibana `http://localhost:5601`.
8. CI/CD: Push to GitHub triggers build/test/deploy.

### Sample Dockerfile (message-service)
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "start:prod"]
```

### Sample Helm Values (infrastructure/helm-chart/values.yaml)
```
replicas: 3
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilization: 80
prometheus: true
```

## Development
- Backend: `nest g module <service>`; implement gRPC, Kafka consumers/producers.
- Frontend: `npm run dev` (Next.js); integrate Socket.io, Axios/SWR.
- AI: Add Transformers for toxicity detection in message-service.
- Testing: `npm test` (>80% coverage), `cypress run`, `artillery run load.yml`.
- Observability: Add OpenTelemetry spans, Prometheus metrics, ELK logs.
- Security: Run `snyk test`, implement RBAC guards.

## Troubleshooting
- Pods: `kubectl logs <pod> -n aetherconnect`.
- Kafka: Check topics (`kafka-topics.sh --list`).
- Redis: Verify Sentinel (`redis-cli -p 26379`).
- Tracing: Ensure Jaeger spans in NestJS.

## Employment Tips
- Portfolio: Include system design doc (draw.io UML), blog on trade-offs (gRPC vs REST, Kafka vs RabbitMQ).
- Benchmarks: Document load tests (e.g., 10k users via Artillery).
- Interview Prep: Covers system design questions (e.g., design WhatsApp).
- Extensions: Add WebRTC (video), GraphQL federation, serverless (local Lambda sim).

---
