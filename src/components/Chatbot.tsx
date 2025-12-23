import { useState, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BookingCalendar from "@/components/BookingCalendar";
import { supabase } from "@/integrations/supabase/client";

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

  // Build quick options from active services (max 3) + Book Appointment
  const quickOptions = [
    ...services.slice(0, 3).map(s => s.name),
    "Book Appointment"
  ];

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
          response = `${service.description || service.name}\n\n💰 Price: ₹${service.price.toLocaleString()}\n\nWould you like to book an appointment?`;
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
                  className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-line ${
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

          {/* Quick Options */}
          {!showCalendar && (
            <div className="px-4 py-3 border-t border-border bg-card">
              <div className="flex flex-wrap gap-2">
                {quickOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleQuickOption(option)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
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