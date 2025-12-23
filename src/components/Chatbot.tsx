import { useState, useEffect } from "react";
import { MessageCircle, X, Send, Ticket, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BookingCalendar from "@/components/BookingCalendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  type: "bot" | "user";
  text?: string;
  component?: "calendar";
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface Coupon {
  id: string;
  code: string;
  name: string;
  discount_percent: number;
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "bot",
      text: "Hello! 👋 Welcome to Krishna Tech Solutions. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);

  // Fetch active services from database
  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, description, price")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (data) setServices(data);
    };

    fetchServices();

    // Real-time updates
    const channel = supabase
      .channel("chatbot-services")
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

  // Build quick options from active services (max 3) + Apply Coupon + Book Appointment
  const quickOptions = [
    ...services.slice(0, 2).map(s => s.name),
    "Apply Coupon",
    "Book Appointment"
  ];

  const calculateDiscountedPrice = (price: number) => {
    if (!appliedCoupon) return price;
    return Math.round(price * (1 - appliedCoupon.discount_percent / 100));
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

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
        setMessages((prev) => [
          ...prev,
          { type: "user", text: `Applying coupon: ${couponInput.toUpperCase()}` },
          {
            type: "bot",
            text: `🎉 Coupon "${data.name}" applied! You get ${data.discount_percent}% off on all services!`,
          },
        ]);
        toast.success(`Coupon applied: ${data.discount_percent}% off!`);
      } else {
        setMessages((prev) => [
          ...prev,
          { type: "user", text: `Applying coupon: ${couponInput.toUpperCase()}` },
          {
            type: "bot",
            text: "Sorry, this coupon code is invalid or expired. Please check and try again.",
          },
        ]);
        toast.error("Invalid or expired coupon code");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast.error("Failed to apply coupon");
    }

    setCouponInput("");
    setShowCouponInput(false);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([...messages, { type: "user", text: input }]);

    // Check if user wants to book
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes("book") || lowerInput.includes("appointment") || lowerInput.includes("schedule")) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: "I'd be happy to help you book an appointment! Please select a date and time:",
          },
        ]);
        setShowCalendar(true);
      }, 500);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: "Thank you for your message! Our team will get back to you shortly. For immediate assistance, please call us at +91 98765 43210.",
          },
        ]);
      }, 1000);
    }

    setInput("");
  };

  const handleQuickOption = (option: string) => {
    if (option === "Apply Coupon") {
      setShowCouponInput(true);
      setMessages((prev) => [
        ...prev,
        { type: "user", text: option },
        { type: "bot", text: "Please enter your coupon code below to get a discount on our services!" },
      ]);
      return;
    }

    setMessages([...messages, { type: "user", text: option }]);

    setTimeout(() => {
      let response = "";
      let openCalendar = false;
      
      if (option === "Book Appointment") {
        response = "I'd be happy to help you book an appointment! Please select a date and time:";
        openCalendar = true;
      } else {
        // Find the service from active services
        const service = services.find(s => s.name === option);
        if (service) {
          const originalPrice = service.price;
          const discountedPrice = calculateDiscountedPrice(originalPrice);
          
          if (appliedCoupon && discountedPrice < originalPrice) {
            response = `${service.description || service.name}\n\n💰 Original: ₹${originalPrice.toLocaleString()}\n🎉 With ${appliedCoupon.discount_percent}% off: ₹${discountedPrice.toLocaleString()}\n\nWould you like to book an appointment?`;
          } else {
            response = `${service.description || service.name}\n\n💰 Price: ₹${originalPrice.toLocaleString()}\n\nWould you like to book an appointment?`;
          }
        } else {
          response = "How can I assist you further?";
        }
      }
      
      setMessages((prev) => [...prev, { type: "bot", text: response }]);
      if (openCalendar) {
        setShowCalendar(true);
      }
    }, 800);
  };

  const handleBookingComplete = () => {
    setShowCalendar(false);
    setMessages((prev) => [
      ...prev,
      {
        type: "bot",
        text: "Your appointment has been booked successfully! We look forward to seeing you. Is there anything else I can help you with?",
      },
    ]);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300 glow-effect ${
          isOpen ? "hidden" : ""
        }`}
      >
        <MessageCircle className="w-7 h-7 text-primary-foreground" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-semibold text-primary-foreground">
                  Tech Support
                </h4>
                <span className="text-xs text-primary-foreground/80">
                  Online • Replies instantly
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.type === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card text-card-foreground rounded-bl-md shadow-sm border border-border"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar */}
          {showCalendar && (
            <div className="px-4 py-3 border-t border-border bg-muted/30">
              <BookingCalendar
                onBookingComplete={handleBookingComplete}
                onClose={() => setShowCalendar(false)}
              />
            </div>
          )}

          {/* Coupon Input */}
          {showCouponInput && (
            <div className="px-4 py-3 border-t border-border bg-muted/30">
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && handleApplyCoupon()}
                  placeholder="Enter coupon code..."
                  className="flex-1 uppercase"
                />
                <Button onClick={handleApplyCoupon} size="sm" variant="default">
                  <Check className="w-4 h-4 mr-1" />
                  Apply
                </Button>
                <Button onClick={() => setShowCouponInput(false)} size="sm" variant="ghost">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {appliedCoupon && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <Ticket className="w-3 h-3" />
                  Active: {appliedCoupon.name} (-{appliedCoupon.discount_percent}%)
                </p>
              )}
            </div>
          )}

          {/* Quick Options */}
          {!showCalendar && !showCouponInput && (
            <div className="px-4 py-3 border-t border-border bg-card">
              <div className="flex flex-wrap gap-2">
                {appliedCoupon && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-500/10 text-green-600 flex items-center gap-1">
                    <Ticket className="w-3 h-3" />
                    {appliedCoupon.discount_percent}% OFF
                  </span>
                )}
                {quickOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleQuickOption(option)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      option === "Apply Coupon"
                        ? "bg-accent/10 text-accent hover:bg-accent/20"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {option === "Apply Coupon" && <Ticket className="w-3 h-3 inline mr-1" />}
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border bg-card flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon" variant="hero">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
