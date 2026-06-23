import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import notesRouter from "./notes";
import analyticsRouter from "./analytics";
import servicesRouter from "./services";
import leadsRouter from "./leads";
import accountingRouter from "./accounting";
import workflowTemplatesRouter from "./workflow-templates";
import projectMilestonesRouter from "./project-milestones";
import aiRouter from "./ai";
import paymentsRouter from "./payments";
import clientAccountsRouter from "./client-accounts";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(clientAccountsRouter);
router.use(projectsRouter);
router.use(notesRouter);
router.use(analyticsRouter);
router.use(servicesRouter);
router.use(leadsRouter);
router.use(accountingRouter);
router.use(workflowTemplatesRouter);
router.use(projectMilestonesRouter);
router.use(aiRouter);
router.use(paymentsRouter);
router.use(settingsRouter);

export default router;
