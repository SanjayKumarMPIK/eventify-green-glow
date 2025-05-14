
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting event reminder service");

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format to match the date format in the database (YYYY-MM-DD)
    const tomorrowDateStart = new Date(tomorrow);
    tomorrowDateStart.setHours(0, 0, 0, 0);
    
    const tomorrowDateEnd = new Date(tomorrow);
    tomorrowDateEnd.setHours(23, 59, 59, 999);
    
    // Find all events happening tomorrow
    const { data: tomorrowEvents, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .gte("date", tomorrowDateStart.toISOString())
      .lte("date", tomorrowDateEnd.toISOString());

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      throw eventsError;
    }

    console.log(`Found ${tomorrowEvents?.length || 0} events happening tomorrow`);

    // For each event, find registrations and send emails
    let emailCount = 0;
    for (const event of tomorrowEvents || []) {
      const { data: registrations, error: registrationsError } = await supabase
        .from("registrations")
        .select(`
          id,
          user_id,
          team_name,
          team_members(name, email, department)
        `)
        .eq("event_id", event.id);

      if (registrationsError) {
        console.error(`Error fetching registrations for event ${event.id}:`, registrationsError);
        continue;
      }

      console.log(`Found ${registrations?.length || 0} registrations for event ${event.title}`);

      // Send an email to each team member
      for (const registration of registrations || []) {
        for (const member of registration.team_members || []) {
          try {
            const emailResponse = await resend.emails.send({
              from: "Eventify <no-reply@resend.dev>",
              to: [member.email],
              subject: `Reminder: ${event.title} is happening tomorrow!`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #10b981; text-align: center;">Event Reminder</h1>
                  <p>Hello ${member.name},</p>
                  <p>This is a friendly reminder that you are registered for the following event happening tomorrow:</p>
                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #10b981; margin-top: 0;">${event.title}</h2>
                    <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                    <p><strong>Location:</strong> ${event.location}</p>
                    <p><strong>Team:</strong> ${registration.team_name}</p>
                  </div>
                  <p>Please make sure to arrive on time. We look forward to seeing you there!</p>
                  <p>Best regards,<br>The Eventify Team</p>
                </div>
              `,
            });
            
            console.log(`Email sent to ${member.email} for event ${event.title}:`, emailResponse);
            emailCount++;
          } catch (emailError) {
            console.error(`Error sending email to ${member.email}:`, emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${emailCount} reminder emails for ${tomorrowEvents?.length || 0} events` 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in event reminder service:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
