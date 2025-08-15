const express = require('express');
const { Op } = require('sequelize');
const { PowerOutput, WindTurbine } = require('../database');
const { validateLimit } = require('../utils/pagination');
const { normalizeQueryParams } = require('../utils/queryNormalizer');

const router = express.Router({ mergeParams: true });

/**
 * POST /api/1/windturbines/:id/power-output
 * Submit power output reading for a specific turbine
 */
router.post('/', async (req, res) => {
  try {
    const { id } = req.params;
    const { powerKW, timestamp } = req.body;

    if (typeof powerKW !== 'number') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'powerKW must be a number'
      });
    }

    // Verify wind turbine exists
    const turbine = await WindTurbine.findByPk(id);
    if (!turbine) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wind turbine not found'
      });
    }

    // Create power output record
    const powerOutput = await PowerOutput.create({
      windTurbineId: id,
      powerKW,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    res.status(201).json(powerOutput);

  } catch (error) {
    console.error('Error creating power output:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create power output record'
    });
  }
});

/**
 * GET /api/1/windturbines/:id/power-output
 * Historical power output data with time range filtering
 */
router.get('/', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Normalize query parameters to handle case-insensitive keys
    const normalizedQuery = normalizeQueryParams(req.query, ['from', 'to', 'aggregation', 'limit']);
    const { from, to, aggregation, limit } = normalizedQuery;

    console.log('Power output request for turbine ID:', id); // Debug log

    // Validate limit parameter using utility
    const validatedLimit = validateLimit(limit);

    // Verify wind turbine exists
    const turbine = await WindTurbine.findByPk(id);
    if (!turbine) {
      console.log('Turbine not found:', id); // Debug log
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wind turbine not found'
      });
    }

    // Build where clause with default 24-hour filter
    const where = { windTurbineId: id };
    
    // If no date filters are provided, default to last 24 hours
    if (!from && !to) {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      where.timestamp = {
        [Op.gte]: twentyFourHoursAgo,
        [Op.lte]: now
      };
    } else {
      // Use provided date filters
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }

    let queryOptions = {
      where,
      order: [['timestamp', 'DESC']],
      limit: validatedLimit
    };

    // Handle aggregation
    if (aggregation) {
      let dateFormat;
      switch (aggregation) {
        case 'minute':
          dateFormat = '%Y-%m-%d %H:%M';
          break;
        case 'hour':
          dateFormat = '%Y-%m-%d %H';
          break;
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        default:
          return res.status(400).json({
            error: 'Validation Error',
            message: 'aggregation must be one of: minute, hour, day'
          });
      }

      // Use raw SQL for aggregation (SQLite specific)
      queryOptions = {
        attributes: [
          [PowerOutput.sequelize.fn('strftime', dateFormat, PowerOutput.sequelize.col('timestamp')), 'period'],
          [PowerOutput.sequelize.fn('AVG', PowerOutput.sequelize.col('powerKW')), 'avgPowerKW'],
          [PowerOutput.sequelize.fn('MIN', PowerOutput.sequelize.col('powerKW')), 'minPowerKW'],
          [PowerOutput.sequelize.fn('MAX', PowerOutput.sequelize.col('powerKW')), 'maxPowerKW'],
          [PowerOutput.sequelize.fn('COUNT', PowerOutput.sequelize.col('id')), 'readingCount']
        ],
        where,
        group: [PowerOutput.sequelize.fn('strftime', dateFormat, PowerOutput.sequelize.col('timestamp'))],
        order: [[PowerOutput.sequelize.fn('strftime', dateFormat, PowerOutput.sequelize.col('timestamp')), 'DESC']],
        limit: validatedLimit
      };
    }

    const powerOutputs = await PowerOutput.findAll(queryOptions);

    res.json({
      turbineId: id,
      turbineName: turbine.name,
      aggregation: aggregation || 'none',
      totalRecords: powerOutputs.length,
      data: powerOutputs
    });

  } catch (error) {
    console.error('Error fetching power output data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch power output data'
    });
  }
});

module.exports = router;
