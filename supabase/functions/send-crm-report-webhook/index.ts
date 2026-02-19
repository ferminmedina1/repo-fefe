// @ts-nocheck - Deno Edge Function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { DateTime } from "https://esm.sh/luxon@3.5.0";
import { corsHeaders } from "../_shared/cors.ts";

interface ReportRequest {
  scheduleId?: string;
}

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

type OpportunityRow = {
  id: string;
  name: string | null;
  value: number | null;
  stage: string | null;
  status: string | null;
  pipeline_id: string | null;
  owner_id: string | null;
  created_at: string;
  close_date: string | null;
  source: string | null;
  tags: string[] | null;
};

const normalize = (value?: string | null) => (value ?? "").trim().toLowerCase();
const isWon = (status?: string | null, stage?: string | null) => {
  const s = normalize(status);
  const st = normalize(stage);
  return s.includes("ganad") || s.includes("won") || st.includes("ganad");
};
const isLost = (status?: string | null, stage?: string | null) => {
  const s = normalize(status);
  const st = normalize(stage);
  return s.includes("perdid") || s.includes("lost") || st.includes("perdid");
};

const getRange = (frequency: Frequency, timezone: string) => {
  const now = DateTime.now().setZone(timezone);
  if (frequency === "daily") {
    return { start: now.startOf("day"), end: now.endOf("day") };
  }
  if (frequency === "weekly") {
    return { start: now.startOf("week"), end: now.endOf("week") };
  }
  if (frequency === "monthly") {
    return { start: now.startOf("month"), end: now.endOf("month") };
  }
  return { start: now.startOf("year"), end: now.endOf("year") };
};

