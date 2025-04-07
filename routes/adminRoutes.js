import { Router } from "express";
import {
  approveCertification,
  assignHeadUser,
  deleteUserCompletely,
  getAllUsers,
  getPendingCertifications,
  getUserReportByAdmin,
} from "../controllers/adminController.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const adminRouter = Router();

adminRouter.get(
  "/all-users",
  (req, res, next) => {
    protectRoute(req, res, next, ["admin"]);
  },
  getAllUsers
);

adminRouter.get(
  "/certifications/pending",
  (req, res, next) => {
    protectRoute(req, res, next, ["admin"]);
  },
  getPendingCertifications
);

adminRouter.put(
  "/certifications/approve/:userId/:certId",
  (req, res, next) => {
    protectRoute(req, res, next, ["admin"]);
  },
  approveCertification
);
adminRouter.get(
  "/user-report/:userId",
  (req, res, next) => {
    protectRoute(req, res, next, ["admin"]);
  },
  getUserReportByAdmin
);
adminRouter.put(
  "/assign-head/:userId",
  (req, res, next) => {
    protectRoute(req, res, next, ["admin"]);
  },
  assignHeadUser
);

adminRouter.delete("/delete/:userId", protectRoute, deleteUserCompletely);


// getUserReportByAdmin
export default adminRouter;
