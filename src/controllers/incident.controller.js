import Incident from "../models/Incident.js";
import { Op } from "sequelize";

export const createIncident = async (req, res, next) => {
  try {
    const { title, description, severity } = req.body;

    const incident = await Incident.create({
      title,
      description,
      severity,
      userId: Number(req.user.sub),
    });

    return res.status(201).json({
      success: true,
      message: "Incident created successfully",
      incident,
    });
  } catch (error) {
    return next(error);
  }
};



export const getIncidents = async (req, res, next) => {
  try {
    const {
      search,
      status,
      severity,
      page = "1",
      limit = "10",
    } = req.query;

    if (
      !/^\d+$/.test(page) ||
      !/^\d+$/.test(limit) ||
      Number(page) < 1 ||
      Number(limit) < 1 ||
      Number(limit) > 30
    ) {
      return res.status(400).json({
        success: false,
        message: "page must be >= 1 and limit must be between 1 and 30",
      });
    }

    const allowedStatuses = ["open", "in_progress", "resolved"];
    const allowedSeverities = ["low", "medium", "high", "critical"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter",
      });
    }

    if (severity && !allowedSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: "Invalid severity filter",
      });
    }

    if (search && search.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Search must be 150 characters or fewer",
      });
    }

    const where = {
      isArchived: false,
    };

    if (req.user.role !== "admin") {
      where.userId = Number(req.user.sub);
    }

    if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;

      where[Op.or] = [
        { title: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
      ];
    }

    const currentPage = Number(page);
    const pageSize = Number(limit);
    const offset = (currentPage - 1) * pageSize;

    const { count, rows: incidents } =
      await Incident.findAndCountAll({
        where,
        limit: pageSize,
        offset,
        order: [["createdAt", "DESC"]],
      });

    return res.status(200).json({
      success: true,
      count: incidents.length,
      pagination: {
        totalItems: count,
        currentPage,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
      incidents,
    });
  } catch (error) {
    return next(error);
  }
};




export const getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = { id,
      isArchived: false,
     };

    // Non-admin users can access only their own incidents.
    if (req.user.role !== "admin") {
      where.userId = Number(req.user.sub);
    }

    const incident = await Incident.findOne({ where });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    return res.status(200).json({
      success: true,
      incident,
    });
  } catch (error) {
    return next(error);
  }
};



export const updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, sub } = req.user;

    // Viewers can edit only these fields.
    const viewerAllowedFields = ["title", "description"];
    const requestedFields = Object.keys(req.body);

    if (
      role === "viewer" &&
      requestedFields.some(
        (field) => !viewerAllowedFields.includes(field)
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Viewers can only edit title and description",
      });
    }

    // Enforce ownership for non-admin users.
    const where = { id,
      isArchived: false,
     };

    if (role !== "admin") {
      where.userId = Number(sub);
    }

    const incident = await Incident.findOne({ where });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    await incident.update(req.body);

    return res.status(200).json({
      success: true,
      message: "Incident updated successfully",
      incident,
    });
  } catch (error) {
    return next(error);
  }
};



export const archiveIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, sub } = req.user;

    const where = {
      id,
      isArchived: false,
    };

    // Admin can archive any incident.
    // Engineers and viewers can archive only their own.
    if (role !== "admin") {
      where.userId = Number(sub);
    }

    const incident = await Incident.findOne({ where });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    await incident.update({ isArchived: true });

    return res.status(200).json({
      success: true,
      message: "Incident archived successfully",
    });
  } catch (error) {
    return next(error);
  }
};
