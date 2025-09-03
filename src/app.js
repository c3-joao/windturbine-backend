const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');
const { initializeDatabase } = require('./database');
const { generatePowerOutput } = require('./services/dataGenerator');
const { WindTurbine, PowerOutput } = require('./database');
const { specs, swaggerUi } = require('./docs/swagger');

// Import routes
const windTurbinesRouter = require('./routes/windturbines');
const workOrdersRouter = require('./routes/workorders');
const summaryRouter = require('./routes/summary');
const streamingRouter = require('./routes/streaming');
const powerOutputRouter = require('./routes/poweroutput');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom JSON formatting middleware for better terminal output
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(obj) {
    // Set content type and format JSON with trailing newline
    res.set('Content-Type', 'application/json');
    const jsonString = JSON.stringify(obj, null, 2) + '\n';
    return res.send(jsonString);
  };
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Wind Turbine Management System API is running'
  });
});

// API base route
app.get('/api/1', (req, res) => {
  res.json({
    message: 'Wind Turbine Management System API v1',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      docs: '/docs',
      docsJson: '/docs.json',
      windTurbines: '/api/1/windturbines',
      workOrders: '/api/1/workorders',
      summary: '/api/1/summary',
      streaming: '/api/1/stream/power-output'
    }
  });
});

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Wind Turbine Management API Documentation'
}));

// OpenAPI Spec endpoints

app.get('/docs.json', (req, res) => {
  res.json(specs);
});

// API Routes - Power output routes must come before general turbine routes
app.use('/api/1/windturbines/:id/power-output', powerOutputRouter);
app.use('/api/1/windturbines', windTurbinesRouter);
app.use('/api/1/workorders', workOrdersRouter);
app.use('/api/1/summary', summaryRouter);
app.use('/api/1/stream', streamingRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
async function startServer() {
  // Initialize database first
  const dbConnected = await initializeDatabase();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Create HTTP server
  const server = http.createServer(app);

  // Create WebSocket server
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/1/ws/power-output'
  });

  // WebSocket connection handler
  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection established');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to power output WebSocket stream',
      timestamp: new Date().toISOString()
    }));

    // Function to send power output data via WebSocket
    const sendPowerData = async () => {
      try {
        if (ws.readyState !== WebSocket.OPEN) return;

        // Get some active turbines for demo
        const turbines = await WindTurbine.findAll({
          where: { active: true },
          limit: 25
        });

        const powerOutputs = [];
        const timestamp = new Date();

        for (const turbine of turbines) {
          const powerData = generatePowerOutput(turbine.id, turbine.ratedCapacityKW, timestamp);
          
          powerOutputs.push({
            turbineId: turbine.id,
            turbineName: turbine.name,
            powerKW: powerData.powerKW,
            ratedCapacityKW: turbine.ratedCapacityKW,
            efficiency: Math.round((powerData.powerKW / turbine.ratedCapacityKW) * 100 * 100) / 100,
            timestamp: timestamp.toISOString()
          });
        }

        ws.send(JSON.stringify({
          type: 'power-output',
          timestamp: timestamp.toISOString(),
          turbineCount: powerOutputs.length,
          powerOutputs
        }));

      } catch (error) {
        console.error('Error sending WebSocket power data:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to generate power data',
            timestamp: new Date().toISOString()
          }));
        }
      }
    };

    // Send initial data
    sendPowerData();

    // Send data every 10 seconds
    const interval = setInterval(sendPowerData, 10000);

    // Handle WebSocket messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('WebSocket message received:', data);

        // Handle different message types
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      clearInterval(interval);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(interval);
    });
  });

  server.listen(PORT, () => {
    console.log(`Wind Turbine Management API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API info: http://localhost:${PORT}/api/1`);
    console.log(`SSE Stream: http://localhost:${PORT}/api/1/stream/power-output`);
    console.log(`WebSocket: ws://localhost:${PORT}/api/1/ws/power-output`);
  });
}

startServer();

module.exports = app;
