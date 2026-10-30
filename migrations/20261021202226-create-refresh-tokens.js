
"use strict";

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("refresh_tokens", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      tokenHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },

      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      revokedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
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

    await queryInterface.addIndex("refresh_tokens", ["userId"]);
  }

  export async function down(queryInterface) {
    await queryInterface.dropTable("refresh_tokens");
  };
