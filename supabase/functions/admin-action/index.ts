import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = "742141189";
const ADMIN_USERNAME = "admin";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { username, password, action, payload } = body ?? {};
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Sai thông tin đăng nhập" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "login") {
      return json({ ok: true });
    }

    if (action === "stats") {
      const [u, b, o, r, s] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("offers").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("business_suggestions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return json({
        members: u.count ?? 0, businesses: b.count ?? 0, offers: o.count ?? 0,
        reviews: r.count ?? 0, pendingSuggestions: s.count ?? 0,
      });
    }

    if (action === "list") {
      const { table, filter } = payload;
      let q = supabase.from(table).select("*").order("created_at", { ascending: false });
      if (filter?.eq) for (const [k, v] of Object.entries(filter.eq)) q = q.eq(k, v as any);
      const { data, error } = await q;
      if (error) throw error;
      return json(data);
    }

    if (action === "update") {
      const { table, id, values } = payload;
      const { data, error } = await supabase.from(table).update(values).eq("id", id).select().single();
      if (error) throw error;
      return json(data);
    }

    if (action === "delete") {
      const { table, id } = payload;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "insert") {
      const { table, values } = payload;
      const { data, error } = await supabase.from(table).insert(values).select().single();
      if (error) throw error;
      return json(data);
    }

    if (action === "approve_suggestion") {
      const { id } = payload;
      const { data: sg, error: e1 } = await supabase.from("business_suggestions").select("*").eq("id", id).single();
      if (e1) throw e1;
      const { data: biz, error: e2 } = await supabase.from("businesses").insert({
        name: sg.name, category: sg.category, description: sg.description,
        phone: sg.contact_info, image_url: sg.image_url, status: "approved",
      }).select().single();
      if (e2) throw e2;
      await supabase.from("business_suggestions").update({ status: "approved" }).eq("id", id);
      return json(biz);
    }

    if (action === "delete_user") {
      const { id } = payload;
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
      return json({ ok: true });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
