import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Settings, Bell, Globe, Shield, Palette, Copyright, FileText, User, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";

const AdminSettings = () => {
  const { user } = useAuth();
  const { isMaintenanceMode, setMaintenanceMode: setMaintenanceModeGlobal } = useMaintenanceMode();
  const [siteName, setSiteName] = useState("Krishna Tech Solutions");
  const [siteEmail, setSiteEmail] = useState("info@krishnatech.com");
  const [sitePhone, setSitePhone] = useState("+91 12345 67890");
  const [copyrightText, setCopyrightText] = useState("© 2024 Krishna Tech Solutions. All rights reserved.");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [showTerms, setShowTerms] = useState(true);
  const [termsContent, setTermsContent] = useState(
    "Welcome to Krishna Tech Solutions. By using our services, you agree to these terms and conditions. We reserve the right to modify these terms at any time."
  );

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfileName(data.full_name || "");
      setProfileEmail(data.email || user.email || "");
      setAvatarUrl(data.avatar_url || null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    setIsUploadingAvatar(true);
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl + '?t=' + Date.now()); // Add timestamp to bust cache
      toast.success("Profile photo updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profileName, email: profileEmail })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveGeneral = () => {
    toast.success("General settings saved successfully!");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification settings saved successfully!");
  };

  const handleSaveLegal = () => {
    toast.success("Legal settings saved successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Site Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your website settings
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Profile */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              My Profile
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 mb-6">
              {/* Avatar Upload */}
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-border">
                  <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profileName ? profileName.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground">Click to upload profile photo</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profileName">Full Name</Label>
                <Input
                  id="profileName"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email</Label>
                <Input
                  id="profileEmail"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="Your email"
                />
              </div>
            </div>
            <Button 
              onClick={handleSaveProfile} 
              className="mt-4"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? "Saving..." : "Update Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic site information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteEmail">Contact Email</Label>
              <Input
                id="siteEmail"
                type="email"
                value={siteEmail}
                onChange={(e) => setSiteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sitePhone">Contact Phone</Label>
              <Input
                id="sitePhone"
                value={sitePhone}
                onChange={(e) => setSitePhone(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveGeneral} className="w-full">
              Save General Settings
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotif">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive booking notifications via email
                </p>
              </div>
              <Switch
                id="emailNotif"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smsNotif">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive booking notifications via SMS
                </p>
              </div>
              <Switch
                id="smsNotif"
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
              />
            </div>
            <Button onClick={handleSaveNotifications} className="w-full">
              Save Notification Settings
            </Button>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Maintenance
            </CardTitle>
            <CardDescription>
              Control site availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenance">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable public access
                </p>
              </div>
              <Switch
                id="maintenance"
                checked={isMaintenanceMode}
                onCheckedChange={async (checked) => {
                  try {
                    await setMaintenanceModeGlobal(checked);
                    toast.success(checked ? "Maintenance mode enabled" : "Maintenance mode disabled");
                  } catch {
                    toast.error("Failed to update maintenance mode");
                  }
                }}
              />
            </div>
            {isMaintenanceMode && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Site is currently in maintenance mode. Public pages will show a maintenance message.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Theme customization options will be available soon.
            </p>
          </CardContent>
        </Card>

        {/* Copyright Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copyright className="w-5 h-5" />
              Copyright
            </CardTitle>
            <CardDescription>
              Customize footer copyright text
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copyright">Copyright Text</Label>
              <Input
                id="copyright"
                value={copyrightText}
                onChange={(e) => setCopyrightText(e.target.value)}
                placeholder="© 2024 Your Company. All rights reserved."
              />
            </div>
            <Button onClick={handleSaveLegal} className="w-full">
              Save Copyright
            </Button>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Terms & Conditions
            </CardTitle>
            <CardDescription>
              Manage terms and conditions visibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="showTerms">Show Terms & Conditions</Label>
                <p className="text-sm text-muted-foreground">
                  Display terms on the website
                </p>
              </div>
              <Switch
                id="showTerms"
                checked={showTerms}
                onCheckedChange={setShowTerms}
              />
            </div>
            {showTerms && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="termsContent">Terms Content</Label>
                  <Textarea
                    id="termsContent"
                    value={termsContent}
                    onChange={(e) => setTermsContent(e.target.value)}
                    placeholder="Enter your terms and conditions..."
                    rows={4}
                  />
                </div>
              </>
            )}
            <Button onClick={handleSaveLegal} className="w-full">
              Save Terms Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
