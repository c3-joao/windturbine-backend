const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database/windturbine.db'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

// Wind Turbine Model
const WindTurbine = sequelize.define('WindTurbine', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  manufacturerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  manufacturerCountry: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  builtDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  installationDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  ratedCapacityKW: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2500, // Default 2.5MW
  },
}, {
  tableName: 'wind_turbines',
  timestamps: true, // Adds createdAt and updatedAt
});

// Work Order Model
const WorkOrder = sequelize.define('WorkOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  windTurbineId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: WindTurbine,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'closed'),
    defaultValue: 'open',
  },
  creationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  resolutionDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'work_orders',
  timestamps: true,
  paranoid: true, // Enables soft deletes
});

// Power Output Model
const PowerOutput = sequelize.define('PowerOutput', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  windTurbineId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: WindTurbine,
      key: 'id',
    },
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  powerKW: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
}, {
  tableName: 'power_outputs',
  timestamps: true,
});

// Work Order Comment Model
const WorkOrderComment = sequelize.define('WorkOrderComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  workOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: WorkOrder,
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'work_order_comments',
  timestamps: true,
});

// Define Associations
WindTurbine.hasMany(WorkOrder, { foreignKey: 'windTurbineId', as: 'workOrders' });
WorkOrder.belongsTo(WindTurbine, { foreignKey: 'windTurbineId', as: 'windTurbine' });

WindTurbine.hasMany(PowerOutput, { foreignKey: 'windTurbineId', as: 'powerOutputs' });
PowerOutput.belongsTo(WindTurbine, { foreignKey: 'windTurbineId', as: 'windTurbine' });

WorkOrder.hasMany(WorkOrderComment, { foreignKey: 'workOrderId', as: 'comments' });
WorkOrderComment.belongsTo(WorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });

// Database initialization function
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Create tables if they don't exist
    await sequelize.sync({ alter: false });
    console.log('Database tables created/updated successfully.');
    
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

// Reset database function (for development)
async function resetDatabase() {
  try {
    await sequelize.drop();
    await sequelize.sync({ force: true });
    console.log('Database reset successfully.');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  WindTurbine,
  WorkOrder,
  PowerOutput,
  WorkOrderComment,
  initializeDatabase,
  resetDatabase,
};
