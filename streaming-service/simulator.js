#!/usr/bin/env node

/**
 * Wind Turbine Power Data Simulator
 * 
 * This is a standalone service that generates realistic power output data
 * and sends it to the main API via HTTP POST requests.
 */

const http = require('http');
require('dotenv').config();

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    outlierChance: 5, // Default 5% chance for outliers
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg === '--outlier-chance' || arg === '-o') {
      const value = parseInt(args[i + 1]);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        config.outlierChance = value;
        i++; // Skip next argument as it's the value
      } else {
        console.error('Error: --outlier-chance must be a number between 0 and 100');
        process.exit(1);
      }
    } else {
      console.error(`Error: Unknown argument '${arg}'`);
      console.error('Use --help for available options');
      process.exit(1);
    }
  }

  return config;
}

// Display help information
function showHelp() {
  console.log('Wind Turbine Power Data Simulator');
  console.log('================================');
  console.log();
  console.log('USAGE:');
  console.log('  node simulator.js [OPTIONS]');
  console.log();
  console.log('OPTIONS:');
  console.log('  -o, --outlier-chance <percent>  Percentage chance for outlier readings (0-100)');
  console.log('                                  Default: 5');
  console.log('  -h, --help                      Show this help message');
  console.log();
  console.log('ENVIRONMENT VARIABLES:');
  console.log('  API_BASE_URL                    Base URL for the API (default: http://localhost:3000)');
  console.log('  STREAMING_INTERVAL              Update interval in seconds (default: 10)');
  console.log();
  console.log('EXAMPLES:');
  console.log('  node simulator.js                           # Run with default settings');
  console.log('  node simulator.js --outlier-chance 10       # 10% chance for outliers');
  console.log('  node simulator.js -o 0                      # Disable outliers');
  console.log('  STREAMING_INTERVAL=5 node simulator.js      # Update every 5 seconds');
  console.log();
}

const config = parseArgs();

