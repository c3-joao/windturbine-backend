const { faker } = require('@faker-js/faker');
const { WindTurbine, WorkOrder, PowerOutput, WorkOrderComment } = require('../database');

// Realistic wind turbine manufacturers with their countries
const MANUFACTURERS = [
  { name: 'General Electric', country: 'United States' },
  { name: 'Vestas', country: 'Denmark' },
  { name: 'Siemens Gamesa', country: 'Germany' },
  { name: 'Goldwind', country: 'China' },
  { name: 'Enercon', country: 'Germany' },
  { name: 'Nordex', country: 'Germany' },
  { name: 'Mingyang', country: 'China' },
  { name: 'Envision Energy', country: 'China' },
];

// US wind farm locations (state, lat range, lng range)
const WIND_FARM_LOCATIONS = [
  { state: 'Texas', latRange: [25.8, 36.5], lngRange: [-106.6, -93.5] },
  { state: 'Iowa', latRange: [40.4, 43.5], lngRange: [-96.6, -90.1] },
  { state: 'California', latRange: [32.5, 42.0], lngRange: [-124.4, -114.1] },
  { state: 'Kansas', latRange: [37.0, 40.0], lngRange: [-102.0, -94.6] },
  { state: 'Oklahoma', latRange: [33.6, 37.0], lngRange: [-103.0, -94.4] },
  { state: 'Nebraska', latRange: [40.0, 43.0], lngRange: [-104.0, -95.3] },
  { state: 'Wyoming', latRange: [41.0, 45.0], lngRange: [-111.0, -104.0] },
];

// Work order types and descriptions
const WORK_ORDER_TYPES = [
  {
    type: 'Routine Maintenance',
    descriptions: [
      'Quarterly turbine inspection and maintenance',
      'Annual gearbox oil change and filter replacement',
      'Blade inspection and cleaning',
      'Generator maintenance and testing',
      'Electrical system inspection',
      'Safety system testing and calibration',
    ]
  },
  {
    type: 'Emergency Repair',
    descriptions: [
      'Gearbox failure - emergency replacement required',
      'Generator overheating - immediate shutdown',
      'Blade damage from storm - safety inspection needed',
      'Electrical fault causing power fluctuations',
      'Brake system malfunction - urgent repair',
      'Control system failure - replacement needed',
    ]
  },
  {
    type: 'Performance Investigation',
    descriptions: [
      'Power output below expected levels - investigation required',
      'Unusual vibration patterns detected',
      'Efficiency drop compared to neighboring turbines',
      'Intermittent power generation issues',
      'Wind speed vs power output analysis needed',
      'Comparative performance study with similar turbines',
    ]
  },
  {
    type: 'Upgrade',
    descriptions: [
      'Control system software upgrade',
      'Blade aerodynamic enhancement installation',
      'Generator efficiency improvement',
      'SCADA system upgrade',
      'Lightning protection system enhancement',
      'Condition monitoring system installation',
    ]
  },
];

