import { supabase } from "@/integrations/supabase/client";
import { activityLogService } from "./activityLogService";
import type { ActivityLogInsert } from "@/domain/crm/dtos/activityLog";

interface BulkUpdateParams {
  companyId: string;
  opportunityIds: string[];
  updates: Record<string, any>;
  stage?: string;
  ownerId?: string;
  tags?: string[];
}

export const bulkOperationService = {
  /**
   * Bulk update opportunities with automatic activity logging
   * 
   * @param params - { companyId, opportunityIds, updates, stage?, ownerId?, tags? }
   * @returns { success, updated } count of updated opportunities
   * 
   * @example
   * await bulkOperationService.bulkUpdate({
   *   companyId: "company-123",
   *   opportunityIds: ["opp-1", "opp-2"],
   *   updates: { stage: "Propuesta", updated_at: new Date().toISOString() },
   *   stage: "Propuesta"
   * });
   */
  async bulkUpdate(params: BulkUpdateParams) {
    const { companyId, opportunityIds, updates, stage, ownerId, tags } = params;

    if (!opportunityIds.length) {
      throw new Error("No opportunities selected");
    }

    // 1. Get current state before update
    const { data: beforeData, error: beforeError } = await supabase
      .from("crm_opportunities")
      .select("id, stage, owner_id, tags")
      .eq("company_id", companyId)
      .in("id", opportunityIds);

    if (beforeError) {
      console.error("[BulkOp] Failed to fetch before state:", beforeError);
      throw new Error("No se pudieron obtener los valores actuales");
    }

    const beforeMap = Object.fromEntries((beforeData ?? []).map((o) => [o.id, o]));

    // 2. Update opportunities
    const { error: updateError } = await supabase
      .from("crm_opportunities")
      .update(updates)
      .eq("company_id", companyId)
      .in("id", opportunityIds);

    if (updateError) {
      console.error("[BulkOp] Update failed:", updateError);
      throw new Error("No se pudieron actualizar las oportunidades");
    }

    // 3. Build and log changes for each opportunity
    const logPromises = opportunityIds.map(async (oppId) => {
      const before = beforeMap[oppId];
      if (!before) return; // Skip if not found

      const actions: string[] = [];
      const payload: Record<string, any> = {};

      // Log stage change
      if (stage && before.stage !== stage) {
        actions.push(`Etapa: ${before.stage} → ${stage}`);
        payload.stage = { from: before.stage, to: stage };
      }

      // Log owner change
      if (ownerId && before.owner_id !== ownerId) {
        actions.push("Responsable actualizado");
        payload.owner_id = { from: before.owner_id, to: ownerId };
      }

      // Log tags change
      if (tags) {
        const oldTags = before.tags ?? [];
        const newTagsSorted = (tags ?? []).slice().sort();
        const oldTagsSorted = oldTags.slice().sort();
        if (JSON.stringify(oldTagsSorted) !== JSON.stringify(newTagsSorted)) {
          actions.push("Tags actualizados");
          payload.tags = { from: oldTags, to: tags };
        }
      }

      // Only create log entry if there are actual changes
      if (actions.length > 0) {
        const logEntry: ActivityLogInsert = {
          company_id: companyId,
          opportunity_id: oppId,
          action: actions.join(" | "),
          payload,
        };

        return activityLogService.create(logEntry);
      }
    });

    // 4. Execute all log inserts (don't fail main operation if logging fails)
    const results = await Promise.allSettled(logPromises.filter(Boolean));

    // Debug: Report any logging failures
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.warn(
        `[BulkOp] ${failures.length} activity logs failed to insert:`,
        failures.map((f) => (f as PromiseRejectedResult).reason?.message)
      );
      // Activity logs are non-critical, so we log but don't throw
    }

    return {
      success: true,
      updated: opportunityIds.length,
      logsCreated: results.filter((r) => r.status === "fulfilled").length,
    };
  },

  /**
   * Bulk delete opportunities with activity logging
   */
  async bulkDelete(params: { companyId: string; opportunityIds: string[] }) {
    const { companyId, opportunityIds } = params;

    if (!opportunityIds.length) {
      throw new Error("No opportunities selected");
    }

    // Verify all IDs belong to this company (security check)
    const { data: opportunities, error: fetchError } = await supabase
      .from("crm_opportunities")
      .select("id, name")
      .eq("company_id", companyId)
      .in("id", opportunityIds);

    if (fetchError) {
      console.error("[BulkOp] Verification fetch failed:", fetchError);
      throw new Error("No se pudieron verificar las oportunidades");
    }

    if ((opportunities ?? []).length !== opportunityIds.length) {
      throw new Error("Algunos IDs no pertenecen a tu empresa");
    }

    // Log deletion before deleting
    const deleteLogPromises = (opportunities ?? []).map((opp) =>
      activityLogService.create({
        company_id: companyId,
        opportunity_id: opp.id,
        action: "Oportunidad eliminada",
        payload: { name: opp.name, deleted_at: new Date().toISOString() },
      })
    );

    // Execute logging
    await Promise.allSettled(deleteLogPromises);

    // Now delete
    const { error: deleteError } = await supabase
      .from("crm_opportunities")
      .delete()
      .eq("company_id", companyId)
      .in("id", opportunityIds);

    if (deleteError) {
      console.error("[BulkOp] Delete failed:", deleteError);
      throw new Error("No se pudieron eliminar las oportunidades");
    }

    return {
      success: true,
      deleted: opportunityIds.length,
    };
  },
};
