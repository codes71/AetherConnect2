# 🚀 AetherConnect - Enterprise Microservices Chat Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

> **Enterprise-grade real-time chat application showcasing advanced microservices architecture, system design patterns, and production-ready DevOps practices.**

## 🎯 **Project Overview**

AetherConnect demonstrates **senior-level backend engineering** through a scalable, fault-tolerant chat platform built with modern microservices architecture. Designed for **portfolio showcasing** and **technical interviews** at top-tier tech companies.

### **🏗️ Architecture Highlights**
- **Microservices**: Independent, containerized services with clear boundaries
- **Real-time Communication**: WebSocket + gRPC for optimal performance
- **Event-Driven**: Asynchronous messaging with proper error handling
- **Production-Ready**: Comprehensive logging, monitoring, and security

## 🛠️ **Tech Stack**

### **Backend Services**
- **Framework**: NestJS (TypeScript) - Enterprise-grade Node.js framework
- **Communication**: gRPC (inter-service) + WebSocket (real-time)
- **Authentication**: JWT + bcrypt with refresh token rotation
- **Validation**: Zod schemas with comprehensive error handling

### **Databases & Storage**
- **PostgreSQL**: User data, authentication (ACID compliance)
- **MongoDB**: Messages, chat history (document flexibility)
- **Redis**: Sessions, caching, real-time data

### **DevOps & Infrastructure**
- **Containerization**: Docker + multi-stage builds
- **Orchestration**: Kubernetes-ready with health checks
- **Monitoring**: Structured logging with Winston
- **Security**: Environment-based configuration, input sanitization

## 🏛️ **System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │  Auth Service   │    │ Message Service │
│   (Port 3000)   │◄──►│  (Port 3001)    │◄──►│  (Port 3002)    │
│                 │    │                 │    │                 │
│ • Rate Limiting │    │ • JWT Auth      │    │ • WebSocket     │
│ • CORS          │    │ • User CRUD     │    │ • Real-time     │
│ • Routing       │    │ • Password Hash │    │ • Message Store │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Databases     │
                    │                 │
                    │ • PostgreSQL    │
                    │ • MongoDB       │
                    │ • Redis         │
                    └─────────────────┘
```

## 📁 **Project Structure**

```
aetherconnect/
├── services/
│   ├── api-gateway/          # HTTP API Gateway (NestJS)
│   ├── auth-service-nestjs/  # Authentication Service
│   └── message-service/      # Real-time Messaging Service
├── packages/
│   └── shared/              # Shared utilities, types, gRPC clients
├── infrastructure/          # Kubernetes manifests, Helm charts
└── scripts/                # Development and deployment scripts
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 20+
- Docker & Docker Compose
- pnpm (recommended) or npm

### **1. Clone & Install**
```bash
git clone https://github.com/yourusername/aetherconnect.git
cd aetherconnect
pnpm install
```

### **2. Environment Setup**
Each service has its own `.env` file with production-ready defaults:
- `services/auth-service-nestjs/.env`
- `services/message-service/.env`
- `services/api-gateway/.env`

### **3. Build & Deploy**
```bash
# Build all Docker images
pnpm run docker:build:all

# Run individual services
docker run -d -p 3001:3001 --name auth aether-auth
docker run -d -p 3002:3002 --name message aether-message
docker run -d -p 3000:3000 --name gateway aether-gateway
```

### **4. Verify Services**
- **API Gateway**: http://localhost:3000/health
- **Auth Service**: http://localhost:3001/health
- **Message Service**: http://localhost:3002/health

## 🔧 **Development Commands**

```bash
# Development mode (all services)
pnpm run dev

# Individual service development
pnpm run dev:auth
pnpm run dev:gateway
pnpm run dev:message

# Build all services
pnpm run build

# Docker operations
pnpm run docker:build:all
pnpm run docker:build:auth
pnpm run docker:build:message
pnpm run docker:build:gateway
```

## 🏗️ **Service Details**

### **🔐 Auth Service** (`auth-service-nestjs`)
- **Purpose**: User authentication, JWT management
- **Database**: PostgreSQL with TypeORM
- **Features**: Registration, login, token refresh, user profiles
- **Security**: bcrypt hashing, JWT with refresh tokens

### **💬 Message Service** (`message-service`)
- **Purpose**: Real-time messaging, chat rooms
- **Database**: MongoDB for message storage, Redis for sessions
- **Features**: WebSocket connections, message history, typing indicators
- **Performance**: Connection pooling, message queuing

### **🌐 API Gateway** (`api-gateway`)
- **Purpose**: Request routing, rate limiting, CORS
- **Features**: Service discovery, load balancing, authentication middleware
- **Security**: Request validation, rate limiting, CORS policies

## 🔒 **Security Features**

- **Authentication**: JWT with secure refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive Zod schema validation
- **Rate Limiting**: Per-endpoint and per-user limits
- **CORS**: Configurable cross-origin policies
- **Environment Security**: Secrets management via environment variables

## 📊 **Production Considerations**

### **Scalability**
- Horizontal scaling via Docker containers
- Database connection pooling
- Redis for distributed sessions
- Stateless service design

### **Monitoring & Observability**
- Structured logging with Winston
- Health check endpoints
- Error tracking and alerting
- Performance metrics collection

### **Deployment**
- **Cloud Platforms**: Render, Railway, Heroku, AWS
- **Container Orchestration**: Kubernetes, Docker Swarm
- **CI/CD**: GitHub Actions ready
- **Database**: Supabase (PostgreSQL), MongoDB Atlas, Upstash (Redis)

## 🎯 **System Design Showcase**

This project demonstrates key system design concepts:

- **Microservices Architecture**: Service decomposition and boundaries
- **Data Consistency**: ACID vs BASE, eventual consistency patterns
- **Communication Patterns**: Synchronous (gRPC) vs Asynchronous (events)
- **Caching Strategies**: Redis for session management and performance
- **Security**: Authentication, authorization, and data protection
- **Scalability**: Horizontal scaling and load distribution
- **Fault Tolerance**: Error handling, retries, and graceful degradation

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎓 **Learning Resources**

- **System Design**: [High Scalability](http://highscalability.com/)
- **Microservices**: [Microservices.io](https://microservices.io/)
- **NestJS**: [Official Documentation](https://docs.nestjs.com/)
- **Docker**: [Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Built with ❤️ for learning and showcasing modern backend engineering practices.**
