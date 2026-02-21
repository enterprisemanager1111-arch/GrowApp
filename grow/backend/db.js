const { Pool } = require("pg");

// Local Postgres test DB
const db = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/growapp"
});

module.exports = { db };
