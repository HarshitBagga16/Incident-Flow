
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Incident = sequelize.define(
  "Incident",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Incident title is required",
        },
        len: {
          args: [5, 150],
          msg: "Title must be between 5 and 150 characters",
        },
      },
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Incident description is required",
        },
        len: {
          args: [10, 5000],
          msg: "Description must be between 10 and 5000 characters",
        },
      },
    },

    severity: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      allowNull: false,
      defaultValue: "medium",
    },

    status: {
      type: DataTypes.ENUM("open", "in_progress", "resolved"),
      allowNull: false,
      defaultValue: "open",
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "incidents",
    timestamps: true,
  }
);

export default Incident;
