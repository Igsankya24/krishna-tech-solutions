import { useState, useEffect } from "react";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingCalendarProps {
  onBookingComplete?: () => void;
  onClose?: () => void;
}

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30"
];

const SERVICES = [
  "Data Recovery",
  "Windows Upgrade",
  "Password Reset",
  "Hardware Repair",
  "Software Installation",
  "General Consultation"
];

const BookingCalendar = ({ onBookingComplete, onClose }: BookingCalendarProps) => {
  const [step, setStep] = useState<"date" | "time" | "details" | "success">("date");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    notes: ""
  });

  // Fetch booked slots for selected date
  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchBookedSlots = async (date: Date) => {
    const { data, error } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", format(date, "yyyy-MM-dd"))
      .neq("status", "cancelled");

    if (error) {
      console.error("Error fetching slots:", error);
      return;
    }

    const slots = data?.map(apt => apt.appointment_time.slice(0, 5)) || [];
    setBookedSlots(slots);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime(undefined);
      setStep("time");
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !formData.name || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from("appointments").insert({
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
      appointment_time: selectedTime,
      user_name: formData.name,
      user_email: formData.email,
      user_phone: formData.phone || null,
      service_type: formData.service || null,
      notes: formData.notes || null,
      status: "pending"
    });

    if (error) {
      setIsLoading(false);
      if (error.code === "23505") {
        toast({
          title: "Slot Unavailable",
          description: "This time slot was just booked. Please select another.",
          variant: "destructive"
        });
        setStep("time");
        fetchBookedSlots(selectedDate);
      } else {
        toast({
          title: "Booking Failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
      return;
    }

    // Send email notification
    try {
      await supabase.functions.invoke("send-booking-notification", {
        body: {
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone || undefined,
          appointmentDate: format(selectedDate, "EEEE, MMMM d, yyyy"),
          appointmentTime: selectedTime,
          serviceType: formData.service || undefined,
        },
      });
      console.log("Email notification sent successfully");
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
    }

    // Send SMS notification
    try {
      await supabase.functions.invoke("send-sms-notification", {
        body: {
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone || undefined,
          appointmentDate: format(selectedDate, "EEEE, MMMM d, yyyy"),
          appointmentTime: selectedTime,
          serviceType: formData.service || undefined,
        },
      });
      console.log("SMS notification sent successfully");
    } catch (smsError) {
      console.error("Failed to send SMS notification:", smsError);
    }

    setIsLoading(false);
    setStep("success");
    toast({
      title: "Appointment Booked!",
      description: `Your appointment is scheduled for ${format(selectedDate, "PPP")} at ${selectedTime}.`
    });
    onBookingComplete?.();
  };

  const today = startOfToday();
  const maxDate = addDays(today, 30);

  return (
    <div className="bg-card rounded-xl border border-border p-4 max-w-sm">
      {step === "date" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <CalendarIcon className="w-5 h-5" />
            <h3 className="font-semibold">Select a Date</h3>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => 
              isBefore(date, today) || 
              isBefore(maxDate, date) ||
              date.getDay() === 0 // Disable Sundays
            }
            className={cn("p-3 pointer-events-auto")}
            initialFocus
          />
        </div>
      )}

      {step === "time" && selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Clock className="w-5 h-5" />
              <h3 className="font-semibold">Select Time</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("date")}>
              Change Date
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {TIME_SLOTS.map((time) => {
              const isBooked = bookedSlots.includes(time);
              return (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  disabled={isBooked}
                  onClick={() => handleTimeSelect(time)}
                  className={cn(
                    "text-xs",
                    isBooked && "opacity-50 cursor-not-allowed line-through"
                  )}
                >
                  {time}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary">Your Details</h3>
            <Button variant="ghost" size="sm" onClick={() => setStep("time")}>
              Change Time
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate!, "EEEE, MMMM d")} at {selectedTime}
          </p>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <Label htmlFor="service">Service</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData({ ...formData, service: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Booking..." : "Confirm Booking"}
          </Button>
        </div>
      )}

      {step === "success" && (
        <div className="text-center py-6 space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="font-semibold text-lg">Booking Confirmed!</h3>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate!, "EEEE, MMMM d, yyyy")} at {selectedTime}
          </p>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation to {formData.email}
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
