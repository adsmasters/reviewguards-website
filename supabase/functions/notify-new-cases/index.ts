import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const NOTIFY_EMAIL = "team@reviewguards.de";
const FROM_EMAIL = "ReviewGuards <noreply@reviewguards.de>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { customer_name, customer_email, asin, product_name, case_count, cases } = body;

    // Build case details HTML
    const caseRows = (cases || []).map((c: any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">★${c.review_rating}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${c.review_title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#666;">${(c.reasons || []).join(', ')}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0d1117;padding:20px 24px;border-radius:12px 12px 0 0;">
          <span style="font-weight:900;font-size:18px;color:#fff;">Review<span style="color:#3551FF;">Guards</span></span>
          <span style="background:#3551FF;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;margin-left:8px;">Neue Fälle</span>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="font-size:18px;margin-bottom:16px;">🔔 ${case_count} neue verdächtige Bewertung${case_count !== 1 ? 'en' : ''}</h2>

          <table style="width:100%;margin-bottom:16px;font-size:14px;">
            <tr>
              <td style="padding:4px 0;color:#666;">Kunde:</td>
              <td style="padding:4px 0;font-weight:700;">${customer_name}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#666;">E-Mail:</td>
              <td style="padding:4px 0;">${customer_email}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#666;">Produkt:</td>
              <td style="padding:4px 0;">${product_name || asin}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#666;">ASIN:</td>
              <td style="padding:4px 0;font-family:monospace;">${asin}</td>
            </tr>
          </table>

          <h3 style="font-size:14px;margin-bottom:8px;">Verdächtige Bewertungen:</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
            <thead>
              <tr style="background:#f5f6ff;">
                <th style="padding:8px 12px;text-align:left;font-size:12px;">Sterne</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;">Titel</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;">Gründe</th>
              </tr>
            </thead>
            <tbody>
              ${caseRows}
            </tbody>
          </table>

          <a href="https://reviewguards.de/app/admin.html"
             style="display:inline-block;padding:12px 24px;background:#3551FF;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
            Im Admin-Dashboard öffnen →
          </a>

          <p style="margin-top:20px;font-size:12px;color:#9ca3af;">
            Diese E-Mail wurde automatisch von ReviewGuards gesendet.
          </p>
        </div>
      </div>
    `;

    // Send via Resend API
    if (RESEND_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [NOTIFY_EMAIL],
          subject: `🔔 ${case_count} neue Fälle – ${customer_name} (${asin})`,
          html,
        }),
      });
      const emailResult = await emailRes.json();

      return new Response(
        JSON.stringify({ success: true, email: emailResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: log only (no email provider configured)
    console.log("Email notification (no provider):", { customer_name, asin, case_count });
    return new Response(
      JSON.stringify({ success: true, message: "Logged (no email provider configured)" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
