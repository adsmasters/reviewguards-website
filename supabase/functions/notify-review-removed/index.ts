import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "ReviewGuards <noreply@reviewguards.de>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, customer_name, review_title, review_rating, asin, product_name } = await req.json();

    if (!user_id) throw new Error("Keine User-ID");

    // Resolve customer email from auth.users via service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user } } = await supabase.auth.admin.getUserById(user_id);
    const customer_email = user?.email;
    if (!customer_email) throw new Error("Kunden-Email nicht gefunden");

    const stars = "★".repeat(review_rating) + "☆".repeat(5 - review_rating);

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f6ff;padding:24px;">
        <div style="background:#0d1117;padding:24px 28px;border-radius:12px 12px 0 0;text-align:center;">
          <span style="font-weight:900;font-size:22px;color:#fff;">Review<span style="color:#3551FF;">Guards</span></span>
        </div>
        <div style="background:#fff;padding:32px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <div style="text-align:center;margin-bottom:20px;">
            <div style="display:inline-block;width:56px;height:56px;background:#dcfce7;border-radius:50%;line-height:56px;font-size:28px;">✓</div>
          </div>

          <h2 style="font-size:20px;font-weight:800;color:#111;margin-bottom:8px;text-align:center;">Bewertung erfolgreich entfernt!</h2>
          <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:24px;text-align:center;">
            Hallo ${customer_name || 'Kunde'}, wir haben eine Bewertung für dich erfolgreich entfernen lassen.
          </p>

          <div style="background:#f5f6ff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:24px;">
            <table style="width:100%;font-size:14px;">
              <tr>
                <td style="padding:4px 0;color:#666;width:120px;">Produkt:</td>
                <td style="padding:4px 0;font-weight:700;">${product_name || asin}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#666;">ASIN:</td>
                <td style="padding:4px 0;font-family:monospace;">${asin || '–'}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#666;">Bewertung:</td>
                <td style="padding:4px 0;color:#f59e0b;">${stars}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#666;">Titel:</td>
                <td style="padding:4px 0;font-style:italic;">"${review_title || '–'}"</td>
              </tr>
            </table>
          </div>

          <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:20px;">
            Die Bewertung wurde aus deinem Amazon-Listing entfernt. Du findest alle Details in deinem Dashboard unter „Entfernte Bewertungen".
          </p>

          <div style="text-align:center;margin:24px 0;">
            <a href="https://reviewguards.de/app/removed-reviews.html"
               style="display:inline-block;padding:12px 28px;background:#3551FF;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">
              Im Dashboard ansehen →
            </a>
          </div>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

          <p style="font-size:12px;color:#aaa;text-align:center;line-height:1.6;">
            ReviewGuards – ein Service der AdsMasters GmbH<br>
            Arnulfstraße 33, 40545 Düsseldorf<br>
            <a href="mailto:team@reviewguards.de" style="color:#3551FF;">team@reviewguards.de</a>
          </p>
        </div>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [customer_email],
        subject: `✓ Bewertung entfernt – ${product_name || asin}`,
        html,
      }),
    });

    const result = await emailRes.json();
    return new Response(
      JSON.stringify({ success: true, email: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
