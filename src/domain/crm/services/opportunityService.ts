import type {
  OpportunityInsert,
  OpportunityUpdate,
  OpportunityListParams,
  OpportunityListResult,
  OpportunityDTO,
} from "@/domain/crm/dtos/opportunity";
import { opportunityRepository } from "@/data/crm/opportunityRepository";
import { opportunitySchema } from "@/domain/crm/validation/opportunitySchema";
import { stageRuleService } from "@/domain/crm/services/stageRuleService";
import { crmNotificationService } from "@/domain/crm/services/crmNotificationService";
import { scoringRuleService } from "@/domain/crm/services/scoringRuleService";
import { activityLogService } from "@/domain/crm/services/activityLogService";
import { supabase } from "@/integrations/supabase/client";

const applyScoringForOpportunity = async (opportunity: OpportunityDTO) => {
  const rules = await scoringRuleService.listActive(opportunity.companyId);
  const total = rules.length
    ? scoringRuleService.computeScore(
        opportunity,
        rules.map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
          points: rule.points,
        }))
      )
    : 0;

  if (opportunity.scoreTotal === total && opportunity.scoreUpdatedAt) {
    return opportunity;
  }

  const now = new Date().toISOString();
  
  // Use optimistic locking with retry logic
  let maxRetries = 3;
  let retryCount = 0;
  let updated = null;

  while (retryCount < maxRetries) {
    updated = await opportunityRepository.updateWithOptimisticLocking(opportunity.id, {
      score_total: total,
      score_updated_at: now,
    }, opportunity.updatedAt);

    if (updated !== null) {
      // Update succeeded
      return { ...updated, scoreTotal: total, scoreUpdatedAt: now };
    }

    // Concurrent update detected, retry with fresh data
    retryCount++;
    if (retryCount < maxRetries) {
      const fresh = await opportunityRepository.getById(opportunity.id);
      opportunity = fresh;
      // Re-compute score with fresh data
      const freshTotal = rules.length
        ? scoringRuleService.computeScore(
            fresh,
            rules.map((rule) => ({
              field: rule.field,
              operator: rule.operator,
              value: rule.value,
              points: rule.points,
            }))
          )
        : 0;

      if (fresh.scoreTotal === freshTotal && fresh.scoreUpdatedAt) {
        return fresh;
      }
    }
  }

  // After max retries, do a final silent update without optimistic locking
  await opportunityRepository.updateSilently(opportunity.id, {
    score_total: total,
    score_updated_at: now,
  });
  
  return { ...opportunity, scoreTotal: total, scoreUpdatedAt: now };
};

