import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, User, Mail, Phone, XCircle, CheckCircle, CheckCheck, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface Appointment {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  service_type: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const AdminAppointments = () => {
  const { user, isAdmin } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled" | "completed">("all");

  useEffect(() => {
    fetchAppointments();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => fetchAppointments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (error) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Error",
        description: "Failed to load appointments.",
        variant: "destructive"
      });
    } else {
      setAppointments(data || []);
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: "confirmed" | "cancelled" | "completed") => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can modify appointments.",
        variant: "destructive"
      });
      return;
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "cancelled") {
      updateData.cancelled_by = user?.id;
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating appointment:", error);
      toast({
        title: "Error",
        description: "Failed to update appointment.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: `Appointment ${newStatus}.`
      });
    }
  };

  const exportToExcel = () => {
    const exportData = filteredAppointments.map((apt) => ({
      "Booking ID": apt.id.split("-")[0].toUpperCase(),
      "Customer Name": apt.user_name,
      "Email": apt.user_email,
      "Phone": apt.user_phone || "N/A",
      "Date": format(new Date(apt.appointment_date), "MMM d, yyyy"),
      "Time": apt.appointment_time.slice(0, 5),
      "Service": apt.service_type || "N/A",
      "Status": apt.status.charAt(0).toUpperCase() + apt.status.slice(1),
      "Notes": apt.notes || "",
      "Created At": format(new Date(apt.created_at), "MMM d, yyyy HH:mm"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Appointments");

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...exportData.map((row) => String(row[key as keyof typeof row]).length))
    }));
    worksheet["!cols"] = colWidths;

    const fileName = `appointments_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export Complete",
      description: `Exported ${exportData.length} appointments to ${fileName}`,
    });
  };

  const filteredAppointments = appointments.filter(
    (apt) => filter === "all" || apt.status === filter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading appointments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Appointments</h2>
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={exportToExcel}
            disabled={filteredAppointments.length === 0}
            className="ml-2"
          >
            <Download className="w-4 h-4 mr-1" />
            Export Excel
          </Button>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No {filter !== "all" ? filter : ""} appointments found.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((apt) => (
                <TableRow key={apt.id}>
                  <TableCell>
                    <span className="font-mono text-sm font-semibold text-primary">
                      {apt.id.split("-")[0].toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {apt.appointment_time.slice(0, 5)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {apt.user_name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {apt.user_email}
                      </div>
                      {apt.user_phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {apt.user_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{apt.service_type || "—"}</TableCell>
                  <TableCell>{getStatusBadge(apt.status)}</TableCell>
                  <TableCell className="text-right">
                    {apt.status === "pending" && isAdmin && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleStatusChange(apt.id, "confirmed")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Confirm
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel the appointment for {apt.user_name} on{" "}
                                {format(new Date(apt.appointment_date), "MMM d, yyyy")} at{" "}
                                {apt.appointment_time.slice(0, 5)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusChange(apt.id, "cancelled")}
                              >
                                Cancel Appointment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                    {apt.status === "confirmed" && isAdmin && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleStatusChange(apt.id, "completed")}
                        >
                          <CheckCheck className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel the confirmed appointment for {apt.user_name}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusChange(apt.id, "cancelled")}
                              >
                                Cancel Appointment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminAppointments;
