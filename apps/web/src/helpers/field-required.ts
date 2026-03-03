import { z } from "zod";

export function isFieldRequired(schema: z.ZodTypeAny, fieldName: string) {
  if (!(schema instanceof z.ZodObject)) {
    return false;
  }

  const field = schema.shape[fieldName as keyof typeof schema.shape];
  if (!field) {
    return false;
  }
  while (
    field._def.type === "optional" ||
    field._def.type === "default" ||
    field._def.type === "effects"
  ) {
    return false;
  }

  return true;
}