export const opportunityService = {
  async list(params: OpportunityListParams): Promise<OpportunityListResult> {
    return opportunityRepository.list(params);
  },

  async getById(id: string) {
    return opportunityRepository.getById(id);
  },

  async create(values: OpportunityInsert) {
    opportunitySchema.parse({
      name: values.name,
      email: (values as any).email,
      phone: (values as any).phone,
      customer_id: values.customer_id || undefined,
      pipeline_id: values.pipeline_id || undefined,
      stage: values.stage || undefined,
      value: values.value ?? undefined,
      estimated_close_date: values.estimated_close_date || undefined,
      probability: values.probability ?? undefined,
      description: values.description || undefined,
      owner_id: values.owner_id || undefined,
      status: values.status || undefined,
      close_date: values.close_date || undefined,
      lost_reason: values.lost_reason || undefined,
      won_reason: values.won_reason || undefined,
      source: values.source || undefined,
      currency: values.currency || undefined,
      expected_revenue: values.expected_revenue ?? undefined,
      next_step: values.next_step || undefined,
      tags: values.tags || undefined,
      custom_fields: (values as any).custom_fields || undefined,
    });
    const created = await opportunityRepository.create(values);
    await stageRuleService.applyForOpportunity({
      companyId: created.companyId,
      pipelineId: created.pipelineId,
      stage: created.stage,
      opportunityId: created.id,
    });
    return applyScoringForOpportunity(created);
  },

  async update(id: string, values: OpportunityUpdate) {
    // Use optimistic locking with retry mechanism
    const maxRetries = 3;
    let retryCount = 0;
    let before = await opportunityRepository.getById(id);
    let updated = null;

    while (retryCount < maxRetries) {
      updated = await opportunityRepository.updateWithOptimisticLocking(id, values, before.updatedAt);
      
      if (updated !== null) {
        // Update succeeded, break retry loop
        break;
      }

      // Concurrent update detected, retry with fresh data
      retryCount++;
      if (retryCount < maxRetries) {
        before = await opportunityRepository.getById(id);
      }
    }

    // If all retries failed, do one final attempt without optimistic locking
    if (updated === null) {
      updated = await opportunityRepository.update(id, values);
    }

    before = before || (await opportunityRepository.getById(id));

    // Detect changed fields and build activity log entries
    const logEntries: Array<{ action: string; payload: Record<string, unknown> }> = [];

    if (values.name !== undefined && values.name !== before?.name) {
      logEntries.push({
        action: `Nombre cambiado de "${before?.name}" a "${values.name}"`,
        payload: { field: "name", from: before?.name, to: values.name },
      });
    }
    if (values.stage !== undefined && values.stage !== before?.stage) {
      logEntries.push({
        action: `Etapa cambiada de "${before?.stage ?? "-"}" a "${values.stage}"`,
        payload: { field: "stage", from: before?.stage, to: values.stage },
      });
    }
    if (values.status !== undefined && values.status !== before?.status) {
      logEntries.push({
        action: `Estado cambiado a "${values.status}"`,
        payload: { field: "status", from: before?.status, to: values.status },
      });
    }
    if (values.tags !== undefined) {
      const oldTags = JSON.stringify((before?.tags ?? []).slice().sort());
      const newTags = JSON.stringify((values.tags ?? []).slice().sort());
      if (oldTags !== newTags) {
        logEntries.push({
          action: `Tags actualizados`,
          payload: { field: "tags", from: before?.tags, to: values.tags },
        });
      }
    }
    if (values.value !== undefined && values.value !== before?.value) {
      logEntries.push({
        action: `Valor actualizado a ${values.value ?? "-"}`,
        payload: { field: "value", from: before?.value, to: values.value },
      });
    }
    if (values.owner_id !== undefined && values.owner_id !== before?.ownerId) {
      logEntries.push({
        action: `Responsable actualizado`,
        payload: { field: "owner_id", from: before?.ownerId, to: values.owner_id },
      });
    }
    if (values.estimated_close_date !== undefined && values.estimated_close_date !== before?.estimatedCloseDate) {
      logEntries.push({
        action: `Fecha de cierre estimada actualizada`,
        payload: { field: "estimated_close_date", from: before?.estimatedCloseDate, to: values.estimated_close_date },
      });
    }

    // Persist activity log entries (silently — don't break the update on log failure)
    if (logEntries.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return updated;

      const results = await Promise.allSettled(
        logEntries.map((entry) =>
          activityLogService.create({
            company_id: updated.companyId,
            opportunity_id: updated.id,
            action: entry.action,
            payload: entry.payload as any,
            created_by: user.id,
          })
        )
      );

      // Silently log failures (non-critical)
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        // Could send to error tracking service if needed
      }
    }

    // Notify on stage change
    if (values.stage && values.stage !== before?.stage) {
      await crmNotificationService.notify({
        companyId: updated.companyId,
        type: "crm_stage_changed",
        title: "Oportunidad cambió de etapa",
        message: `La oportunidad "${updated.name}" ahora está en ${updated.stage}.`,
        data: { opportunity_id: updated.id, stage: updated.stage },
        userIds: updated.ownerId ? [updated.ownerId] : undefined,
      });
    }

    if (values.stage || values.pipeline_id) {
      await stageRuleService.applyForOpportunity({
        companyId: updated.companyId,
        pipelineId: updated.pipelineId,
        stage: updated.stage,
        opportunityId: updated.id,
      });
    }
    return applyScoringForOpportunity(updated);
  },

  async remove(id: string) {
    return opportunityRepository.remove(id);
  },
};
