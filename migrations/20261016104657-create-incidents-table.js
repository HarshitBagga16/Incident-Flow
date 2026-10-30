
"use strict";

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("incidents", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      severity: {
        type: Sequelize.ENUM("low", "medium", "high", "critical"),
        allowNull: false,
        defaultValue: "medium",
      },

      status: {
        type: Sequelize.ENUM("open", "in_progress", "resolved"),
        allowNull: false,
        defaultValue: "open",
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
}

export async function down(queryInterface) {
    await queryInterface.dropTable("incidents");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_incidents_severity";'
    );

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_incidents_status";'
    );
}
