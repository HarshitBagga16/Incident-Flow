import User from "./User.js";
import Incident from "./Incident.js";

User.hasMany(Incident, {
  foreignKey: "userId",
  as: "incidents",
});

Incident.belongsTo(User, {
  foreignKey: "userId",
  as: "reporter",
});

export { User, Incident };
