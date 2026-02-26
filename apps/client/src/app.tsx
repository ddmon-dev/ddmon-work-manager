import { formatDate } from "@work-manager/utils";
import type { Example } from "@work-manager/types";
import { exampleSchema } from "@work-manager/schemas";

export function App() {
  const example: Example = { id: "1", name: "Work Manager" };
  const parsed = exampleSchema.parse(example);

  return (
    <div>
      <h1>Work Manager</h1>
      <p>{formatDate(new Date())}</p>
      <p>{parsed.name}</p>
    </div>
  );
}
