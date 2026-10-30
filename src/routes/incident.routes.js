import {Router} from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createIncidentSchema } from '../validators/incident.validator.js';
import { validateRegister } from '../middleware/validate.js';
import {createIncident , getIncidents , getIncidentById} from '../controllers/incident.controller.js';
import {updateIncidentSchema} from '../validators/incident.validator.js';
import { updateIncident } from "../controllers/incident.controller.js";
import { authorization } from "../middleware/authorize.middleware.js";
import { archiveIncident } from "../controllers/incident.controller.js";


const router = Router();


router.post("/",authenticateToken,validateRegister(createIncidentSchema),createIncident);
router.get("/", authenticateToken, getIncidents);
router.get("/:id", authenticateToken, getIncidentById);
router.patch("/:id",authenticateToken,validateRegister(updateIncidentSchema),updateIncident
);
router.delete("/:id", authenticateToken, archiveIncident);

export default router;