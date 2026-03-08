import { relations } from "drizzle-orm";
import { clients, clientMemos } from "./clients";
import {
  estimateSeries,
  estimates,
  estimateItemGroups,
  estimateItems,
} from "./estimates";
import { projects, projectPayments, projectMemos } from "./projects";
import { projectScheduleLanes, projectSchedules } from "./project-schedules";
import { schedules } from "./schedules";
import { todos, todoTimeBlocks } from "./todos";
import { mindnotes } from "./mindnotes";
import { memos } from "./memos";

export const clientsRelations = relations(clients, ({ many }) => ({
  memos: many(clientMemos),
  estimates: many(estimates),
  projects: many(projects),
  schedules: many(schedules),
}));

export const clientMemosRelations = relations(clientMemos, ({ one }) => ({
  client: one(clients, {
    fields: [clientMemos.parentId],
    references: [clients.id],
  }),
}));

export const estimateSeriesRelations = relations(
  estimateSeries,
  ({ many, one }) => ({
    estimates: many(estimates, { relationName: "seriesEstimates" }),
    finalEstimate: one(estimates, {
      fields: [estimateSeries.finalEstimateId],
      references: [estimates.id],
      relationName: "seriesFinalEstimate",
    }),
  })
);

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  client: one(clients, {
    fields: [estimates.clientId],
    references: [clients.id],
  }),
  series: one(estimateSeries, {
    fields: [estimates.estimateNumber],
    references: [estimateSeries.estimateNumber],
    relationName: "seriesEstimates",
  }),
  groups: many(estimateItemGroups),
  finalOfSeries: many(estimateSeries, { relationName: "seriesFinalEstimate" }),
}));

export const estimateItemGroupsRelations = relations(
  estimateItemGroups,
  ({ one, many }) => ({
    estimate: one(estimates, {
      fields: [estimateItemGroups.estimateId],
      references: [estimates.id],
    }),
    items: many(estimateItems),
  })
);

export const estimateItemsRelations = relations(estimateItems, ({ one }) => ({
  group: one(estimateItemGroups, {
    fields: [estimateItems.groupId],
    references: [estimateItemGroups.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  estimateSeries: one(estimateSeries, {
    fields: [projects.estimateNumber],
    references: [estimateSeries.estimateNumber],
  }),
  payments: many(projectPayments),
  memos: many(projectMemos),
  schedules: many(schedules),
  projectSchedules: many(projectSchedules),
  lanes: many(projectScheduleLanes),
}));

export const projectPaymentsRelations = relations(
  projectPayments,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectPayments.projectId],
      references: [projects.id],
    }),
  })
);

export const projectMemosRelations = relations(projectMemos, ({ one }) => ({
  project: one(projects, {
    fields: [projectMemos.parentId],
    references: [projects.id],
  }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  client: one(clients, {
    fields: [schedules.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [schedules.projectId],
    references: [projects.id],
  }),
}));

export const todosRelations = relations(todos, ({ many }) => ({
  timeBlocks: many(todoTimeBlocks),
}));

export const todoTimeBlocksRelations = relations(todoTimeBlocks, ({ one }) => ({
  todo: one(todos, {
    fields: [todoTimeBlocks.todoId],
    references: [todos.id],
  }),
}));

export const mindnotesRelations = relations(mindnotes, () => ({}));

export const projectScheduleLanesRelations = relations(projectScheduleLanes, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectScheduleLanes.projectId],
    references: [projects.id],
  }),
  schedules: many(projectSchedules),
}));

export const projectSchedulesRelations = relations(projectSchedules, ({ one }) => ({
  project: one(projects, {
    fields: [projectSchedules.projectId],
    references: [projects.id],
  }),
  lane: one(projectScheduleLanes, {
    fields: [projectSchedules.laneId],
    references: [projectScheduleLanes.id],
  }),
}));

export const memosRelations = relations(memos, () => ({}));
