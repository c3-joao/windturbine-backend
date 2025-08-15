const express = require('express');
const { Op } = require('sequelize');
const { WorkOrder, WorkOrderComment, WindTurbine } = require('../database');
const { validatePagination, createPaginationMeta } = require('../utils/pagination');
const { normalizeQueryParams } = require('../utils/queryNormalizer');

const router = express.Router();

/**
 * GET /api/1/workorders
 * List all work orders with optional filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    // Normalize query parameters to handle case-insensitive keys
    const normalizedQuery = normalizeQueryParams(req.query, [
      'windTurbineId', 'status', 'createdFrom', 'createdTo', 
      'resolvedFrom', 'resolvedTo', 'includeDeleted', 'page', 'limit'
    ]);
    
    const {
      windTurbineId,
      status,
      createdFrom,
      createdTo,
      resolvedFrom,
      resolvedTo,
      includeDeleted = 'false',
      page,
      limit
    } = normalizedQuery;

    // Validate pagination parameters using utility
    const { page: pageNum, limit: limitNum, offset } = validatePagination({ page, limit });

    // Build where clause
    const where = {};
    
    if (windTurbineId) {
      where.windTurbineId = windTurbineId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (createdFrom || createdTo) {
      where.creationDate = {};
      if (createdFrom) where.creationDate[Op.gte] = new Date(createdFrom);
      if (createdTo) where.creationDate[Op.lte] = new Date(createdTo);
    }
    
    if (resolvedFrom || resolvedTo) {
      where.resolutionDate = {};
      if (resolvedFrom) where.resolutionDate[Op.gte] = new Date(resolvedFrom);
      if (resolvedTo) where.resolutionDate[Op.lte] = new Date(resolvedTo);
    }

    // Handle soft deletes
    const paranoid = includeDeleted !== 'true';

    // Query with pagination
    const { rows: workOrders, count: total } = await WorkOrder.findAndCountAll({
      where,
      include: [{
        model: WindTurbine,
        as: 'windTurbine',
        attributes: ['id', 'name', 'active']
      }],
      limit: limitNum,
      offset,
      order: [['creationDate', 'DESC']],
      paranoid
    });

    res.json({
      data: workOrders,
      pagination: createPaginationMeta(pageNum, limitNum, total)
    });

  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch work orders'
    });
  }
});

/**
 * POST /api/1/workorders
 * Create one or more work orders
 */
router.post('/', async (req, res) => {
  try {
    const workOrderData = req.body;
    
    // Handle both single object and array
    const workOrders = Array.isArray(workOrderData) ? workOrderData : [workOrderData];
    
    // Validate required fields
    for (const workOrder of workOrders) {
      if (!workOrder.windTurbineId || !workOrder.title) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'windTurbineId and title are required for all work orders'
        });
      }

      // Verify wind turbine exists
      const turbine = await WindTurbine.findByPk(workOrder.windTurbineId);
      if (!turbine) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `Wind turbine with ID ${workOrder.windTurbineId} not found`
        });
      }
    }

    // Create work orders
    const createdWorkOrders = [];
    for (const workOrderInfo of workOrders) {
      const workOrder = await WorkOrder.create(workOrderInfo);
      
      // Fetch with wind turbine data for response
      const workOrderWithTurbine = await WorkOrder.findByPk(workOrder.id, {
        include: [{
          model: WindTurbine,
          as: 'windTurbine',
          attributes: ['id', 'name', 'active']
        }]
      });
      
      createdWorkOrders.push(workOrderWithTurbine);
    }

    const response = Array.isArray(req.body) ? createdWorkOrders : createdWorkOrders[0];
    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating work orders:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create work orders'
    });
  }
});

