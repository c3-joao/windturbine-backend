const express = require('express');
const { Op, fn, col, where } = require('sequelize');
const { WindTurbine, WorkOrder, PowerOutput } = require('../database');
const { validatePagination, createPaginationMeta } = require('../utils/pagination');
const { normalizeQueryParams } = require('../utils/queryNormalizer');

const router = express.Router();

/**
 * GET /api/1/windturbines
 * List all wind turbines with optional filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    // Normalize query parameters to handle case-insensitive keys
    const normalizedQuery = normalizeQueryParams(req.query, [
      'name', 'manufacturer', 'builtDateFrom', 'builtDateTo', 
      'installationDateFrom', 'installationDateTo', 'active', 'page', 'limit'
    ]);
    
    const {
      name,
      manufacturer,
      builtDateFrom,
      builtDateTo,
      installationDateFrom,
      installationDateTo,
      active,
      page,
      limit
    } = normalizedQuery;

    // Validate pagination parameters using utility
    const { page: pageNum, limit: limitNum, offset } = validatePagination({ page, limit });

    // Build where clause
    const whereConditions = {};
    
    if (name) {
      whereConditions[Op.and] = whereConditions[Op.and] || [];
      whereConditions[Op.and].push(
        where(fn('LOWER', col('name')), { [Op.like]: `%${name.toLowerCase()}%` })
      );
    }
    
    if (manufacturer) {
      whereConditions[Op.and] = whereConditions[Op.and] || [];
      whereConditions[Op.and].push(
        where(fn('LOWER', col('manufacturerName')), { [Op.like]: `%${manufacturer.toLowerCase()}%` })
      );
    }
    
    if (builtDateFrom || builtDateTo) {
      whereConditions.builtDate = {};
      if (builtDateFrom) whereConditions.builtDate[Op.gte] = new Date(builtDateFrom);
      if (builtDateTo) whereConditions.builtDate[Op.lte] = new Date(builtDateTo);
    }
    
    if (installationDateFrom || installationDateTo) {
      whereConditions.installationDate = {};
      if (installationDateFrom) whereConditions.installationDate[Op.gte] = new Date(installationDateFrom);
      if (installationDateTo) whereConditions.installationDate[Op.lte] = new Date(installationDateTo);
    }
    
    if (active !== undefined) {
      whereConditions.active = active === 'true';
    }

    // Query with pagination
    const { rows: turbines, count: total } = await WindTurbine.findAndCountAll({
      where: whereConditions,
      limit: limitNum,
      offset,
      order: [['name', 'ASC']],
      attributes: {
        include: [
          // Add virtual manufacturer field
          ['manufacturerName', 'manufacturerName'],
          ['manufacturerCountry', 'manufacturerCountry']
        ]
      }
    });

    // Format response to match API spec
    const formattedTurbines = turbines.map(turbine => ({
      id: turbine.id,
      name: turbine.name,
      latitude: turbine.latitude,
      longitude: turbine.longitude,
      manufacturer: {
        name: turbine.manufacturerName,
        country: turbine.manufacturerCountry
      },
      builtDate: turbine.builtDate,
      installationDate: turbine.installationDate,
      active: turbine.active,
      ratedCapacityKW: turbine.ratedCapacityKW,
      createdAt: turbine.createdAt,
      updatedAt: turbine.updatedAt
    }));

    res.json({
      data: formattedTurbines,
      pagination: createPaginationMeta(pageNum, limitNum, total)
    });

  } catch (error) {
    console.error('Error fetching wind turbines:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch wind turbines'
    });
  }
});

/**
 * POST /api/1/windturbines
 * Create one or more wind turbines
 */
