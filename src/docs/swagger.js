const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wind Turbine Management System API',
      version: '1.0.0',
      description: `A comprehensive API for managing wind turbines, work orders, and power output data.

## Date and Location Format Guidelines

### Date Filters
All date filter parameters accept the following formats:
- **ISO 8601 format**: \`2023-12-31T23:59:59Z\` (recommended)
  - Full datetime: \`2024-08-15T14:30:00Z\` (UTC timezone)
  - With timezone: \`2024-08-15T14:30:00-07:00\` (Pacific timezone)
  - With milliseconds: \`2024-08-15T14:30:00.123Z\`
- **Date only**: \`2023-12-31\` (will be interpreted as the start/end of that day)
- **Timestamp**: Any valid JavaScript Date constructor input

**Examples:**
- \`?builtDateFrom=2020-01-01\` (simple date)
- \`?builtDateFrom=2020-01-01T00:00:00Z\` (ISO 8601 with time)
- \`?createdFrom=2024-08-15T09:00:00-05:00\` (with timezone offset)

### Default Date Filtering
For power output APIs, when no date range is specified (\`from\` or \`to\` parameters), the system automatically applies a **24-hour default filter** to prevent returning massive datasets:
- **Default behavior**: Returns data from the last 24 hours
- **To override**: Specify explicit \`from\` and/or \`to\` parameters
- **Example**: \`GET /api/1/windturbines/{id}/power-output\` returns last 24 hours
- **Custom range**: \`GET /api/1/windturbines/{id}/power-output?from=2024-08-01&to=2024-08-15\`

### Location Data
Wind turbine locations are specified using geographic coordinates:
- **Latitude**: Decimal degrees from -90 to 90 (negative for South, positive for North)
- **Longitude**: Decimal degrees from -180 to 180 (negative for West, positive for East)
- **Example**: \`{ "latitude": 55.6761, "longitude": 12.5683 }\` (Copenhagen, Denmark)

### Example API Calls
\`\`\`
# Simple date format
GET /api/1/windturbines?builtDateFrom=2020-01-01&builtDateTo=2023-12-31

# ISO 8601 with time and UTC timezone
GET /api/1/workorders?createdFrom=2024-08-15T09:00:00Z&createdTo=2024-08-15T17:00:00Z

# ISO 8601 with timezone offset (Pacific Time)
GET /api/1/workorders?createdFrom=2024-08-15T09:00:00-07:00

# Mixed filters with dates and other parameters
GET /api/1/windturbines?name=Wind&manufacturer=Vestas&active=true&installationDateFrom=2020-01-01T00:00:00Z
\`\`\`

## Pagination Guidelines

All listing APIs use consistent pagination with the following defaults:
- **Default limit**: 25 items per page
- **Maximum limit**: 100 items per page (requests above this are capped)
- **Default page**: Page 1 if not specified

**Examples:**
- \`GET /api/1/windturbines\` (returns 25 turbines, page 1)
- \`GET /api/1/windturbines?limit=50\` (returns 50 turbines, page 1)
- \`GET /api/1/windturbines?page=2&limit=25\` (returns page 2 with 25 turbines)
- \`GET /api/1/windturbines?limit=200\` (capped at 100 turbines maximum)`,
      contact: {
        name: 'API Support',
        email: 'joao.fernandes@c3.ai'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Wind Turbines',
        description: 'Wind turbine management operations'
      },
      {
        name: 'Work Orders',
        description: 'Work order and maintenance management'
      },
      {
        name: 'Analytics',
        description: 'System summary and analytics'
      },
      {
        name: 'Streaming',
        description: 'Real-time data streaming'
      }
    ],
    components: {
      schemas: {
        WindTurbine: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the wind turbine'
            },
            name: {
              type: 'string',
              description: 'Name of the wind turbine'
            },
            latitude: {
              type: 'number',
              format: 'float',
              minimum: -90,
              maximum: 90,
              description: 'Geographic latitude coordinate of the turbine location (-90 to 90)'
            },
            longitude: {
              type: 'number',
              format: 'float',
              minimum: -180,
              maximum: 180,
              description: 'Geographic longitude coordinate of the turbine location (-180 to 180)'
            },
            manufacturer: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the turbine manufacturer'
                },
                country: {
                  type: 'string',
                  description: 'Country where the manufacturer is based'
                }
              },
              description: 'Manufacturer information'
            },
            builtDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the turbine was manufactured'
            },
            installationDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the turbine was installed'
            },
            ratedCapacityKW: {
              type: 'number',
              description: 'Rated capacity in kilowatts'
            },
            active: {
              type: 'boolean',
              description: 'Whether the turbine is currently active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the record was created in the system'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the record was last updated in the system'
            }
          }
        },
        WorkOrder: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the work order'
            },
            windTurbineId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the associated wind turbine'
            },
            title: {
              type: 'string',
              description: 'Work order title'
            },
            description: {
              type: 'string',
              description: 'Detailed description of the work'
            },
            status: {
              type: 'string',
              enum: ['open', 'in_progress', 'completed', 'cancelled'],
              description: 'Current status of the work order'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Priority level of the work order'
            },
            assignedTo: {
              type: 'string',
              description: 'Person or team assigned to the work order'
            },
            createdDate: {
              type: 'string',
              format: 'date-time',
              description: 'When the work order was created'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'When the work order is due'
            },
            resolvedDate: {
              type: 'string',
              format: 'date-time',
              description: 'When the work order was resolved'
            }
          }
        },
        PowerOutput: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the power output record'
            },
            windTurbineId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the associated wind turbine'
            },
            powerKW: {
              type: 'number',
              description: 'Power output in kilowatts'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'When the power output was measured'
            }
          }
        },
        WorkOrderComment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the work order comment'
            },
            workOrderId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the associated work order'
            },
            userId: {
              type: 'string',
              description: 'ID of the user who created the comment'
            },
            content: {
              type: 'string',
              description: 'Content of the comment'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the comment was created'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the comment was last updated'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            },
            hasNext: {
              type: 'boolean',
              description: 'Whether there is a next page'
            },
            hasPrev: {
              type: 'boolean',
              description: 'Whether there is a previous page'
            }
          },
          description: 'Pagination metadata'
        }
      }
    },
    paths: {
      '/health': {
        get: {
          tags: ['System health'],
          summary: 'Health check endpoint',
          description: 'Returns the health status of the API',
          responses: {
            '200': {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'OK' },
                      timestamp: { type: 'string', format: 'date-time' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/1/windturbines': {
        get: {
          tags: ['Wind Turbines'],
          summary: 'List wind turbines',
          description: `Retrieve a list of wind turbines with optional filtering and pagination.

### Pagination
- **Default limit**: Returns up to 25 turbines per page if limit is not specified
- **Maximum limit**: 100 turbines per page maximum
- **Default page**: Page 1 if page is not specified

### Filter Examples:
- Find turbines by name: \`?name=Wind\`
- Filter by manufacturer: \`?manufacturer=Vestas\`
- Filter by date range: \`?builtDateFrom=2020-01-01&builtDateTo=2023-12-31\`
- Find active turbines: \`?active=true\`
- Combine filters: \`?manufacturer=Vestas&active=true&page=2&limit=10\`

### Date Format Notes:
All date parameters accept ISO 8601 format or simple date format:
- **ISO 8601**: \`2024-08-15T14:30:00Z\` (full datetime with UTC)
- **ISO 8601 with timezone**: \`2024-08-15T14:30:00-07:00\` (with timezone offset)
- **Simple date**: \`2024-08-15\` (date only, interpreted as start/end of day)
- **With milliseconds**: \`2024-08-15T14:30:00.123Z\``,
          parameters: [
            {
              name: 'name',
              in: 'query',
              description: 'Filter by turbine name (partial match, case-insensitive)',
              required: false,
              schema: { 
                type: 'string',
                example: 'Wind'
              }
            },
            {
              name: 'manufacturer',
              in: 'query',
              description: 'Filter by manufacturer name (partial match, case-insensitive)',
              required: false,
              schema: { 
                type: 'string',
                example: 'Vestas'
              }
            },
            {
              name: 'builtDateFrom',
              in: 'query',
              description: 'Filter turbines built on or after this date. Accepts ISO 8601 format (e.g., "2020-01-01T00:00:00Z") or simple date format (e.g., "2020-01-01")',
              required: false,
              schema: { 
                type: 'string',
                format: 'date',
                example: '2020-01-01'
              }
            },
            {
              name: 'builtDateTo',
              in: 'query',
              description: 'Filter turbines built on or before this date. Accepts ISO 8601 format (e.g., "2023-12-31T23:59:59Z") or simple date format (e.g., "2023-12-31")',
              required: false,
              schema: { 
                type: 'string',
                format: 'date',
                example: '2023-12-31'
              }
            },
            {
              name: 'installationDateFrom',
              in: 'query',
              description: 'Filter turbines installed on or after this date. Accepts ISO 8601 format (e.g., "2021-01-01T00:00:00Z") or simple date format (e.g., "2021-01-01")',
              required: false,
              schema: { 
                type: 'string',
                format: 'date',
                example: '2021-01-01'
              }
            },
            {
              name: 'installationDateTo',
              in: 'query',
              description: 'Filter turbines installed on or before this date. Accepts ISO 8601 format (e.g., "2024-12-31T23:59:59Z") or simple date format (e.g., "2024-12-31")',
              required: false,
              schema: { 
                type: 'string',
                format: 'date',
                example: '2024-12-31'
              }
            },
            {
              name: 'active',
              in: 'query',
              description: 'Filter by active status (true for active turbines, false for inactive)',
              required: false,
              schema: { 
                type: 'boolean',
                example: true
              }
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number for pagination',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Number of items per page. Defaults to 25 if not specified.',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 }
            }
          ],
          responses: {
            '200': {
              description: 'List of wind turbines',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/WindTurbine' }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          totalPages: { type: 'integer' },
                          total: { type: 'integer' },
                          hasNext: { type: 'boolean' },
                          hasPrev: { type: 'boolean' }
                        }
                      }
                    },
                    example: {
                      data: [
                        {
                          id: "123e4567-e89b-12d3-a456-426614174000",
                          name: "Wind Turbine Alpha",
                          latitude: 55.6761,
                          longitude: 12.5683,
                          manufacturer: {
                            name: "Vestas",
                            country: "Denmark"
                          },
                          builtDate: "2020-03-15T00:00:00Z",
                          installationDate: "2020-06-01T00:00:00Z",
                          ratedCapacityKW: 2500,
                          active: true,
                          createdAt: "2023-01-01T12:00:00Z",
                          updatedAt: "2023-06-15T14:30:00Z"
                        }
                      ],
                      pagination: {
                        page: 1,
                        limit: 20,
                        total: 45,
                        totalPages: 3,
                        hasNext: true,
                        hasPrev: false
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Wind Turbines'],
          summary: 'Create a new wind turbine',
          description: 'Create a new wind turbine in the system. Accepts either a single turbine object or an array of turbine objects.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      required: ['name', 'latitude', 'longitude', 'manufacturerName', 'manufacturerCountry', 'builtDate', 'installationDate', 'ratedCapacityKW'],
                      properties: {
                        name: { 
                          type: 'string', 
                          minLength: 1,
                          description: 'Unique name for the wind turbine'
                        },
                        latitude: { 
                          type: 'number', 
                          format: 'float',
                          minimum: -90,
                          maximum: 90,
                          description: 'Geographic latitude coordinate (-90 to 90)'
                        },
                        longitude: { 
                          type: 'number', 
                          format: 'float',
                          minimum: -180,
                          maximum: 180,
                          description: 'Geographic longitude coordinate (-180 to 180)'
                        },
                        manufacturerName: { 
                          type: 'string', 
                          minLength: 1,
                          description: 'Name of the turbine manufacturer'
                        },
                        manufacturerCountry: { 
                          type: 'string', 
                          minLength: 1,
                          description: 'Country where the manufacturer is based'
                        },
                        manufacturer: {
                          type: 'object',
                          description: 'Alternative format for manufacturer information (will be converted to manufacturerName and manufacturerCountry)',
                          properties: {
                            name: { type: 'string', description: 'Manufacturer name' },
                            country: { type: 'string', description: 'Manufacturer country' }
                          }
                        },
                        builtDate: { 
                          type: 'string', 
                          format: 'date-time',
                          description: 'Date when the turbine was manufactured (ISO 8601 format)'
                        },
                        installationDate: { 
                          type: 'string', 
                          format: 'date-time',
                          description: 'Date when the turbine was installed (ISO 8601 format)'
                        },
                        ratedCapacityKW: { 
                          type: 'number', 
                          minimum: 0,
                          description: 'Rated capacity in kilowatts'
                        },
                        active: { 
                          type: 'boolean', 
                          default: true,
                          description: 'Whether the turbine is currently active'
                        }
                      }
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['name', 'latitude', 'longitude', 'manufacturerName', 'manufacturerCountry', 'builtDate', 'installationDate', 'ratedCapacityKW'],
                        properties: {
                          name: { 
                            type: 'string', 
                            minLength: 1,
                            description: 'Unique name for the wind turbine'
                          },
                          latitude: { 
                            type: 'number', 
                            format: 'float',
                            minimum: -90,
                            maximum: 90,
                            description: 'Geographic latitude coordinate (-90 to 90)'
                          },
                          longitude: { 
                            type: 'number', 
                            format: 'float',
                            minimum: -180,
                            maximum: 180,
                            description: 'Geographic longitude coordinate (-180 to 180)'
                          },
                          manufacturerName: { 
                            type: 'string', 
                            minLength: 1,
                            description: 'Name of the turbine manufacturer'
                          },
                          manufacturerCountry: { 
                            type: 'string', 
                            minLength: 1,
                            description: 'Country where the manufacturer is based'
                          },
                          manufacturer: {
                            type: 'object',
                            description: 'Alternative format for manufacturer information',
                            properties: {
                              name: { type: 'string' },
                              country: { type: 'string' }
                            }
                          },
                          builtDate: { 
                            type: 'string', 
                            format: 'date-time',
                            description: 'Date when the turbine was manufactured'
                          },
                          installationDate: { 
                            type: 'string', 
                            format: 'date-time',
                            description: 'Date when the turbine was installed'
                          },
                          ratedCapacityKW: { 
                            type: 'number', 
                            minimum: 0,
                            description: 'Rated capacity in kilowatts'
                          },
                          active: { 
                            type: 'boolean', 
                            default: true,
                            description: 'Whether the turbine is currently active'
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Wind turbine created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WindTurbine' }
                }
              }
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/windturbines/{id}': {
        get: {
          tags: ['Wind Turbines'],
          summary: 'Get wind turbine by ID',
          description: 'Retrieve a specific wind turbine by its ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Wind turbine ID',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': {
              description: 'Wind turbine details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WindTurbine' }
                }
              }
            },
            '404': {
              description: 'Wind turbine not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        patch: {
          tags: ['Wind Turbines'],
          summary: 'Update wind turbine',
          description: 'Update an existing wind turbine',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Wind turbine ID',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    location: { type: 'string' },
                    ratedCapacityKW: { type: 'number', minimum: 0 },
                    active: { type: 'boolean' },
                    lastMaintenanceDate: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Wind turbine updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WindTurbine' }
                }
              }
            },
            '404': {
              description: 'Wind turbine not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        delete: {
          tags: ['Wind Turbines'],
          summary: 'Delete wind turbine',
          description: 'Delete a wind turbine from the system',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Wind turbine ID',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': {
              description: 'Wind turbine deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Wind turbine not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/windturbines/{id}/power-output': {
        get: {
          tags: ['Wind Turbines'],
          summary: 'Get power output history',
          description: `Retrieve historical power output data for a specific wind turbine with pagination support.

**Pagination Note:** Full pagination (page/limit) is available for raw data. When using aggregation, only limit is applied (no page parameter).

**Default Behavior:** If no date range is specified, returns data from the last 24 hours by default.`,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Wind turbine ID',
              schema: { type: 'string', format: 'uuid' }
            },
            {
              name: 'from',
              in: 'query',
              description: 'Start date for filtering (ISO 8601). If not specified, defaults to 24 hours ago.',
              required: false,
              schema: { type: 'string', format: 'date-time' }
            },
            {
              name: 'to',
              in: 'query',
              description: 'End date for filtering (ISO 8601). If not specified, defaults to current time.',
              required: false,
              schema: { type: 'string', format: 'date-time' }
            },
            {
              name: 'aggregation',
              in: 'query',
              description: 'Aggregation level for data. When specified, only limit parameter is used (no pagination).',
              required: false,
              schema: { type: 'string', enum: ['minute', 'hour', 'day'] }
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number for pagination (only used when aggregation is not specified)',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Maximum number of records to return',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 }
            }
          ],
          responses: {
            '200': {
              description: 'Power output data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      turbineId: { type: 'string', format: 'uuid' },
                      turbineName: { type: 'string' },
                      aggregation: { type: 'string' },
                      totalRecords: { type: 'integer' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/PowerOutput' }
                      },
                      pagination: {
                        allOf: [
                          { $ref: '#/components/schemas/PaginationMeta' },
                          {
                            description: 'Pagination metadata (only present when aggregation is not used)'
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Wind turbine not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        post: {
          tags: ['Wind Turbines'],
          summary: 'Submit power output reading',
          description: 'Submit a new power output reading for a specific wind turbine',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Wind turbine ID',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['powerKW'],
                  properties: {
                    powerKW: { type: 'number', minimum: 0 },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Power output recorded successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PowerOutput' }
                }
              }
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '404': {
              description: 'Wind turbine not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/workorders': {
        get: {
          tags: ['Work Orders'],
          summary: 'List work orders',
          description: `Retrieve a list of work orders with optional filtering and pagination.

### Filter Examples:
- Filter by turbine: \`?windTurbineId=123e4567-e89b-12d3-a456-426614174000\`
- Filter by status: \`?status=open\`
- Filter by creation date: \`?createdFrom=2024-01-01&createdTo=2024-12-31\`
- Include deleted: \`?includeDeleted=true\`
- Combine filters: \`?status=in_progress&createdFrom=2024-01-01&page=2\`

### Date Format Notes:
All date parameters accept ISO 8601 format or simple date format:
- **ISO 8601**: \`2024-08-15T14:30:00Z\` (full datetime with UTC)
- **ISO 8601 with timezone**: \`2024-08-15T14:30:00-07:00\` (with timezone offset)
- **Simple date**: \`2024-08-15\` (date only, interpreted as start/end of day)
- **With milliseconds**: \`2024-08-15T14:30:00.123Z\``,
          parameters: [
            {
              name: 'windTurbineId',
              in: 'query',
              description: 'Filter by wind turbine ID',
              required: false,
              schema: { 
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              }
            },
            {
              name: 'status',
              in: 'query',
              description: 'Filter by work order status',
              required: false,
              schema: { 
                type: 'string',
                enum: ['open', 'in_progress', 'closed'],
                example: 'open'
              }
            },
            {
              name: 'createdFrom',
              in: 'query',
              description: 'Filter work orders created on or after this date. Accepts ISO 8601 format (e.g., "2024-01-01T00:00:00Z") or simple date format (e.g., "2024-01-01")',
              required: false,
              schema: { 
                type: 'string',
                format: 'date',
                example: '2024-01-01'
              }
            },
            {
              name: 'createdTo',
              in: 'query',
              description: 'Filter work orders created on or before this date. Accepts ISO 8601 format (e.g., "2024-12-31T23:59:59Z") or simple date format (e.g., "2024-12-31")',
              required: false,
              schema: { 
                type: 'string',
                format: 'date',
                example: '2024-12-31'
              }
            },
            {
              name: 'resolvedFrom',
              in: 'query',
              description: 'Filter work orders resolved on or after this date. Accepts ISO 8601 format (e.g., "2024-01-01T00:00:00Z") or simple date format (e.g., "2024-01-01")',
              required: false,
              schema: { 
                type: 'string',
                format: 'date',
                example: '2024-01-01'
              }
            },
            {
              name: 'resolvedTo',
              in: 'query',
              description: 'Filter work orders resolved on or before this date. Accepts ISO 8601 format (e.g., "2024-12-31T23:59:59Z") or simple date format (e.g., "2024-12-31")',
              required: false,
              schema: { 
                type: 'string',
                format: 'date',
                example: '2024-12-31'
              }
            },
            {
              name: 'includeDeleted',
              in: 'query',
              description: 'Include soft-deleted work orders in the results',
              required: false,
              schema: { 
                type: 'boolean',
                default: false,
                example: false
              }
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number for pagination',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Number of items per page',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 }
            }
          ],
          responses: {
            '200': {
              description: 'List of work orders',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { 
                          allOf: [
                            { $ref: '#/components/schemas/WorkOrder' },
                            {
                              type: 'object',
                              properties: {
                                windTurbine: {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string' },
                                    active: { type: 'boolean' }
                                  }
                                }
                              }
                            }
                          ]
                        }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                          totalPages: { type: 'integer' },
                          hasNext: { type: 'boolean' },
                          hasPrev: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Work Orders'],
          summary: 'Create new work order(s)',
          description: 'Create one or more work orders. Accepts either a single work order object or an array of work order objects.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      required: ['windTurbineId', 'title'],
                      properties: {
                        windTurbineId: { 
                          type: 'string', 
                          format: 'uuid',
                          description: 'ID of the wind turbine this work order is for'
                        },
                        title: { 
                          type: 'string', 
                          minLength: 1,
                          description: 'Title of the work order'
                        },
                        description: { 
                          type: 'string',
                          description: 'Detailed description of the work to be done'
                        },
                        status: { 
                          type: 'string',
                          enum: ['open', 'in_progress', 'closed'],
                          default: 'open',
                          description: 'Status of the work order'
                        }
                      }
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['windTurbineId', 'title'],
                        properties: {
                          windTurbineId: { 
                            type: 'string', 
                            format: 'uuid',
                            description: 'ID of the wind turbine this work order is for'
                          },
                          title: { 
                            type: 'string', 
                            minLength: 1,
                            description: 'Title of the work order'
                          },
                          description: { 
                            type: 'string',
                            description: 'Detailed description of the work to be done'
                          },
                          status: { 
                            type: 'string',
                            enum: ['open', 'in_progress', 'closed'],
                            default: 'open',
                            description: 'Status of the work order'
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Work order(s) created successfully',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { 
                        allOf: [
                          { $ref: '#/components/schemas/WorkOrder' },
                          {
                            type: 'object',
                            properties: {
                              windTurbine: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string', format: 'uuid' },
                                  name: { type: 'string' },
                                  active: { type: 'boolean' }
                                }
                              }
                            }
                          }
                        ]
                      },
                      {
                        type: 'array',
                        items: { 
                          allOf: [
                            { $ref: '#/components/schemas/WorkOrder' },
                            {
                              type: 'object',
                              properties: {
                                windTurbine: {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string' },
                                    active: { type: 'boolean' }
                                  }
                                }
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/workorders/statistics': {
        get: {
          tags: ['Work Orders'],
          summary: 'Get work order statistics',
          description: `Retrieve aggregated statistics about work orders including status distribution, creation trends, and average resolution time.

### Filtering by Wind Turbines
You can optionally filter statistics to specific wind turbines by providing a comma-separated list of wind turbine IDs:

**Examples:**
- All work orders: \`GET /api/1/workorders/statistics\`
- Single turbine: \`GET /api/1/workorders/statistics?windTurbineIds=123e4567-e89b-12d3-a456-426614174000\`
- Multiple turbines: \`GET /api/1/workorders/statistics?windTurbineIds=123e4567-e89b-12d3-a456-426614174000,987fcdeb-51a2-43d1-9876-543210fedcba\``,
          parameters: [
            {
              name: 'windTurbineIds',
              in: 'query',
              description: 'Comma-separated list of wind turbine IDs to filter statistics. If not provided, includes all work orders.',
              required: false,
              schema: { 
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000,987fcdeb-51a2-43d1-9876-543210fedcba'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Work order statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      statusDistribution: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', enum: ['open', 'in_progress', 'closed'] },
                            count: { type: 'integer' }
                          }
                        },
                        description: 'Distribution of work orders by status'
                      },
                      creationTrends: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            date: { type: 'string', format: 'date' },
                            count: { type: 'integer' }
                          }
                        },
                        description: 'Work order creation trends over the last 30 days'
                      },
                      averageResolutionDays: {
                        type: 'number',
                        description: 'Average number of days to resolve work orders'
                      },
                      filteredTurbines: {
                        type: 'object',
                        description: 'Information about filtered wind turbines (only present when windTurbineIds parameter is used)',
                        properties: {
                          requestedIds: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of wind turbine IDs that were requested'
                          },
                          foundTurbines: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' }
                              }
                            },
                            description: 'Details of the wind turbines that were found'
                          },
                          totalRequested: {
                            type: 'integer',
                            description: 'Total number of wind turbine IDs requested'
                          },
                          totalFound: {
                            type: 'integer',
                            description: 'Total number of wind turbines found'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/1/workorders/{id}': {
        get: {
          tags: ['Work Orders'],
          summary: 'Get work order by ID',
          description: 'Retrieve a specific work order with associated wind turbine and comments data.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Work order ID',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': {
              description: 'Work order details',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/WorkOrder' },
                      {
                        type: 'object',
                        properties: {
                          windTurbine: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              name: { type: 'string' },
                              active: { type: 'boolean' },
                              latitude: { type: 'number' },
                              longitude: { type: 'number' }
                            }
                          },
                          comments: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/WorkOrderComment' }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
            '404': {
              description: 'Work order not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        patch: {
          tags: ['Work Orders'],
          summary: 'Update work order',
          description: 'Update work order properties. When status is changed to "closed", resolutionDate is automatically set. When changed from "closed" to another status, resolutionDate is cleared.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Work order ID',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { 
                      type: 'string',
                      description: 'Updated title'
                    },
                    description: { 
                      type: 'string',
                      description: 'Updated description'
                    },
                    status: { 
                      type: 'string',
                      enum: ['open', 'in_progress', 'closed'],
                      description: 'Updated status'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Work order updated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/WorkOrder' },
                      {
                        type: 'object',
                        properties: {
                          windTurbine: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              name: { type: 'string' },
                              active: { type: 'boolean' }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '404': {
              description: 'Work order not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        delete: {
          tags: ['Work Orders'],
          summary: 'Delete work order',
          description: 'Soft-delete a work order. The work order will be marked as deleted but not permanently removed from the database.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Work order ID',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '204': {
              description: 'Work order deleted successfully'
            },
            '404': {
              description: 'Work order not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/workorders/{id}/comments': {
        get: {
          tags: ['Work Orders'],
          summary: 'Get work order comments',
          description: 'Retrieve comments for a specific work order with pagination.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Work order ID',
              schema: { type: 'string', format: 'uuid' }
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number for pagination',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Number of items per page',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 }
            }
          ],
          responses: {
            '200': {
              description: 'Paginated list of work order comments',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/WorkOrderComment' }
                      },
                      pagination: { $ref: '#/components/schemas/PaginationMeta' }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Work order not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        post: {
          tags: ['Work Orders'],
          summary: 'Add comment to work order',
          description: 'Add a new comment to a specific work order.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Work order ID',
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId', 'content'],
                  properties: {
                    userId: { 
                      type: 'string',
                      description: 'ID of the user creating the comment'
                    },
                    content: { 
                      type: 'string',
                      minLength: 1,
                      description: 'Content of the comment'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Comment created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WorkOrderComment' }
                }
              }
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '404': {
              description: 'Work order not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/summary': {
        get: {
          tags: ['Analytics'],
          summary: 'Get system summary statistics',
          description: `Retrieve aggregate statistics for the entire wind turbine management system.

### Included Metrics:
- **Total and active turbine counts**
- **Work order statistics by status**
- **Average power output** (from last 24 hours)

This endpoint provides a high-level overview of system performance and workload.`,
          responses: {
            '200': {
              description: 'System summary statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalTurbines: {
                        type: 'integer',
                        description: 'Total number of wind turbines in the system',
                        example: 150
                      },
                      activeTurbines: {
                        type: 'integer',
                        description: 'Number of currently active wind turbines',
                        example: 147
                      },
                      totalWorkOrders: {
                        type: 'integer',
                        description: 'Total number of work orders (excluding deleted)',
                        example: 733
                      },
                      openWorkOrders: {
                        type: 'integer',
                        description: 'Number of open work orders',
                        example: 76
                      },
                      inProgressWorkOrders: {
                        type: 'integer',
                        description: 'Number of work orders currently in progress',
                        example: 166
                      },
                      avgPowerOutput: {
                        type: 'number',
                        format: 'float',
                        description: 'Average power output in kW from the last 24 hours',
                        example: 1606.33
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/summary/windturbines/{id}/workorders': {
        get: {
          tags: ['Analytics'],
          summary: 'Get work order analytics for specific turbine',
          description: `Retrieve summary statistics for work orders of a specific wind turbine.

### Included Analytics:
- **Work order count and status breakdown**
- **Average resolution time** for completed work orders

This endpoint provides summary statistics only. Use the dedicated work orders API endpoints to retrieve detailed work order data.`,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Wind turbine ID',
              schema: { 
                type: 'string', 
                format: 'uuid',
                example: '15b15704-891d-4c58-aafb-b934b836eb98'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Work order analytics for the specified turbine',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      turbineId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID of the wind turbine',
                        example: '15b15704-891d-4c58-aafb-b934b836eb98'
                      },
                      turbineName: {
                        type: 'string',
                        description: 'Name of the wind turbine',
                        example: 'Energy-Eagle-008'
                      },
                      totalWorkOrders: {
                        type: 'integer',
                        description: 'Total number of work orders for this turbine',
                        example: 5
                      },
                      statusBreakdown: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            status: {
                              type: 'string',
                              enum: ['open', 'in_progress', 'closed'],
                              description: 'Work order status'
                            },
                            count: {
                              type: 'integer',
                              description: 'Number of work orders with this status'
                            }
                          }
                        },
                        description: 'Breakdown of work orders by status',
                        example: [
                          { "status": "closed", "count": 5 },
                          { "status": "open", "count": 2 },
                          { "status": "in_progress", "count": 1 }
                        ]
                      },
                      averageResolutionDays: {
                        type: 'number',
                        format: 'float',
                        description: 'Average number of days to resolve work orders for this turbine',
                        example: 267.06
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Wind turbine not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/summary/debug/first-turbine': {
        get: {
          tags: ['Analytics'],
          summary: 'Get first turbine for testing',
          description: `Helper endpoint to get the first wind turbine ID and related test URLs.

**Note:** This is a debug/testing endpoint that provides convenient URLs for testing other API endpoints. It returns the first turbine alphabetically by name.`,
          responses: {
            '200': {
              description: 'First turbine information with test URLs',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID of the first wind turbine',
                        example: '15b15704-891d-4c58-aafb-b934b836eb98'
                      },
                      name: {
                        type: 'string',
                        description: 'Name of the first wind turbine',
                        example: 'Energy-Eagle-008'
                      },
                      testUrls: {
                        type: 'object',
                        properties: {
                          getTurbine: {
                            type: 'string',
                            description: 'URL to get this turbine details',
                            example: '/api/1/windturbines/15b15704-891d-4c58-aafb-b934b836eb98'
                          },
                          updateTurbine: {
                            type: 'string',
                            description: 'URL to update this turbine',
                            example: '/api/1/windturbines/15b15704-891d-4c58-aafb-b934b836eb98'
                          },
                          deleteTurbine: {
                            type: 'string',
                            description: 'URL to delete this turbine',
                            example: '/api/1/windturbines/15b15704-891d-4c58-aafb-b934b836eb98'
                          },
                          workOrderSummary: {
                            type: 'string',
                            description: 'URL to get work order analytics for this turbine',
                            example: '/api/1/summary/windturbines/15b15704-891d-4c58-aafb-b934b836eb98/workorders'
                          }
                        },
                        description: 'Convenient test URLs for this turbine'
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'No turbines found in the system',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'No turbines found'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/1/stream/power-output': {
        get: {
          tags: ['Streaming'],
          summary: 'Real-time power output stream (SSE)',
          description: `Establishes a Server-Sent Events (SSE) connection for real-time power output data from specific wind turbines.

### Usage
This endpoint streams live power output data for specified wind turbines. The connection remains open and continuously sends power data at the specified interval.

### Event Types
- **connected**: Initial connection confirmation
- **power-output**: Periodic power output data
- **error**: Error notifications

### Example Usage
\`\`\`javascript
const eventSource = new EventSource('/api/1/stream/power-output?windTurbineIds=123,456&interval=5');

eventSource.addEventListener('connected', (event) => {
  console.log('Connected:', JSON.parse(event.data));
});

eventSource.addEventListener('power-output', (event) => {
  const data = JSON.parse(event.data);
  console.log('Power data:', data.powerOutputs);
});
\`\`\`

### Server-Side Logging
The server logs connection events for monitoring:
- Connection established: \`SSE client {id} connected (interval: 10s, turbines: 2)\`
- Normal disconnect: \`SSE client {id} disconnected (duration: 45s, turbines: 2)\`
- Unexpected disconnect: \`SSE client {id} disconnected unexpectedly (duration: 15s, turbines: 2)\``,
          parameters: [
            {
              name: 'windTurbineIds',
              in: 'query',
              required: true,
              description: 'Comma-separated list of wind turbine IDs to monitor. This parameter is mandatory.',
              schema: {
                type: 'string',
                pattern: '^[a-f0-9\\-]+(,[a-f0-9\\-]+)*$',
                example: '15b15704-891d-4c58-aafb-b934b836eb98,567f7cb9-657b-4f68-9b6d-6240374cd143'
              }
            },
            {
              name: 'interval',
              in: 'query',
              required: false,
              description: 'Update interval in seconds (default: 10 seconds)',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 300,
                default: 10,
                example: 15
              }
            }
          ],
          responses: {
            '200': {
              description: 'Event stream established successfully',
              content: {
                'text/event-stream': {
                  schema: {
                    type: 'string',
                    description: 'Server-sent events containing real-time power data'
                  },
                  examples: {
                    connected: {
                      summary: 'Connection established event',
                      value: 'event: connected\ndata: {"connectionId":"1692123456789-abc123","message":"Connected to power output stream","interval":10,"turbineFilter":["123","456"],"turbineCount":2}\n\n'
                    },
                    powerOutput: {
                      summary: 'Power output data event',
                      value: 'event: power-output\ndata: {"timestamp":"2024-08-15T10:30:00.000Z","turbineCount":2,"powerOutputs":[{"turbineId":"123","turbineName":"Wind-001","powerKW":1250.5,"ratedCapacityKW":2000,"efficiency":62.53,"timestamp":"2024-08-15T10:30:00.000Z"}]}\n\n'
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Validation error - missing or invalid windTurbineIds parameter',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: [] // We're defining everything in the definition above
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };
