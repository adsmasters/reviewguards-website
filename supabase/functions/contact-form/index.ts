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
    const { name, email, marketplace, review_link, message } = await req.json();

    if (!name || !email || !marketplace || !review_link) {
      return new Response(
        JSON.stringify({ error: "Bitte alle Pflichtfelder ausfüllen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0d1117;padding:20px 24px;border-radius:12px 12px 0 0;">
          <span style="font-weight:900;font-size:18px;color:#fff;">Review<span style="color:#3551FF;">Guards</span></span>
          <span style="background:#f59e0b;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;margin-left:8px;">Neue Anfrage</span>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="font-size:18px;margin-bottom:16px;">📩 Neue Analyse-Anfrage</h2>

          <table style="width:100%;margin-bottom:16px;font-size:14px;">
            <tr>
              <td style="padding:8px 0;color:#666;width:140px;">Name:</td>
              <td style="padding:8px 0;font-weight:700;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">E-Mail:</td>
              <td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">Marketplace:</td>
              <td style="padding:8px 0;">${marketplace}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">Link zur Bewertung:</td>
              <td style="padding:8px 0;"><a href="${review_link}" style="color:#3551FF;">${review_link}</a></td>
            </tr>
            ${message ? `<tr>
              <td style="padding:8px 0;color:#666;vertical-align:top;">Nachricht:</td>
              <td style="padding:8px 0;">${message}</td>
            </tr>` : ''}
          </table>

          <div style="margin-top:20px;">
            <a href="mailto:${email}?subject=Ihre%20ReviewGuards%20Anfrage&body=Hallo%20${encodeURIComponent(name)},%0A%0Avielen%20Dank%20für%20Ihre%20Anfrage."
               style="display:inline-block;padding:10px 20px;background:#3551FF;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
              Dem Kunden antworten →
            </a>
          </div>

          <p style="margin-top:20px;font-size:12px;color:#9ca3af;">
            Diese Anfrage wurde über das Kontaktformular auf reviewguards.de gesendet.
          </p>
        </div>
      </div>
    `;

    // Send notification to team
    const teamRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        reply_to: email,
        subject: `📩 Neue Anfrage – ${name} (${marketplace})`,
        html,
      }),
    });

    // Send confirmation to customer
    const confirmHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0d1117;padding:20px 24px;border-radius:12px 12px 0 0;">
          <span style="font-weight:900;font-size:18px;color:#fff;">Review<span style="color:#3551FF;">Guards</span></span>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="font-size:18px;margin-bottom:16px;">Vielen Dank für deine Anfrage, ${name}!</h2>
          <p style="font-size:14px;color:#333;line-height:1.7;">
            Wir haben deine Anfrage erhalten und werden uns innerhalb von <strong>48 Stunden</strong> mit einer kostenlosen Einschätzung bei dir melden.
          </p>
          <p style="font-size:14px;color:#333;line-height:1.7;margin-top:12px;">
            <strong>Deine Angaben:</strong><br>
            Marketplace: ${marketplace}<br>
            Link: <a href="${review_link}" style="color:#3551FF;">${review_link}</a>
          </p>
          <p style="font-size:14px;color:#333;line-height:1.7;margin-top:12px;">
            Bei Fragen erreichst du uns jederzeit unter <a href="mailto:team@reviewguards.de" style="color:#3551FF;">team@reviewguards.de</a>.
          </p>
          <p style="margin-top:20px;font-size:12px;color:#9ca3af;">
            ReviewGuards – ein Service der AdsMasters GmbH
          </p>
        </div>
      </div>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Deine Anfrage bei ReviewGuards – wir melden uns!",
        html: confirmHtml,
      }),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
