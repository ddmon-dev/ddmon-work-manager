import { Hono } from "hono";
import adminsRouter from "./admins";
import businessInfoRouter from "./business-info";
import clientsRouter from "./clients";
import dashboardRouter from "./dashboard";
import estimatesRouter from "./estimates";
import projectsRouter from "./projects";
import projectSchedulesRouter from "./project-schedules";
import revenueRouter from "./revenue";
import schedulesRouter from "./schedules";
import todosRouter from "./todos";
import mindnotesRouter from "./mindnotes";
import memosRouter from "./memos";
import type { AppVariables } from "../lib/types";

const api = new Hono<{ Variables: AppVariables }>();

api.route("/admins", adminsRouter);
api.route("/business-info", businessInfoRouter);
api.route("/clients", clientsRouter);
api.route("/dashboard", dashboardRouter);
api.route("/estimates", estimatesRouter);
api.route("/projects", projectsRouter);
api.route("/project-schedules", projectSchedulesRouter);
api.route("/revenue", revenueRouter);
api.route("/schedules", schedulesRouter);
api.route("/todos", todosRouter);
api.route("/mindnotes", mindnotesRouter);
api.route("/memos", memosRouter);

export default api;
