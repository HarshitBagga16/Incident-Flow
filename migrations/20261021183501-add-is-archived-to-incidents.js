"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("incidents", "isArchived", {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("incidents", "isArchived");
}
