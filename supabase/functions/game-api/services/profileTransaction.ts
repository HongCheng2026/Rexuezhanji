type Json = Record<string, unknown>;
type Context = { userId: string; admin: any };

export function createProfileTransactionService(normalizeProfile: (input: any) => any) {
  function operationId(body: Json) {
    const value = String(body.operationId || "");
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ? value
      : crypto.randomUUID();
  }

  async function commit(
    ctx: Context,
    profile: any,
    revision: number,
    body: Json,
    action: string,
    gold = 0,
    energy = 0,
    payload: Json = {}
  ) {
    const normalized = normalizeProfile(profile);
    const { data, error } = await ctx.admin.rpc("commit_profile_operation", {
      p_user_id: ctx.userId,
      p_expected_revision: revision,
      p_profile: normalized,
      p_save_version: normalized.saveVersion,
      p_operation_id: operationId(body),
      p_action: action,
      p_delta_gold: Math.floor(Number(gold) || 0),
      p_delta_energy: Math.floor(Number(energy) || 0),
      p_payload: payload
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.profile) throw new Error("云端原子事务未返回存档。");
    return normalizeProfile(row.profile);
  }

  return { commit };
}
