ALTER TABLE "projects" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;

UPDATE projects SET sort_order = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (
    ORDER BY
      CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 WHEN 'settling' THEN 2
        WHEN 'completed' THEN 3 WHEN 'discarded' THEN 4 END,
      contract_date ASC
  ) - 1 AS rn
  FROM projects WHERE deleted = false
) sub WHERE projects.id = sub.id;