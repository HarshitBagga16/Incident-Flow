
import { Sequelize } from "sequelize";

const isTest = process.env.NODE_ENV === "test";

const databaseName = isTest
  ? "incidentflow_test"
  : process.env.DB_NAME;

const sequelize = new Sequelize(
  databaseName,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
