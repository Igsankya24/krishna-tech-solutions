import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      appointmentDate,
      appointmentTime,
      serviceType,
      notes,
    }: BookingNotificationRequest = await req.json();

    console.log("Sending booking notification for:", customerName, appointmentDate, appointmentTime);

    // Send notification to admin
    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Krishna Tech Solutions <onboarding@resend.dev>",
        to: ["bgmghost.ig@gmail.com"],
        subject: `New Appointment Booking - ${customerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0891b2, #6366f1); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">New Appointment Booking</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #1e293b; margin-top: 0;">Customer Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${customerEmail}</td>
                </tr>
                ${customerPhone ? `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Phone:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${customerPhone}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Date:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${appointmentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Time:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${appointmentTime}</td>
                </tr>
                ${serviceType ? `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Service:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${serviceType}</td>
                </tr>
                ` : ''}
              </table>
              <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
                Please log in to your admin dashboard to confirm or manage this appointment.
              </p>
            </div>
            <div style="padding: 20px; background: #1e293b; text-align: center;">
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                Krishna Tech Solutions - Belgaum, Karnataka 590014
              </p>
            </div>
          </div>
        `,
      }),
    });

    const adminEmailData = await adminEmailRes.json();
    console.log("Admin email sent:", adminEmailData);

    // Send confirmation to customer
    const customerEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Krishna Tech Solutions <onboarding@resend.dev>",
        to: [customerEmail],
        subject: "Appointment Confirmation - Krishna Tech Solutions",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0891b2, #6366f1); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Appointment Confirmed!</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <p style="color: #1e293b; font-size: 16px;">Dear ${customerName},</p>
              <p style="color: #64748b;">Thank you for booking an appointment with Krishna Tech Solutions. Here are your appointment details:</p>
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 5px 0;"><strong>Date:</strong> ${appointmentDate}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${appointmentTime}</p>
                ${serviceType ? `<p style="margin: 5px 0;"><strong>Service:</strong> ${serviceType}</p>` : ''}
              </div>
              <p style="color: #64748b;">If you need to reschedule or cancel, please contact us at +91 98765 43210.</p>
              <p style="color: #1e293b;">We look forward to seeing you!</p>
              <p style="color: #1e293b; margin-top: 20px;">Best regards,<br><strong>Krishna Tech Solutions Team</strong></p>
            </div>
            <div style="padding: 20px; background: #1e293b; text-align: center;">
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                Krishna Tech Solutions - Belgaum, Karnataka 590014
              </p>
            </div>
          </div>
        `,
      }),
    });

    const customerEmailData = await customerEmailRes.json();
    console.log("Customer email sent:", customerEmailData);

    return new Response(
      JSON.stringify({ success: true, adminEmail: adminEmailData, customerEmail: customerEmailData }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-booking-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
