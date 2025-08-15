#!/usr/bin/env node

const { initializeDatabase, resetDatabase } = require('../database');
const { seedDatabase } = require('./dataGenerator');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function confirmReset() {
  return new Promise((resolve) => {
    rl.question('This will permanently delete all data. Are you sure? (yes/no): ', (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function showHelp() {
  console.log('Wind Turbine Management System - Data Seeder');
  console.log('==============================================');
  console.log();
  console.log('USAGE:');
  console.log('  npm run seed                 Generate seed data (if database is empty)');
  console.log('  npm run seed:reset           Clear all data and regenerate seed data');
  console.log('  npm run seed:clear           Clear all data (no regeneration)');
  console.log();
  console.log('OPTIONS:');
  console.log('  --reset        Clear database and regenerate seed data');
  console.log('  --clear        Clear database only (no regeneration)');
  console.log('  --force        Skip confirmation prompts');
  console.log('  --help, -h     Show this help message');
  console.log();
  console.log('EXAMPLES:');
  console.log('  npm run seed:reset           # Clear and regenerate with confirmation');
  console.log('  npm run seed:clear -- --force   # Clear without confirmation');
}

async function main() {
  console.log('Wind Turbine Management System - Data Seeder');
  console.log('==============================================');

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const shouldReset = args.includes('--reset');
    const shouldClearOnly = args.includes('--clear');
    const forceMode = args.includes('--force') || args.includes('-f');
    const showHelpFlag = args.includes('--help') || args.includes('-h');

    if (showHelpFlag) {
      showHelp();
      rl.close();
      return;
    }

    // Initialize database connection
    await initializeDatabase();
    
    if (shouldReset || shouldClearOnly) {
      console.log();
      console.log('🗑️  This will clear all wind turbine data including:');
      console.log('   • Wind turbines');
      console.log('   • Work orders and comments');
      console.log('   • Power output history');
      console.log();

      // Confirm deletion unless force flag is used
      if (!forceMode) {
        const confirmed = await confirmReset();
        if (!confirmed) {
          console.log('❌ Operation cancelled');
          rl.close();
          return;
        }
      } else {
        console.log('⚠️  Force mode enabled, skipping confirmation');
      }

      console.log('🧹 Clearing database...');
      await resetDatabase();
      console.log('✅ Database cleared successfully!');

      if (shouldClearOnly) {
        console.log('💡 Run "npm run seed" to generate new test data');
        rl.close();
        return;
      }
    }

    // Seed the database (either fresh start or after reset)
    const success = await seedDatabase();
    
    if (success) {
      console.log('\n✅ Database seeding completed successfully!');
      console.log('You can now start the API server with: npm start');
    } else {
      console.log('\n❌ Database seeding failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error running seeder:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
