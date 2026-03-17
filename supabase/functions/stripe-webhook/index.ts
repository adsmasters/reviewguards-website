import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const event = JSON.parse(body);

    // Handle invoice.paid event
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const invoiceNumber = invoice.number;
      const customerEmail = invoice.customer_email;

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      // Update invoice status to "bezahlt" by invoice number
      if (invoiceNumber) {
        const { error } = await supabase
          .from("invoices")
          .update({ status: "bezahlt" })
          .eq("invoice_number", invoiceNumber);

        if (error) console.error("Update by invoice_number failed:", error);
        else console.log("Invoice marked as paid:", invoiceNumber);
      }

      // Also try by customer email (fallback)
      if (customerEmail && !invoiceNumber) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("company_name", `%${customerEmail}%`);

        if (profiles && profiles.length > 0) {
          await supabase
            .from("invoices")
            .update({ status: "bezahlt" })
            .eq("user_id", profiles[0].user_id)
            .eq("status", "offen");
        }
      }
    }

    // Handle invoice.payment_failed event
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const invoiceNumber = invoice.number;

      if (invoiceNumber) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        await supabase
          .from("invoices")
          .update({ status: "fehlgeschlagen" })
          .eq("invoice_number", invoiceNumber);

        console.log("Invoice payment failed:", invoiceNumber);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
