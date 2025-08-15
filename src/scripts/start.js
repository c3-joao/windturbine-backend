#!/usr/bin/env node

/**
 * Comprehensive startup script for Wind Turbine Management System
 * Handles seeding, backend service, and data simulation
 */

const { spawn } = require('child_process');
const { checkSeedDataExists } = require('./check-seed-data');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    skipSeed: false,
    backendOnly: false,
    noSimulator: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg === '--skip-seed') {
      config.skipSeed = true;
    } else if (arg === '--backend-only') {
      config.backendOnly = true;
    } else if (arg === '--no-simulator') {
      config.noSimulator = true;
    } else {
      console.error(`Error: Unknown argument '${arg}'`);
      console.error('Use --help for available options');
      process.exit(1);
    }
  }

  return config;
}

function showHelp() {
  console.log('Wind Turbine Management System - Startup Script');
  console.log('===============================================');
  console.log();
  console.log('USAGE:');
  console.log('  npm start                    Start everything (seed, backend, simulator)');
  console.log('  npm run start:backend-only   Start only the backend service');
  console.log('  npm run start:no-seed        Start backend and simulator without seeding');
  console.log();
  console.log('OPTIONS:');
  console.log('  --skip-seed       Skip seeding even if no data exists');
  console.log('  --backend-only    Start only the backend service (no simulator)');
  console.log('  --no-simulator    Start backend without simulator');
  console.log('  --help, -h        Show this help message');
  console.log();
  console.log('EXAMPLES:');
  console.log('  node src/scripts/start.js --backend-only');
  console.log('  node src/scripts/start.js --skip-seed --no-simulator');
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: options.cwd || process.cwd(),
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function startService(command, args, serviceName) {
  return new Promise((resolve, reject) => {
    console.log(`Starting ${serviceName}...`);
    console.log(`Command: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // Give the service a moment to start
    setTimeout(() => {
      if (!child.killed) {
        console.log(`✅ ${serviceName} started successfully`);
        resolve(child);
      }
    }, 1000);

    child.on('error', (err) => {
      console.error(`❌ Failed to start ${serviceName}:`, err);
      reject(err);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ ${serviceName} exited with code ${code}`);
      }
    });
  });
}

async function main() {
  const config = parseArgs();

  if (config.help) {
    showHelp();
    return;
  }

  console.log('Wind Turbine Management System - Startup');
  console.log('========================================');
  console.log();

  const processes = [];

  try {
    // Step 1: Check and handle seeding
    if (!config.skipSeed) {
      console.log('🔍 Checking for existing seed data...');
      const seedDataExists = await checkSeedDataExists();
      
      if (seedDataExists) {
        console.log('✅ Seed data already exists, skipping seeding step');
      } else {
        console.log('📦 No seed data found, running seeder...');
        await runCommand('node', ['src/services/seedRunner.js']);
        console.log('✅ Seeding completed successfully');
      }
    } else {
      console.log('⏭️  Skipping seed data check (--skip-seed specified)');
    }

    console.log();

    // Step 2: Start backend service
    console.log('🚀 Starting backend service...');
    const backendProcess = await startService('node', ['src/app.js'], 'Backend API');
    processes.push(backendProcess);

    // Step 3: Start simulator (unless disabled)
    if (!config.backendOnly && !config.noSimulator) {
      console.log('🎲 Starting data simulator...');
      // Give backend a moment to fully start
      await new Promise(resolve => setTimeout(resolve, 2000));
      const simulatorProcess = await startService('node', ['streaming-service/simulator.js'], 'Data Simulator');
      processes.push(simulatorProcess);
    } else {
      if (config.backendOnly) {
        console.log('⏭️  Skipping simulator (backend-only mode)');
      } else {
        console.log('⏭️  Skipping simulator (--no-simulator specified)');
      }
    }

    console.log();
    console.log('🎉 All services started successfully!');
    console.log('📖 API documentation available at: http://localhost:3000/docs');
    console.log('🔍 Health check available at: http://localhost:3000/health');
    console.log();
    console.log('Press Ctrl+C to stop all services');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down services...');
      processes.forEach(child => {
        if (!child.killed) {
          child.kill('SIGTERM');
        }
      });
      process.exit(0);
    });

    // Keep the script running
    process.stdin.resume();

  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    
    // Clean up any started processes
    processes.forEach(child => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    });
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { main };
