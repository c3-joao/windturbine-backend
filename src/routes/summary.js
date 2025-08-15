const express = require('express');
const { Op } = require('sequelize');
const { WindTurbine, WorkOrder, PowerOutput } = require('../database');

const router = express.Router();

/**
 * GET /api/1/summary
 * Aggregate system statistics
 */
router.get('/', async (req, res) => {
  try {
    // Get basic counts
    const [
      totalTurbines,
      activeTurbines,
      totalWorkOrders,
      openWorkOrders,
      inProgressWorkOrders
    ] = await Promise.all([
      WindTurbine.count(),
      WindTurbine.count({ where: { active: true } }),
      WorkOrder.count({ where: { deletedAt: null } }),
      WorkOrder.count({ where: { status: 'open', deletedAt: null } }),
      WorkOrder.count({ where: { status: 'in_progress', deletedAt: null } })
    ]);

    // Get average power output from recent data
    const recentPowerOutput = await PowerOutput.findAll({
      attributes: [
        [PowerOutput.sequelize.fn('AVG', PowerOutput.sequelize.col('powerKW')), 'avgPower']
      ],
      where: {
        timestamp: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    const avgPowerOutput = parseFloat(recentPowerOutput[0]?.dataValues?.avgPower || 0);

    res.json({
      totalTurbines,
      activeTurbines,
      totalWorkOrders,
      openWorkOrders,
      inProgressWorkOrders,
      avgPowerOutput: Math.round(avgPowerOutput * 100) / 100 // Round to 2 decimal places
    });

  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch summary statistics'
    });
  }
});

/**
 * GET /api/1/summary/windturbines/:id/workorders
 * Work order statistics for a specific wind turbine
 */
router.get('/windturbines/:id/workorders', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify wind turbine exists
    const turbine = await WindTurbine.findByPk(id);
    if (!turbine) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wind turbine not found'
      });
    }

    // Get work order counts by status
    const statusCounts = await WorkOrder.findAll({
      attributes: [
        'status',
        [WorkOrder.sequelize.fn('COUNT', WorkOrder.sequelize.col('id')), 'count']
      ],
      where: { 
        windTurbineId: id,
        deletedAt: null 
      },
      group: ['status']
    });

    // Get total work orders
    const totalWorkOrders = await WorkOrder.count({
      where: { 
        windTurbineId: id,
        deletedAt: null 
      }
    });

    // Get average resolution time for this turbine
    const avgResolutionTime = await WorkOrder.findAll({
      attributes: [
        [WorkOrder.sequelize.fn('AVG', WorkOrder.sequelize.literal('julianday(resolutionDate) - julianday(creationDate)')), 'avgDays']
      ],
      where: {
        windTurbineId: id,
        status: 'closed',
        resolutionDate: { [Op.not]: null },
        deletedAt: null
      }
    });

    const avgDays = parseFloat(avgResolutionTime[0]?.dataValues?.avgDays || 0);

    res.json({
      turbineId: id,
      turbineName: turbine.name,
      totalWorkOrders,
      statusBreakdown: statusCounts.map(stat => ({
        status: stat.status,
        count: parseInt(stat.dataValues.count)
      })),
      averageResolutionDays: Math.round(avgDays * 100) / 100
    });

  } catch (error) {
    console.error('Error fetching turbine work order summary:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch turbine work order summary'
    });
  }
});

/**
 * GET /api/1/summary/debug/first-turbine
 * Helper endpoint to get the first turbine ID for testing
 */
router.get('/debug/first-turbine', async (req, res) => {
  try {
    const turbine = await WindTurbine.findOne({
      order: [['name', 'ASC']]
    });

    if (!turbine) {
      return res.status(404).json({ message: 'No turbines found' });
    }

    res.json({
      id: turbine.id,
      name: turbine.name,
      testUrls: {
        getTurbine: `/api/1/windturbines/${turbine.id}`,
        updateTurbine: `/api/1/windturbines/${turbine.id}`,
        deleteTurbine: `/api/1/windturbines/${turbine.id}`,
        workOrderSummary: `/api/1/summary/windturbines/${turbine.id}/workorders`
      }
    });

  } catch (error) {
    console.error('Error fetching first turbine:', error);
    res.status(500).json({ error: 'Failed to fetch first turbine' });
  }
});

module.exports = router;
