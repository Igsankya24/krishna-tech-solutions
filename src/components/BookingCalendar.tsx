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
import { CalendarIcon, Clock, CheckCircle, Ticket, X } from "lucide-react";
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

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Coupon {
  id: string;
  code: string;
  name: string;
  discount_percent: number;
}

const BookingCalendar = ({ onBookingComplete, onClose }: BookingCalendarProps) => {
  const [step, setStep] = useState<"date" | "time" | "details" | "success">("date");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    notes: ""
  });

  // Fetch active services from database
  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (data) setServices(data);
    };

    fetchServices();

    // Real-time updates for services
    const channel = supabase
      .channel("booking-services")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => fetchServices()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponError("");

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("id, code, name, discount_percent")
        .eq("code", couponInput.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAppliedCoupon(data);
        setCouponInput("");
        toast({
          title: "Coupon Applied!",
          description: `${data.name}: ${data.discount_percent}% discount applied.`,
        });
      } else {
        setCouponError("Invalid or expired coupon code");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      setCouponError("Failed to apply coupon");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const getSelectedServicePrice = () => {
    const service = services.find(s => s.name === formData.service);
    return service?.price || 0;
  };

  const getDiscountedPrice = () => {
    const price = getSelectedServicePrice();
    if (!appliedCoupon) return price;
    return Math.round(price * (1 - appliedCoupon.discount_percent / 100));
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

    if (!validateEmail(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const { data: insertedData, error } = await supabase.from("appointments").insert({
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
      appointment_time: selectedTime,
      user_name: formData.name,
      user_email: formData.email,
      user_phone: formData.phone || null,
      service_type: formData.service || null,
      notes: formData.notes || null,
      status: "pending"
    }).select("id").single();

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

    const appointmentId = insertedData?.id;
    const shortBookingId = appointmentId ? appointmentId.split("-")[0].toUpperCase() : null;
    setBookingId(shortBookingId);

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
          bookingId: shortBookingId,
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
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.name}>
                      {service.name} - ₹{service.price.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Coupon Section */}
            <div className="pt-2 border-t border-border">
              <Label className="flex items-center gap-1">
                <Ticket className="w-4 h-4" />
                Have a coupon?
              </Label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-500/10 text-green-700 px-3 py-2 rounded-md mt-1">
                  <span className="text-sm font-medium">
                    {appliedCoupon.name} (-{appliedCoupon.discount_percent}%)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeCoupon}
                    className="h-6 w-6 p-0 hover:bg-green-500/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError("");
                    }}
                    onKeyPress={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Enter code"
                    className="flex-1 uppercase text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyCoupon}
                  >
                    Apply
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="text-xs text-destructive mt-1">{couponError}</p>
              )}
            </div>

            {/* Price Summary */}
            {formData.service && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service:</span>
                  <span>{formData.service}</span>
                </div>
                {appliedCoupon ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Original Price:</span>
                      <span className="line-through text-muted-foreground">
                        ₹{getSelectedServicePrice().toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({appliedCoupon.discount_percent}%):</span>
                      <span>
                        -₹{(getSelectedServicePrice() - getDiscountedPrice()).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1 border-t border-border">
                      <span>Total:</span>
                      <span className="text-primary">₹{getDiscountedPrice().toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-semibold">
                    <span>Price:</span>
                    <span className="text-primary">₹{getSelectedServicePrice().toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
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
          {bookingId && (
            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Your Booking ID</p>
              <p className="text-xl font-bold text-primary tracking-wider">{bookingId}</p>
            </div>
          )}
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
