const express = require('express');
const { Op } = require('sequelize');
const { WindTurbine, PowerOutput } = require('../database');
const { generatePowerOutput } = require('../services/dataGenerator');
const { validateLimit } = require('../utils/pagination');
const { normalizeQueryParams } = require('../utils/queryNormalizer');

const router = express.Router();

// Store active SSE connections
const sseConnections = new Map();

/**
 * GET /api/1/stream/power-output
 * Server-Sent Events endpoint for real-time power output data
 */
router.get('/power-output', async (req, res) => {
  // Normalize query parameters to handle case-insensitive keys
  const normalizedQuery = normalizeQueryParams(req.query, ['windTurbineIds', 'interval']);
  const { windTurbineIds, interval = 10 } = normalizedQuery;
  
  // Validate required parameters
  if (!windTurbineIds) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'windTurbineIds parameter is required. Provide a comma-separated list of wind turbine IDs.'
    });
  }
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Generate unique connection ID
  const connectionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  // Parse wind turbine IDs filter (now mandatory)
  const turbineFilter = windTurbineIds.split(',').map(id => id.trim()).filter(id => id);
  
  if (turbineFilter.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'Validation Error',
      message: 'At least one valid wind turbine ID must be provided in windTurbineIds parameter.'
    }));
  }

  // Send initial connection message
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ 
    connectionId, 
    message: 'Connected to power output stream',
    interval: parseInt(interval),
    turbineFilter: turbineFilter,
    turbineCount: turbineFilter.length
  })}\n\n`);

  // Log successful connection
  console.log(`SSE client ${connectionId} connected (interval: ${interval}s, turbines: ${turbineFilter.length})`);

  // Function to send power output data
  const sendPowerData = async () => {
    try {
      // Get active turbines (turbineFilter is guaranteed to have values)
      const whereClause = { 
        active: true,
        id: { [Op.in]: turbineFilter }
      };

      const turbines = await WindTurbine.findAll({
        where: whereClause,
        limit: validateLimit(25) // Use standardized limit validation
      });

      const powerOutputs = [];
      const timestamp = new Date();

      // Generate current power output for each turbine
      for (const turbine of turbines) {
        const powerData = generatePowerOutput(turbine.id, turbine.ratedCapacityKW, timestamp);
        
        // Save to database
        await PowerOutput.create(powerData);
        
        powerOutputs.push({
          turbineId: turbine.id,
          turbineName: turbine.name,
          powerKW: powerData.powerKW,
          ratedCapacityKW: turbine.ratedCapacityKW,
          efficiency: Math.round((powerData.powerKW / turbine.ratedCapacityKW) * 100 * 100) / 100,
          timestamp: timestamp.toISOString()
        });
      }

      // Send data as SSE event
      res.write(`event: power-output\n`);
      res.write(`data: ${JSON.stringify({
        timestamp: timestamp.toISOString(),
        turbineCount: powerOutputs.length,
        powerOutputs
      })}\n\n`);

    } catch (error) {
      console.error('Error generating power data:', error);
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: 'Failed to generate power data' })}\n\n`);
    }
  };

  // Send initial data immediately
  sendPowerData();

  // Set up interval to send periodic updates
  const intervalMs = parseInt(interval) * 1000;
  const intervalId = setInterval(sendPowerData, intervalMs);

  // Store connection info
  sseConnections.set(connectionId, {
    response: res,
    intervalId,
    turbineFilter,
    startTime: new Date()
  });

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    const connection = sseConnections.get(connectionId);
    const duration = connection ? Math.round((Date.now() - connection.startTime.getTime()) / 1000) : 0;
    sseConnections.delete(connectionId);
    console.log(`SSE client ${connectionId} disconnected (duration: ${duration}s, turbines: ${turbineFilter.length})`);
  });

  req.on('error', (err) => {
    clearInterval(intervalId);
    const connection = sseConnections.get(connectionId);
    const duration = connection ? Math.round((Date.now() - connection.startTime.getTime()) / 1000) : 0;
    sseConnections.delete(connectionId);
    
    // Handle different types of connection errors more gracefully
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.message === 'aborted') {
      // Normal client disconnection (browser closed, Ctrl+C, etc.)
      console.log(`SSE client ${connectionId} disconnected unexpectedly (duration: ${duration}s, turbines: ${turbineFilter.length})`);
    } else {
      // Actual error that needs attention
      console.error(`SSE connection ${connectionId} error after ${duration}s: ${err.message}`);
    }
  });
});

/**
 * GET /api/1/stream/status
 * Get information about active streaming connections
 */
router.get('/status', (req, res) => {
  const connections = Array.from(sseConnections.entries()).map(([id, conn]) => ({
    connectionId: id,
    startTime: conn.startTime,
    turbineFilter: conn.turbineFilter,
    turbineCount: conn.turbineFilter.length,
    uptime: Math.round((Date.now() - conn.startTime.getTime()) / 1000)
  }));

  res.json({
    activeConnections: connections.length,
    connections
  });
});

/**
 * POST /api/1/stream/power-output/batch
 * Submit batch power output readings (used by external streaming service)
 */
router.post('/power-output/batch', async (req, res) => {
  try {
    const { readings } = req.body;

    if (!readings || !Array.isArray(readings)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'readings array is required'
      });
    }

    // Validate and save readings
    const savedReadings = [];
    for (const reading of readings) {
      if (!reading.windTurbineId || typeof reading.powerKW !== 'number') {
        continue; // Skip invalid readings
      }

      const powerOutput = await PowerOutput.create({
        windTurbineId: reading.windTurbineId,
        powerKW: reading.powerKW,
        timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date()
      });

      savedReadings.push(powerOutput);
    }

    res.status(201).json({
      message: 'Power readings saved successfully',
      savedCount: savedReadings.length,
      totalReceived: readings.length
    });

  } catch (error) {
    console.error('Error saving batch power readings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save power readings'
    });
  }
});

module.exports = router;