// Comments for work orders - organized by typical progression stages
const WORK_ORDER_COMMENTS = {
  initial: [
    'Work order created. Initial assessment scheduled.',
    'Received alert from monitoring system. Investigating issue.',
    'Site inspection planned for tomorrow morning.',
    'Maintenance request submitted by operations team.',
    'Safety assessment completed. Work authorized to proceed.',
    'Initial diagnostic completed. Issue confirmed.',
    'Equipment shutdown safely. Beginning detailed inspection.',
    'Weather window identified. Crew deployment authorized.',
  ],
  inProgress: [
    'Maintenance crew dispatched to site.',
    'Parts ordered from manufacturer. ETA 2-3 business days.',
    'Initial assessment completed. Scope of work confirmed.',
    'Waiting for manufacturer technical support response.',
    'Additional specialist required. Scheduling coordination in progress.',
    'Weather conditions delaying work. Monitoring forecast.',
    'Safety meeting completed with crew. Work proceeding.',
    'Access equipment positioned. Beginning maintenance work.',
    'Diagnostic testing in progress. Preliminary results positive.',
    'Replacement parts received. Quality inspection passed.',
    'Working with vendor on calibration procedures.',
    'Progress update: 60% complete. On schedule for completion.',
  ],
  complications: [
    'Additional issues discovered during inspection.',
    'Unexpected component wear found. Expanding scope of work.',
    'Weather conditions deteriorating. Work suspended temporarily.',
    'Parts delivery delayed due to shipping issues.',
    'Escalating to senior technician for technical guidance.',
    'Manufacturer consulted on unusual findings.',
    'Additional safety precautions implemented.',
    'Extended downtime required for thorough inspection.',
    'Waiting for specialized equipment to arrive on site.',
    'Issue more complex than initially assessed.',
  ],
  completion: [
    'Repair completed successfully. System back online.',
    'Quality check passed. Work order ready for closure.',
    'Functional testing completed. All parameters normal.',
    'System performance verified. Operating within specifications.',
    'Final inspection completed. Work meets all requirements.',
    'Equipment returned to service. Monitoring for 24 hours.',
    'Commissioning tests passed. Turbine back in production.',
    'Work completed ahead of schedule. Excellent crew performance.',
    'All safety protocols followed. Zero incidents reported.',
    'Customer sign-off received. Work order closed.',
  ],
  followUp: [
    'Regular monitoring recommended for next 30 days.',
    'Follow-up inspection scheduled in 6 months.',
    'Trending analysis shows improved performance.',
    'Recommend similar maintenance on adjacent units.',
    'Documentation updated in maintenance management system.',
    'Lessons learned captured for future reference.',
    'Performance data indicates successful repair.',
    'Reliability improvement noted since completion.',
  ]
};

// Set faker seed for consistent data generation
faker.seed(12345);

/**
 * Generate realistic wind turbine name
 */
function generateTurbineName(index) {
  const adjectives = ['Swift', 'Mighty', 'Thunder', 'Storm', 'Wind', 'Sky', 'Power', 'Energy', 'Force', 'Strong'];
  const nouns = ['Eagle', 'Falcon', 'Hawk', 'Storm', 'Wind', 'Power', 'Force', 'Giant', 'Titan', 'Guardian'];
  
  const adjective = adjectives[index % adjectives.length];
  const noun = nouns[Math.floor(index / adjectives.length) % nouns.length];
  const number = String(index + 1).padStart(3, '0');
  
  return `${adjective}-${noun}-${number}`;
}

/**
 * Generate realistic wind turbine data
 */
function generateWindTurbine(index) {
  const location = faker.helpers.arrayElement(WIND_FARM_LOCATIONS);
  const manufacturer = faker.helpers.arrayElement(MANUFACTURERS);
  
  // Generate coordinates within the state bounds
  const latitude = faker.number.float({
    min: location.latRange[0],
    max: location.latRange[1],
    fractionDigits: 6
  });
  
  const longitude = faker.number.float({
    min: location.lngRange[0],
    max: location.lngRange[1],
    fractionDigits: 6
  });

  // Installation dates between 2015-2023
  const installationDate = faker.date.between({
    from: new Date('2015-01-01'),
    to: new Date('2023-12-31')
  });

  // Built date is 2-6 months before installation
  const builtDate = new Date(installationDate);
  builtDate.setMonth(builtDate.getMonth() - faker.number.int({ min: 2, max: 6 }));

  // Rated capacity between 1.5MW and 3.5MW
  const ratedCapacityKW = faker.helpers.arrayElement([1500, 2000, 2500, 3000, 3500]);

  // Some turbines might be inactive due to maintenance or issues
  const active = index < 140 ? true : faker.datatype.boolean(0.85); // 85% active

  return {
    name: generateTurbineName(index),
    latitude,
    longitude,
    manufacturerName: manufacturer.name,
    manufacturerCountry: manufacturer.country,
    builtDate,
    installationDate,
    active,
    ratedCapacityKW,
  };
}

/**
 * Generate realistic work order data
 */
