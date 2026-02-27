import { Hono } from "hono";
import clientsRouter from "./clients";
import estimatesRouter from "./estimates";
import projectsRouter from "./projects";
import schedulesRouter from "./schedules";
import todosRouter from "./todos";
import type { AppVariables } from "../lib/types";

const api = new Hono<{ Variables: AppVariables }>();

api.route("/clients", clientsRouter);
api.route("/estimates", estimatesRouter);
api.route("/projects", projectsRouter);
api.route("/schedules", schedulesRouter);
api.route("/todos", todosRouter);

export default api;
