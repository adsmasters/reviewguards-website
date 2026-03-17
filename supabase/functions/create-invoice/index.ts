import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PRICE_PER_REVIEW = 12900; // €129 in cents

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function stripeRequest(path: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  return res.json();
}

async function findOrCreateCustomer(email: string, name: string) {
  // Search for existing customer
  const searchRes = await fetch(
    `https://api.stripe.com/v1/customers/search?query=email:'${email}'`,
    { headers: { Authorization: `Bearer ${STRIPE_SECRET}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.data?.length > 0) return searchData.data[0].id;

  // Create new customer
  const customer = await stripeRequest("/customers", { email, name });
  return customer.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht authentifiziert");

    // Init Supabase with user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Nicht authentifiziert");

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get unbilled removed reviews
    const { data: unbilled } = await supabase
      .from("removed_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("billed", false);

    if (!unbilled || unbilled.length === 0) {
      return new Response(
        JSON.stringify({ error: "Keine unbezahlten Bewertungen vorhanden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quantity = unbilled.length;
    const companyName = profile?.company_name || profile?.brand_name || user.email;

    // 1. Find or create Stripe customer
    const customerId = await findOrCreateCustomer(user.email!, companyName);

    // 2. Create invoice items
    for (let i = 0; i < quantity; i++) {
      await stripeRequest("/invoiceitems", {
        customer: customerId,
        amount: PRICE_PER_REVIEW.toString(),
        currency: "eur",
        description: `Bewertungsentfernung #${i + 1} – ${unbilled[i].review_title?.substring(0, 50) || "Review"}`,
      });
    }

    // 3. Create and finalize invoice
    const invoice = await stripeRequest("/invoices", {
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: "14",
      auto_advance: "true",
    });

    // 4. Finalize invoice (sends email automatically)
    const finalized = await stripeRequest(`/invoices/${invoice.id}/finalize`, {});

    // 5. Send invoice email
    await stripeRequest(`/invoices/${invoice.id}/send`, {});

    // 6. Mark reviews as billed
    const unbilledIds = unbilled.map((r: any) => r.id);
    await supabase
      .from("removed_reviews")
      .update({ billed: true })
      .in("id", unbilledIds);

    // 7. Save invoice to our database
    await supabase.from("invoices").insert({
      user_id: user.id,
      invoice_number: finalized.number || finalized.id,
      amount: (quantity * PRICE_PER_REVIEW) / 100,
      status: "offen",
      stripe_invoice_url: finalized.hosted_invoice_url || "",
      created_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: finalized.id,
        invoice_number: finalized.number,
        invoice_url: finalized.hosted_invoice_url,
        amount: quantity * PRICE_PER_REVIEW / 100,
        quantity,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