function generateWorkOrder(windTurbineId, turbineInstallDate) {
  const workOrderType = faker.helpers.arrayElement(WORK_ORDER_TYPES);
  const description = faker.helpers.arrayElement(workOrderType.descriptions);
  
  // Creation date should be after turbine installation
  const creationDate = faker.date.between({
    from: turbineInstallDate,
    to: new Date()
  });

  // Determine status based on creation date (older orders more likely to be closed)
  const daysSinceCreation = (new Date() - creationDate) / (1000 * 60 * 60 * 24);
  let status;
  let resolutionDate = null;

  if (daysSinceCreation > 30) {
    status = faker.helpers.weightedArrayElement([
      { weight: 70, value: 'closed' },
      { weight: 20, value: 'in_progress' },
      { weight: 10, value: 'open' }
    ]);
  } else if (daysSinceCreation > 7) {
    status = faker.helpers.weightedArrayElement([
      { weight: 40, value: 'closed' },
      { weight: 40, value: 'in_progress' },
      { weight: 20, value: 'open' }
    ]);
  } else {
    status = faker.helpers.weightedArrayElement([
      { weight: 20, value: 'closed' },
      { weight: 30, value: 'in_progress' },
      { weight: 50, value: 'open' }
    ]);
  }

  // Set resolution date if closed
  if (status === 'closed') {
    resolutionDate = faker.date.between({
      from: creationDate,
      to: new Date()
    });
  }

  return {
    windTurbineId,
    title: `${workOrderType.type}: ${description.split(' - ')[0]}`,
    description,
    status,
    creationDate,
    resolutionDate,
  };
}

/**
 * Generate realistic work order comment sequence
 */