router.post('/', async (req, res) => {
  try {
    const turbineData = req.body;
    
    // Handle both single object and array
    const turbines = Array.isArray(turbineData) ? turbineData : [turbineData];
    
    // Validate required fields
    for (const turbine of turbines) {
      if (!turbine.name) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Name is required for all turbines'
        });
      }
    }

    // Create turbines
    const createdTurbines = [];
    for (const turbineInfo of turbines) {
      // Format manufacturer data
      const turbineData = {
        ...turbineInfo,
        manufacturerName: turbineInfo.manufacturer?.name || turbineInfo.manufacturerName,
        manufacturerCountry: turbineInfo.manufacturer?.country || turbineInfo.manufacturerCountry,
      };
      
      const turbine = await WindTurbine.create(turbineData);
      
      // Format response
      createdTurbines.push({
        id: turbine.id,
        name: turbine.name,
        latitude: turbine.latitude,
        longitude: turbine.longitude,
        manufacturer: {
          name: turbine.manufacturerName,
          country: turbine.manufacturerCountry
        },
        builtDate: turbine.builtDate,
        installationDate: turbine.installationDate,
        active: turbine.active,
        ratedCapacityKW: turbine.ratedCapacityKW,
        createdAt: turbine.createdAt,
        updatedAt: turbine.updatedAt
      });
    }

    const response = Array.isArray(req.body) ? createdTurbines : createdTurbines[0];
    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating wind turbines:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A turbine with this name already exists'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create wind turbines'
    });
  }
});

/**
 * GET /api/1/windturbines/:id
 * Retrieve a specific wind turbine by ID with related data
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const turbine = await WindTurbine.findByPk(id, {
      include: [
        {
          model: WorkOrder,
          as: 'workOrders',
          where: { deletedAt: null },
          required: false,
          limit: 10,
          order: [['createdAt', 'DESC']]
        },
        {
          model: PowerOutput,
          as: 'powerOutputs',
          required: false,
          limit: 24, // Last 24 readings
          order: [['timestamp', 'DESC']]
        }
      ]
    });

    if (!turbine) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wind turbine not found'
      });
    }

    // Format response
    const response = {
      id: turbine.id,
      name: turbine.name,
      latitude: turbine.latitude,
      longitude: turbine.longitude,
      manufacturer: {
        name: turbine.manufacturerName,
        country: turbine.manufacturerCountry
      },
      builtDate: turbine.builtDate,
      installationDate: turbine.installationDate,
      active: turbine.active,
      ratedCapacityKW: turbine.ratedCapacityKW,
      createdAt: turbine.createdAt,
      updatedAt: turbine.updatedAt,
      recentWorkOrders: turbine.workOrders || [],
      recentPowerOutputs: turbine.powerOutputs || []
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching wind turbine:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch wind turbine'
    });
  }
});

/**
 * PATCH /api/1/windturbines/:id
 * Update wind turbine properties
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const turbine = await WindTurbine.findByPk(id);
    if (!turbine) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wind turbine not found'
      });
    }

    // Handle manufacturer updates
    if (updates.manufacturer) {
      updates.manufacturerName = updates.manufacturer.name;
      updates.manufacturerCountry = updates.manufacturer.country;
      delete updates.manufacturer;
    }

    // Update turbine
    await turbine.update(updates);

    // Format response
    const response = {
      id: turbine.id,
      name: turbine.name,
      latitude: turbine.latitude,
      longitude: turbine.longitude,
      manufacturer: {
        name: turbine.manufacturerName,
        country: turbine.manufacturerCountry
      },
      builtDate: turbine.builtDate,
      installationDate: turbine.installationDate,
      active: turbine.active,
      ratedCapacityKW: turbine.ratedCapacityKW,
      createdAt: turbine.createdAt,
      updatedAt: turbine.updatedAt
    };

    res.json(response);

  } catch (error) {
    console.error('Error updating wind turbine:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update wind turbine'
    });
  }
});

/**
 * DELETE /api/1/windturbines/:id
 * Delete a wind turbine (hard delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const turbine = await WindTurbine.findByPk(id);
    if (!turbine) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wind turbine not found'
      });
    }

    await turbine.destroy();
    res.status(204).send();

  } catch (error) {
    console.error('Error deleting wind turbine:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete wind turbine'
    });
  }
});

/**
 * DELETE /api/1/windturbines
 * Bulk delete wind turbines
 */
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'ids array is required'
      });
    }

    await WindTurbine.destroy({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    res.status(204).send();

  } catch (error) {
    console.error('Error bulk deleting wind turbines:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete wind turbines'
    });
  }
});

module.exports = router;
