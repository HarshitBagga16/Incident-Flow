
"use strict";

export async function up(queryInterface, Sequelize) {
    await queryInterface.addColumn("refresh_tokens", "familyId", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addIndex("refresh_tokens", ["familyId"]);
  }

  export async function down(queryInterface) {
    await queryInterface.removeIndex(
      "refresh_tokens",
      ["familyId"]
    );
    await queryInterface.removeColumn("refresh_tokens", "familyId")
  }
