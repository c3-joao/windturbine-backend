#!/usr/bin/env node

const { initializeDatabase, WindTurbine } = require('../database');

/**
 * Check if seed data already exists in the database
 * Returns true if turbines exist, false otherwise
 */
async function checkSeedDataExists() {
  try {
    await initializeDatabase();
    const turbineCount = await WindTurbine.count();
    return turbineCount > 0;
  } catch (error) {
    console.error('Error checking seed data:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  checkSeedDataExists().then(exists => {
    if (exists) {
      console.log('Seed data already exists');
      process.exit(0);
    } else {
      console.log('No seed data found');
      process.exit(1);
    }
  });
}

module.exports = { checkSeedDataExists };
