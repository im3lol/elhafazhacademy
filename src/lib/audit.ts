import { sql } from "@/lib/db";

type Executor = Pick<typeof sql, never> & ((...args: never[]) => unknown);

/** يسجّل حدثاً في audit_logs. يقبل tx اختيارياً لاستخدامه داخل معاملة. */
export async function logAudit(
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string | null = null,
  value?: unknown,
  db: Executor = sql as unknown as Executor,
): Promise<void> {
  const exec = db as unknown as typeof sql;
  await exec`
    insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
    values (${actorUserId}, ${action}, ${entityType}, ${entityId},
            ${value === undefined ? null : sql.json(value as never)})`;
}
