# Wind Turbine Management Backend

This package mocks a realistic, industry-standard backend that exposes data for a Wind Turbine management use case. It has:

* A backend that serves both historical and live streaming data
* Historical seed data already loaded

## Quick start

```sh
npm install
npm start
```

Once you start the service the API docs will be available at:

```
http://localhost:3000/docs
```

The API docs should have everything you need to start building a front-end for this application.

## Data

The system includes realistic data:

* 150 wind turbines across various US locations
* Historical work orders and maintenance records
* 7 days of historical power output data
* Live streaming data for the windturbines. Like real streaming data, each sensor reading
  has a certain probability to read bad data (null, negative power output, power spike, ...)

Seed data is automatically generated on first run and preserved between restarts for faster subsequent startups.

To manage seed data

```sh
# Clear and regenerate all data
npm run seed:reset
# Clear data only (no regeneration)
npm run seed:clear
```