function generateWorkOrderComments(workOrderId, workOrderStatus) {
  const comments = [];
  const numComments = faker.number.int({ min: 3, max: 5 });
  
  // Always start with an initial comment
  comments.push({
    workOrderId,
    userId: faker.person.fullName(),
    content: faker.helpers.arrayElement(WORK_ORDER_COMMENTS.initial),
    createdAt: faker.date.past({ years: 1 })
  });
  
  // Add progress comments
  for (let i = 1; i < numComments - 1; i++) {
    let commentCategory;
    const rand = Math.random();
    
    if (rand < 0.6) {
      commentCategory = WORK_ORDER_COMMENTS.inProgress;
    } else if (rand < 0.8) {
      commentCategory = WORK_ORDER_COMMENTS.complications;
    } else {
      commentCategory = WORK_ORDER_COMMENTS.followUp;
    }
    
    comments.push({
      workOrderId,
      userId: faker.person.fullName(),
      content: faker.helpers.arrayElement(commentCategory),
      createdAt: faker.date.between({ 
        from: comments[comments.length - 1].createdAt, 
        to: new Date() 
      })
    });
  }
  
  // Add final comment based on work order status
  let finalCommentCategory;
  if (workOrderStatus === 'completed' || workOrderStatus === 'closed') {
    finalCommentCategory = WORK_ORDER_COMMENTS.completion;
  } else if (workOrderStatus === 'in_progress') {
    finalCommentCategory = WORK_ORDER_COMMENTS.inProgress;
  } else {
    finalCommentCategory = WORK_ORDER_COMMENTS.initial;
  }
  
  comments.push({
    workOrderId,
    userId: faker.person.fullName(),
    content: faker.helpers.arrayElement(finalCommentCategory),
    createdAt: faker.date.between({ 
      from: comments[comments.length - 1].createdAt, 
      to: new Date() 
    })
  });
  
  // Sort comments by creation date to ensure proper chronological order
  return comments.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Generate realistic work order comment (legacy function for backwards compatibility)
 */
function generateWorkOrderComment(workOrderId) {
  return {
    workOrderId,
    userId: faker.person.fullName(),
    content: faker.helpers.arrayElement([
      ...WORK_ORDER_COMMENTS.initial,
      ...WORK_ORDER_COMMENTS.inProgress,
      ...WORK_ORDER_COMMENTS.completion
    ]),
  };
}

/**
 * Generate realistic power output data
 */
function generatePowerOutput(windTurbineId, ratedCapacityKW, timestamp) {
  // Simulate realistic power curves based on time of day and random factors
  const hour = timestamp.getHours();
  
  // Wind is typically stronger at night and early morning
  let windStrengthFactor;
  if (hour >= 22 || hour <= 6) {
    windStrengthFactor = faker.number.float({ min: 0.7, max: 1.0 });
  } else if (hour >= 10 && hour <= 16) {
    windStrengthFactor = faker.number.float({ min: 0.3, max: 0.7 });
  } else {
    windStrengthFactor = faker.number.float({ min: 0.5, max: 0.9 });
  }

  // Add random variation for weather, maintenance, etc.
  const randomFactor = faker.number.float({ min: 0.8, max: 1.2 });
  
  // Some turbines perform better than others
  const turbineEfficiency = faker.number.float({ min: 0.85, max: 1.15 });

  // Calculate power output (can occasionally exceed rated capacity)
  let powerKW = ratedCapacityKW * windStrengthFactor * randomFactor * turbineEfficiency;
  
  // Cap at 120% of rated capacity (brief wind gusts)
  powerKW = Math.min(powerKW, ratedCapacityKW * 1.2);
  
  // Ensure non-negative
  powerKW = Math.max(0, powerKW);

  return {
    windTurbineId,
    timestamp,
    powerKW: Math.round(powerKW * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Seed database with realistic data
 */
async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    await PowerOutput.destroy({ where: {}, force: true });
    await WorkOrderComment.destroy({ where: {}, force: true });
    await WorkOrder.destroy({ where: {}, force: true, paranoid: false });
    await WindTurbine.destroy({ where: {}, force: true });

    console.log('Cleared existing data.');

    // Generate wind turbines
    console.log('Generating wind turbines...');
    const turbines = [];
    for (let i = 0; i < 150; i++) {
      const turbineData = generateWindTurbine(i);
      const turbine = await WindTurbine.create(turbineData);
      turbines.push(turbine);
    }
    console.log(`Created ${turbines.length} wind turbines.`);

    // Generate work orders
    console.log('Generating work orders...');
    const workOrders = [];
    for (const turbine of turbines) {
      // Each turbine gets 2-8 work orders
      const numWorkOrders = faker.number.int({ min: 2, max: 8 });
      for (let i = 0; i < numWorkOrders; i++) {
        const workOrderData = generateWorkOrder(turbine.id, turbine.installationDate);
        const workOrder = await WorkOrder.create(workOrderData);
        workOrders.push(workOrder);
      }
    }
    console.log(`Created ${workOrders.length} work orders.`);

    // Generate work order comments
    console.log('Generating work order comments...');
    let commentCount = 0;
    for (const workOrder of workOrders) {
      // ALL work orders now get 3-5 realistic comments
      const comments = generateWorkOrderComments(workOrder.id, workOrder.status);
      
      for (const commentData of comments) {
        await WorkOrderComment.create(commentData);
        commentCount++;
      }
    }
    console.log(`Created ${commentCount} work order comments for ${workOrders.length} work orders.`);
    console.log(`Average ${Math.round(commentCount / workOrders.length * 100) / 100} comments per work order.`);

    // Generate historical power output data (last 7 days)
    console.log('Generating power output data...');
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let powerOutputCount = 0;
    for (const turbine of turbines) {
      if (!turbine.active) continue; // Skip inactive turbines
      
      // Generate data points every 2 hours for active turbines
      for (let date = new Date(sevenDaysAgo); date <= now; date.setHours(date.getHours() + 2)) {
        // Occasionally skip data points to simulate sensor issues
        if (faker.datatype.boolean(0.95)) { // 95% data availability
          const powerOutputData = generatePowerOutput(turbine.id, turbine.ratedCapacityKW, new Date(date));
          await PowerOutput.create(powerOutputData);
          powerOutputCount++;
        }
      }
    }
    console.log(`Created ${powerOutputCount} power output records.`);

    console.log('Database seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}

module.exports = {
  seedDatabase,
  generateWindTurbine,
  generateWorkOrder,
  generateWorkOrderComment,
  generateWorkOrderComments,
  generatePowerOutput,
};
