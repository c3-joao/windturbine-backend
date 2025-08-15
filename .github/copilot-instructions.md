# Project overview

This is a **mock backend service** designed to provide realistic wind turbine operational data for frontend development and prototyping. The goal is to create a server that generates and serves data so convincing that it could be mistaken for a real production system.

Key principles:
- **Simplicity First**: Code should be easy to read, understand, and modify
- **Realistic Data**: All generated data should feel authentic and production-ready
- **Frontend-Focused**: Designed specifically to support rich frontend applications
- **Quick Setup**: Minimal configuration required to get running

## Architecture

The solution consists of two simple services:

1. **Main Backend API**: RESTful service serving realistic wind turbine and work order data
2. **Data Streaming Service**: Simulates real-time power output from wind turbines

## Technology preferences (keep it simple)

- **Language**: JavaScript (TypeScript optional - only if it adds clear value)
- **Web Framework**: Express.js (minimal setup, widely understood)
- **Database**: SQLite with a simple ORM (Sequelize recommended for familiarity)
- **API Documentation**: Swagger/OpenAPI
- **Real-time Communication**: Server-Sent Events (SSE) - simpler than WebSocket
- **Data Generation**: Faker.js for realistic mock data
- **File Structure**: Flat and intuitive - avoid over-engineering

### Design Philosophy

- **Readable Code**: Prefer explicit over clever
- **Minimal Dependencies**: Only add what's truly needed
- **Self-Documenting**: Code should explain itself
- **Easy Debugging**: Simple request/response flow
- **Quick Iteration**: Changes should be fast to implement and test

## API

**Base URL**: All endpoints are prefixed with `/api/1`  
**Documentation**: Available at `/docs` (Swagger/OpenAPI)  
**Authentication**: Not required for this implementation  
**Response Format**: JSON with consistent error handling  

## Success criteria

1. ✅ Frontend developers can build rich CRUD flows and dashboards with the provided data
2. ✅ Data looks realistic enough to demo to stakeholders
3. ✅ All API endpoints return consistent, well-structured responses
4. ✅ Real-time power data streams smoothly via SSE
5. ✅ Code is easy to understand and modify
6. ✅ New developers can get it running in under 2 minutes
7. ✅ Data tells interesting stories (performance trends, maintenance patterns)
8. ✅ API documentation at `/docs` makes endpoints self-explanatory

The success metric is: "Can a frontend team build an impressive wind turbine management dashboard that looks like it's connected to a real industrial system?" If yes, this mock backend has achieved its purpose.

## Other notes

* NEVER CREATE SUMMARY FILES with the summary of your actions on my project. Just print your summary but DO NOT
CREAT ANY FILES. It's really bad practice to polute the repository with unnecessary files.