if (config.help) {
  showHelp();
  process.exit(0);
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const STREAMING_INTERVAL = parseInt(process.env.STREAMING_INTERVAL) || 10; // seconds
const BATCH_SIZE = 20; // Number of turbines to update per batch
const OUTLIER_CHANCE = config.outlierChance; // Percentage chance for outlier readings

// Simulate different wind conditions
const WIND_CONDITIONS = {
  CALM: { min: 0.1, max: 0.3, probability: 0.1 },
  LIGHT: { min: 0.3, max: 0.6, probability: 0.3 },
  MODERATE: { min: 0.6, max: 0.9, probability: 0.4 },
  STRONG: { min: 0.8, max: 1.2, probability: 0.2 }
};

// Time-based wind patterns (stronger at night)
function getTimeBasedWindFactor() {
  const hour = new Date().getHours();
  
  if (hour >= 22 || hour <= 6) {
    return 1.2; // Stronger at night
  } else if (hour >= 10 && hour <= 16) {
    return 0.6; // Weaker during midday
  } else {
    return 0.9; // Moderate during transition hours
  }
}

// Weather event simulation
let weatherEvent = null;
let weatherEventDuration = 0;

function simulateWeatherEvents() {
  // Random chance for weather events
  if (!weatherEvent && Math.random() < 0.05) { // 5% chance per cycle
    const events = [
      { type: 'storm', factor: 0.2, duration: 5 }, // Low output during storms
      { type: 'high_pressure', factor: 1.5, duration: 10 }, // High output
      { type: 'maintenance_window', factor: 0, duration: 3 } // No output
    ];
    
    weatherEvent = events[Math.floor(Math.random() * events.length)];
    weatherEventDuration = weatherEvent.duration;
    console.log(`Weather event started: ${weatherEvent.type} for ${weatherEventDuration} cycles`);
  }
  
  if (weatherEvent) {
    const currentFactor = weatherEvent.factor;
    weatherEventDuration--;
    if (weatherEventDuration <= 0) {
      console.log(`Weather event ended: ${weatherEvent.type}`);
      weatherEvent = null;
    }
    return currentFactor;
  }
  
  return 1.0;
}

// Generate outlier readings to simulate sensor malfunctions
function generateOutlierReading(turbine, timestamp) {
  const outlierTypes = [
    {
      name: 'negative_reading',
      description: 'Negative power (sensor malfunction)',
      generator: () => -(Math.random() * turbine.ratedCapacityKW * 0.5)
    },
    {
      name: 'zero_reading',
      description: 'Zero power (sensor disconnected)',
      generator: () => 0
    },
    {
      name: 'extremely_high',
      description: 'Extremely high reading (sensor spike)',
      generator: () => turbine.ratedCapacityKW * (2 + Math.random() * 3) // 2x to 5x rated capacity
    },
    {
      name: 'minor_negative',
      description: 'Minor negative reading (calibration issue)',
      generator: () => -(Math.random() * 50)
    },
    {
      name: 'unrealistic_spike',
      description: 'Unrealistic power spike',
      generator: () => turbine.ratedCapacityKW * (1.5 + Math.random() * 2) // 1.5x to 3.5x rated capacity
    }
  ];

  const selectedOutlier = outlierTypes[Math.floor(Math.random() * outlierTypes.length)];
  const powerKW = Math.round(selectedOutlier.generator() * 100) / 100;

  console.log(`🚨 OUTLIER: Turbine ${turbine.id.substr(0, 8)}... - ${selectedOutlier.description}: ${powerKW}kW`);

  return {
    windTurbineId: turbine.id,
    powerKW: powerKW,
    timestamp: timestamp.toISOString(),
    outlier: true,
    outlierType: selectedOutlier.name
  };
}

// Generate realistic power output
function generatePowerOutput(turbine, timestamp) {
  // Check if this reading should be an outlier
  if (OUTLIER_CHANCE > 0 && Math.random() * 100 < OUTLIER_CHANCE) {
    return generateOutlierReading(turbine, timestamp);
  }

  const hour = timestamp.getHours();
  
  // Base wind strength based on time
  let windStrength = getTimeBasedWindFactor();
  
  // Apply weather events
  windStrength *= simulateWeatherEvents();
  
  // Add random wind variation
  const windVariation = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
  windStrength *= windVariation;
  
  // Turbine-specific efficiency (some turbines perform better)
  const turbineEfficiency = 0.85 + (Math.random() * 0.3); // 0.85 to 1.15
  
  // Calculate power output
  let powerKW = turbine.ratedCapacityKW * windStrength * turbineEfficiency;
  
  // Ensure realistic bounds
  powerKW = Math.max(0, Math.min(powerKW, turbine.ratedCapacityKW * 1.2));
  
  return {
    windTurbineId: turbine.id,
    powerKW: Math.round(powerKW * 100) / 100,
    timestamp: timestamp.toISOString()
  };
}

// Fetch active turbines from API
async function fetchActiveTurbines() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/1/windturbines?active=true&limit=100',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.data || []);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Send power readings to API
async function sendPowerReadings(readings) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ readings });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/1/stream/power-output/batch',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Main simulation loop
async function runSimulation() {
  try {
    console.log('Fetching active turbines...');
    const turbines = await fetchActiveTurbines();
    
    if (turbines.length === 0) {
      console.log('No active turbines found. Retrying in 30 seconds...');
      setTimeout(runSimulation, 30000);
      return;
    }

    console.log(`Found ${turbines.length} active turbines`);

    // Process turbines in batches
    const batches = [];
    for (let i = 0; i < turbines.length; i += BATCH_SIZE) {
      batches.push(turbines.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const timestamp = new Date();
      const readings = batch.map(turbine => generatePowerOutput(turbine, timestamp));
      
      // Count outliers in this batch
      const outlierCount = readings.filter(reading => reading.outlier).length;
      
      try {
        const result = await sendPowerReadings(readings);
        const outlierSuffix = outlierCount > 0 ? ` (${outlierCount} outliers)` : '';
        console.log(`Sent ${result.savedCount}/${result.totalReceived} power readings for batch${outlierSuffix}`);
      } catch (error) {
        console.error('Error sending batch:', error.message);
      }
      
      // Small delay between batches to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Simulation cycle completed. Next cycle in ${STREAMING_INTERVAL} seconds.`);
    
  } catch (error) {
    console.error('Simulation error:', error.message);
    console.log('Retrying in 30 seconds...');
  }
  
  // Schedule next simulation cycle
  setTimeout(runSimulation, STREAMING_INTERVAL * 1000);
}

// Start the simulator
console.log('Wind Turbine Power Data Simulator');
console.log('================================');
console.log(`API Base URL: ${API_BASE_URL}`);
console.log(`Update Interval: ${STREAMING_INTERVAL} seconds`);
console.log(`Batch Size: ${BATCH_SIZE} turbines`);
console.log(`Outlier Chance: ${OUTLIER_CHANCE}% ${OUTLIER_CHANCE === 0 ? '(disabled)' : '(enabled)'}`);
console.log();
if (OUTLIER_CHANCE > 0) {
  console.log('Outlier simulation enabled! Watch for 🚨 markers in the output.');
  console.log('Outlier types: negative readings, zero readings, extremely high readings, sensor spikes');
  console.log();
}
console.log('Available flags:');
console.log('  --outlier-chance <0-100>  : Set percentage chance for outlier readings');
console.log('  --help                    : Show detailed help');
console.log();
console.log('Starting simulation...\n');

// Wait a bit for the main API to be ready
setTimeout(() => {
  runSimulation();
}, 5000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down simulator...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down simulator...');
  process.exit(0);
});
