import { Hono } from "hono";
import adminsRouter from "./admins";
import clientsRouter from "./clients";
import dashboardRouter from "./dashboard";
import estimatesRouter from "./estimates";
import projectsRouter from "./projects";
import revenueRouter from "./revenue";
import schedulesRouter from "./schedules";
import todosRouter from "./todos";
import type { AppVariables } from "../lib/types";

const api = new Hono<{ Variables: AppVariables }>();

api.route("/admins", adminsRouter);
api.route("/clients", clientsRouter);
api.route("/dashboard", dashboardRouter);
api.route("/estimates", estimatesRouter);
api.route("/projects", projectsRouter);
api.route("/revenue", revenueRouter);
api.route("/schedules", schedulesRouter);
api.route("/todos", todosRouter);

export default api;
