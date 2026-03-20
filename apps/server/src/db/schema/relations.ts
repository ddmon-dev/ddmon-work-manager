import { relations } from "drizzle-orm";
import { clients, clientMemos } from "./clients";
import { partners, partnerMemos, projectPartners } from "./partners";
import {
  estimateSeries,
  estimates,
  estimateItemGroups,
  estimateItems,
} from "./estimates";
import { projects, projectInvoices, projectCollections, projectMemos, projectExpenses, partnerPayments } from "./projects";
import { projectScheduleLanes, projectSchedules } from "./project-schedules";
import { todos, todoTimeBlocks } from "./todos";
import { mindnotes } from "./mindnotes";
import { memos } from "./memos";
import { libraryBoards, libraryDocuments } from "./library";
import { files } from "./files";
import { clientEnvironments, clientEnvironmentMemos } from "./client-environments";

export const clientsRelations = relations(clients, ({ many }) => ({
  memos: many(clientMemos),
  estimates: many(estimates),
  projects: many(projects),
  environments: many(clientEnvironments),
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
  invoices: many(projectInvoices),
  collections: many(projectCollections),
  expenses: many(projectExpenses),
  partnerPayments: many(partnerPayments),
  memos: many(projectMemos),
  projectSchedules: many(projectSchedules),
  lanes: many(projectScheduleLanes),
  projectPartners: many(projectPartners),
}));

export const projectInvoicesRelations = relations(
  projectInvoices,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectInvoices.projectId],
      references: [projects.id],
    }),
    collections: many(projectCollections),
  })
);

export const projectCollectionsRelations = relations(
  projectCollections,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectCollections.projectId],
      references: [projects.id],
    }),
    invoice: one(projectInvoices, {
      fields: [projectCollections.invoiceId],
      references: [projectInvoices.id],
    }),
  })
);

export const projectMemosRelations = relations(projectMemos, ({ one }) => ({
  project: one(projects, {
    fields: [projectMemos.parentId],
    references: [projects.id],
  }),
}));

export const projectExpensesRelations = relations(projectExpenses, ({ one }) => ({
  project: one(projects, {
    fields: [projectExpenses.projectId],
    references: [projects.id],
  }),
}));

export const partnerPaymentsRelations = relations(partnerPayments, ({ one }) => ({
  project: one(projects, {
    fields: [partnerPayments.projectId],
    references: [projects.id],
  }),
  partner: one(partners, {
    fields: [partnerPayments.partnerId],
    references: [partners.id],
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

export const libraryBoardsRelations = relations(libraryBoards, ({ many }) => ({
  documents: many(libraryDocuments),
}));

export const libraryDocumentsRelations = relations(libraryDocuments, ({ one }) => ({
  board: one(libraryBoards, {
    fields: [libraryDocuments.boardId],
    references: [libraryBoards.id],
  }),
}));

export const partnersRelations = relations(partners, ({ many }) => ({
  memos: many(partnerMemos),
  projectPartners: many(projectPartners),
  partnerPayments: many(partnerPayments),
}));

export const partnerMemosRelations = relations(partnerMemos, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerMemos.parentId],
    references: [partners.id],
  }),
}));

export const projectPartnersRelations = relations(projectPartners, ({ one }) => ({
  project: one(projects, {
    fields: [projectPartners.projectId],
    references: [projects.id],
  }),
  partner: one(partners, {
    fields: [projectPartners.partnerId],
    references: [partners.id],
  }),
}));

export const clientEnvironmentsRelations = relations(clientEnvironments, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientEnvironments.clientId],
    references: [clients.id],
  }),
  memos: many(clientEnvironmentMemos),
}));

export const clientEnvironmentMemosRelations = relations(clientEnvironmentMemos, ({ one }) => ({
  environment: one(clientEnvironments, {
    fields: [clientEnvironmentMemos.parentId],
    references: [clientEnvironments.id],
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  parent: one(files, {
    fields: [files.folderId],
    references: [files.id],
    relationName: "folderChildren",
  }),
  children: many(files, { relationName: "folderChildren" }),
}));
