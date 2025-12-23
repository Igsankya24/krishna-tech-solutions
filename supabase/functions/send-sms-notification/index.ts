import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const ADMIN_PHONE_NUMBER = "+917026292525";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSNotificationRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerName,
      customerPhone,
      appointmentDate,
      appointmentTime,
      serviceType,
    }: SMSNotificationRequest = await req.json();

    console.log("Sending SMS notification for:", customerName, appointmentDate, appointmentTime);

    const message = `New Appointment!\n\nCustomer: ${customerName}\nDate: ${appointmentDate}\nTime: ${appointmentTime}${serviceType ? `\nService: ${serviceType}` : ''}${customerPhone ? `\nPhone: ${customerPhone}` : ''}\n\n- Krishna Tech Solutions`;

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", ADMIN_PHONE_NUMBER);
    formData.append("From", TWILIO_PHONE_NUMBER!);
    formData.append("Body", message);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();
    console.log("Twilio response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to send SMS");
    }

    return new Response(
      JSON.stringify({ success: true, messageSid: result.sid }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-sms-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);