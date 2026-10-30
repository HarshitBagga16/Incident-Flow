
"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("users", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },

    name: {
      type: Sequelize.STRING(60),
      allowNull: false,
    },

    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    },

    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    role: {
      type: Sequelize.ENUM("admin", "engineer", "viewer"),
      allowNull: false,
      defaultValue: "engineer",
    },

    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },

    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });
}
export async function down(queryInterface) {
  await queryInterface.dropTable("users");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_users_role";'
  );
}