/**
 * GET /api/1/workorders/statistics
 * Work order distribution and statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    // Get status distribution
    const statusStats = await WorkOrder.findAll({
      attributes: [
        'status',
        [WorkOrder.sequelize.fn('COUNT', WorkOrder.sequelize.col('id')), 'count']
      ],
      where: { deletedAt: null },
      group: ['status']
    });

    // Get creation trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const creationTrends = await WorkOrder.findAll({
      attributes: [
        [WorkOrder.sequelize.fn('DATE', WorkOrder.sequelize.col('creationDate')), 'date'],
        [WorkOrder.sequelize.fn('COUNT', WorkOrder.sequelize.col('id')), 'count']
      ],
      where: {
        creationDate: { [Op.gte]: thirtyDaysAgo },
        deletedAt: null
      },
      group: [WorkOrder.sequelize.fn('DATE', WorkOrder.sequelize.col('creationDate'))],
      order: [[WorkOrder.sequelize.fn('DATE', WorkOrder.sequelize.col('creationDate')), 'ASC']]
    });

    // Average resolution time
    const avgResolutionTime = await WorkOrder.findAll({
      attributes: [
        [WorkOrder.sequelize.fn('AVG', WorkOrder.sequelize.literal('julianday(resolutionDate) - julianday(creationDate)')), 'avgDays']
      ],
      where: {
        status: 'closed',
        resolutionDate: { [Op.not]: null },
        deletedAt: null
      }
    });

    const avgDays = parseFloat(avgResolutionTime[0]?.dataValues?.avgDays || 0);

    res.json({
      statusDistribution: statusStats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.dataValues.count)
      })),
      creationTrends: creationTrends.map(trend => ({
        date: trend.dataValues.date,
        count: parseInt(trend.dataValues.count)
      })),
      averageResolutionDays: Math.round(avgDays * 100) / 100
    });

  } catch (error) {
    console.error('Error fetching work order statistics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch work order statistics'
    });
  }
});

/**
 * GET /api/1/workorders/:id
 * Retrieve a specific work order with comments
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const workOrder = await WorkOrder.findByPk(id, {
      include: [
        {
          model: WindTurbine,
          as: 'windTurbine',
          attributes: ['id', 'name', 'active', 'latitude', 'longitude']
        },
        {
          model: WorkOrderComment,
          as: 'comments',
          order: [['createdAt', 'ASC']]
        }
      ],
      paranoid: false // Include soft-deleted work orders
    });

    if (!workOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Work order not found'
      });
    }

    res.json(workOrder);

  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch work order'
    });
  }
});

/**
 * PATCH /api/1/workorders/:id
 * Update work order properties
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const workOrder = await WorkOrder.findByPk(id, {
      paranoid: false // Allow updating soft-deleted work orders
    });
    
    if (!workOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Work order not found'
      });
    }

    // If status is being changed to 'closed', set resolutionDate
    if (updates.status === 'closed' && workOrder.status !== 'closed') {
      updates.resolutionDate = new Date();
    }

    // If status is being changed from 'closed', clear resolutionDate
    if (updates.status && updates.status !== 'closed' && workOrder.status === 'closed') {
      updates.resolutionDate = null;
    }

    // Update work order
    await workOrder.update(updates);

    // Fetch updated work order with related data
    const updatedWorkOrder = await WorkOrder.findByPk(id, {
      include: [{
        model: WindTurbine,
        as: 'windTurbine',
        attributes: ['id', 'name', 'active']
      }],
      paranoid: false
    });

    res.json(updatedWorkOrder);

  } catch (error) {
    console.error('Error updating work order:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update work order'
    });
  }
});

/**
 * DELETE /api/1/workorders/:id
 * Soft-delete a work order
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const workOrder = await WorkOrder.findByPk(id);
    if (!workOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Work order not found'
      });
    }

    await workOrder.destroy(); // This is a soft delete due to paranoid: true
    res.status(204).send();

  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete work order'
    });
  }
});

/**
 * POST /api/1/workorders/:id/comments
 * Add a comment to a work order
 */
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content } = req.body;

    if (!userId || !content) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'userId and content are required'
      });
    }

    // Verify work order exists
    const workOrder = await WorkOrder.findByPk(id, { paranoid: false });
    if (!workOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Work order not found'
      });
    }

    // Create comment
    const comment = await WorkOrderComment.create({
      workOrderId: id,
      userId,
      content
    });

    res.status(201).json(comment);

  } catch (error) {
    console.error('Error creating work order comment:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create comment'
    });
  }
});

/**
 * GET /api/1/workorders/:id/comments
 * Retrieve all comments for a work order with pagination
 */
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;

    // Validate pagination parameters using utility
    const { page: pageNum, limit: limitNum, offset } = validatePagination({ page, limit });

    // Verify work order exists
    const workOrder = await WorkOrder.findByPk(id, { paranoid: false });
    if (!workOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Work order not found'
      });
    }

    const { rows: comments, count: total } = await WorkOrderComment.findAndCountAll({
      where: { workOrderId: id },
      order: [['createdAt', 'ASC']],
      limit: limitNum,
      offset
    });

    res.json({
      data: comments,
      pagination: createPaginationMeta(pageNum, limitNum, total)
    });

  } catch (error) {
    console.error('Error fetching work order comments:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch comments'
    });
  }
});

module.exports = router;
