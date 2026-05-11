import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import aiRouter from "./ai";
import securityRouter from "./security";
import deploymentsRouter from "./deployments";
import activityRouter from "./activity";
import sessionsRouter from "./sessions";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(aiRouter);
router.use(securityRouter);
router.use(deploymentsRouter);
router.use(activityRouter);
router.use(sessionsRouter);
router.use(adminRouter);

export default router;