const computeNextRun = (frequency: Frequency, timezone: string, sendTime: string) => {
  const now = DateTime.now().setZone(timezone);
  const [h, m, s] = sendTime.split(":").map((v) => Number(v));
  let base = now.set({ hour: h || 0, minute: m || 0, second: s || 0, millisecond: 0 });
  if (base <= now) {
    if (frequency === "daily") base = base.plus({ days: 1 });
    if (frequency === "weekly") base = base.plus({ weeks: 1 });
    if (frequency === "monthly") base = base.plus({ months: 1 });
    if (frequency === "yearly") base = base.plus({ years: 1 });
  }
  return base.toUTC().toISO();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const webhookUrl = Deno.env.get("CRM_REPORTS_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("CRM_REPORTS_WEBHOOK_URL no configurado");
    }

    const body = (await req.json().catch(() => ({}))) as ReportRequest;

    const { data: schedules, error: schedulesError } = body.scheduleId
      ? await supabaseClient
          .from("crm_report_schedules")
          .select("*")
          .eq("id", body.scheduleId)
      : await supabaseClient
          .from("crm_report_schedules")
          .select("*")
          .eq("enabled", true)
          .or("next_run_at.is.null,next_run_at.lte.now()");

    if (schedulesError) throw schedulesError;
    if (!schedules?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let processed = 0;
    for (const schedule of schedules) {
      const frequency = schedule.frequency as Frequency;
      const timezone = schedule.timezone || "UTC";
      const sendTime = schedule.send_time || "09:00:00";
      const payloadMode = schedule.payload_mode || "full";

      const { start, end } = getRange(frequency, timezone);

      const { data: opportunities, error: oppError } = await supabaseClient
        .from("crm_opportunities")
        .select("id, name, value, stage, status, pipeline_id, owner_id, created_at, close_date, source, tags")
        .eq("company_id", schedule.company_id)
        .gte("created_at", start.toUTC().toISO())
        .lte("created_at", end.toUTC().toISO());

      if (oppError) throw oppError;
      const rows = (opportunities ?? []) as OpportunityRow[];

      const totalCount = rows.length;
      const totalValue = rows.reduce((sum, opp) => sum + (Number(opp.value) || 0), 0);
      const averageValue = totalCount ? totalValue / totalCount : 0;
      const wonOpps = rows.filter((opp) => isWon(opp.status, opp.stage));
      const lostOpps = rows.filter((opp) => isLost(opp.status, opp.stage));
      const wonCount = wonOpps.length;
      const lostCount = lostOpps.length;
      const closedCount = wonCount + lostCount;
      const winRate = closedCount ? (wonCount / closedCount) * 100 : 0;

      const byStage: Record<string, { stage: string; count: number; value: number }> = {};
      const byStatus: Record<string, { status: string; count: number; value: number }> = {};
      const byPipeline: Record<string, { pipeline_id: string; count: number; value: number }> = {};
      const byOwner: Record<string, { owner_id: string; count: number; value: number; won: number; lost: number }> = {};
      const bySource: Record<string, { source: string; count: number; value: number }> = {};
      const byTag: Record<string, { tag: string; count: number; value: number }> = {};

      for (const opp of rows) {
        const value = Number(opp.value) || 0;
        if (opp.stage) {
          byStage[opp.stage] = byStage[opp.stage] || { stage: opp.stage, count: 0, value: 0 };
          byStage[opp.stage].count += 1;
          byStage[opp.stage].value += value;
        }
        if (opp.status) {
          byStatus[opp.status] = byStatus[opp.status] || { status: opp.status, count: 0, value: 0 };
          byStatus[opp.status].count += 1;
          byStatus[opp.status].value += value;
        }
        if (opp.pipeline_id) {
          byPipeline[opp.pipeline_id] = byPipeline[opp.pipeline_id] || { pipeline_id: opp.pipeline_id, count: 0, value: 0 };
          byPipeline[opp.pipeline_id].count += 1;
          byPipeline[opp.pipeline_id].value += value;
        }
        if (opp.owner_id) {
          byOwner[opp.owner_id] = byOwner[opp.owner_id] || { owner_id: opp.owner_id, count: 0, value: 0, won: 0, lost: 0 };
          byOwner[opp.owner_id].count += 1;
          byOwner[opp.owner_id].value += value;
          if (isWon(opp.status, opp.stage)) byOwner[opp.owner_id].won += 1;
          if (isLost(opp.status, opp.stage)) byOwner[opp.owner_id].lost += 1;
        }
        if (opp.source) {
          bySource[opp.source] = bySource[opp.source] || { source: opp.source, count: 0, value: 0 };
          bySource[opp.source].count += 1;
          bySource[opp.source].value += value;
        }
        if (opp.tags?.length) {
          for (const tag of opp.tags) {
            if (!tag) continue;
            byTag[tag] = byTag[tag] || { tag, count: 0, value: 0 };
            byTag[tag].count += 1;
            byTag[tag].value += value;
          }
        }
      }

      const limitTop = payloadMode === "summary" ? 5 : 10;
      const topOpportunities = [...rows]
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
        .slice(0, limitTop)
        .map((opp) => ({
          id: opp.id,
          name: opp.name,
          value: opp.value,
          stage: opp.stage,
          status: opp.status,
          owner_id: opp.owner_id,
          created_at: opp.created_at,
        }));

      const topWon = [...wonOpps]
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
        .slice(0, limitTop)
        .map((opp) => ({ id: opp.id, name: opp.name, value: opp.value, close_date: opp.close_date }));

      const topLost = [...lostOpps]
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
        .slice(0, limitTop)
        .map((opp) => ({ id: opp.id, name: opp.name, value: opp.value }));

      const recentOpportunities = [...rows]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limitTop)
        .map((opp) => ({
          id: opp.id,
          name: opp.name,
          value: opp.value,
          stage: opp.stage,
          status: opp.status,
          created_at: opp.created_at,
        }));

      const payload = {
        meta: {
          company_id: schedule.company_id,
          frequency,
          timezone,
          period: { start: start.toISO(), end: end.toISO() },
          generated_at: DateTime.now().toUTC().toISO(),
          recipients: schedule.recipients ?? [],
        },
        kpis: {
          opportunities_total: totalCount,
          opportunities_value_total: totalValue,
          opportunities_value_avg: averageValue,
          win_rate: winRate,
          won_count: wonCount,
          lost_count: lostCount,
          open_count: totalCount - closedCount,
        },
        series: {
          by_stage: Object.values(byStage),
          by_status: Object.values(byStatus),
          by_pipeline: Object.values(byPipeline),
          by_owner: Object.values(byOwner).map((row) => ({
            ...row,
            win_rate: row.won + row.lost ? (row.won / (row.won + row.lost)) * 100 : 0,
          })),
          by_source: Object.values(bySource),
          by_tag: Object.values(byTag),
        },
        top: {
          top_opportunities: topOpportunities,
          top_won: topWon,
          top_lost: topLost,
        },
        recent: payloadMode === "summary" ? undefined : {
          recent_opportunities: recentOpportunities,
        },
      };

      const runInsert = await supabaseClient
        .from("crm_report_runs")
        .insert({
          company_id: schedule.company_id,
          schedule_id: schedule.id,
          period_start: start.toUTC().toISO(),
          period_end: end.toUTC().toISO(),
          status: "pending",
        })
        .select("id")
        .single();

      const runId = runInsert.data?.id;

      let responseCode = 0;
      let responseBody = "";
      let status: "success" | "error" = "success";

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        responseCode = res.status;
        responseBody = await res.text();
        if (!res.ok) status = "error";
      } catch (error: any) {
        status = "error";
        responseBody = error?.message ?? "Webhook error";
      }

      if (runId) {
        await supabaseClient
          .from("crm_report_runs")
          .update({ status, response_code: responseCode, response_body: responseBody })
          .eq("id", runId);
      }

      await supabaseClient
        .from("crm_report_schedules")
        .update({
          last_run_at: DateTime.now().toUTC().toISO(),
          next_run_at: computeNextRun(frequency, timezone, sendTime),
        })
        .eq("id", schedule.id);

      processed += 1;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
