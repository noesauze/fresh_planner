import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChefHat, Calendar, ShoppingCart, BookOpen, LogOut, Mail, Github, Chrome, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { isSupabaseEnabled, supabase } from "@/lib/supabaseClient";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const navItems = [
    { to: "/", label: t('navigation.recipes'), icon: BookOpen },
    { to: "/planner", label: t('navigation.mealPlanner'), icon: Calendar },
    { to: "/groceries", label: t('navigation.groceryList'), icon: ShoppingCart },
  ];

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    (async () => {
      const { data } = await supabase!.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    })();
    const { data: sub } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const sendMagicLink = async () => {
    if (!isSupabaseEnabled) return;
    try {
      await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      setOpen(false);
      
      // Afficher la notification de succès
      toast({
        title: t('auth.magicLinkSent'),
        description: t('auth.magicLinkSentDescription', { email }),
      });
    } catch (error) {
      console.error('Error sending magic link:', error);
      // Optionnel : afficher une notification d'erreur
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const oauth = async (provider: 'google' | 'github') => {
    if (!isSupabaseEnabled) return;
    await supabase!.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
  };

  const logout = async () => {
    if (!isSupabaseEnabled) return;
    await supabase!.auth.signOut();
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a href="/">
          <div className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">{t('app.title')}</span>
          </div>
        </a>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.to}
                variant="ghost"
                asChild
                className="transition-all duration-300"
              >
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${
                      isActive ? "text-primary font-semibold" : "text-muted-foreground"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </Button>
            );
          })}
          <div className="flex items-center gap-2 ml-2">
            <LanguageSwitcher />
            {isSupabaseEnabled && (
              userEmail ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden lg:block">{userEmail}</span>
                  <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('navigation.logout')}</span>
                  </Button>
                </div>
              ) : (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="ml-2">
                    <span className="hidden sm:inline">{t('navigation.login')}</span>
                    <span className="sm:hidden">{t('navigation.login')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('auth.signIn')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
                      <Button onClick={sendMagicLink} className="gap-2">
                        <Mail className="h-4 w-4" /> {t('auth.magicLink')}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="gap-2 flex-1" onClick={() => oauth('google')}>
                        <Chrome className="h-4 w-4" /> {t('auth.google')}
                      </Button>
                      <Button variant="outline" className="gap-2 flex-1" onClick={() => oauth('github')}>
                        <Github className="h-4 w-4" /> {t('auth.github')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )
          )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher />
          {isSupabaseEnabled && userEmail && (
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
          {isSupabaseEnabled && !userEmail && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">{t('navigation.login')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('auth.signIn')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Button onClick={sendMagicLink} className="gap-2">
                      <Mail className="h-4 w-4" /> {t('auth.magicLink')}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 flex-1" onClick={() => oauth('google')}>
                      <Chrome className="h-4 w-4" /> {t('auth.google')}
                    </Button>
                    <Button variant="outline" className="gap-2 flex-1" onClick={() => oauth('github')}>
                      <Github className="h-4 w-4" /> {t('auth.github')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col space-y-4 mt-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.to}
                      variant="ghost"
                      asChild
                      className="justify-start w-full"
                    >
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 ${
                            isActive ? "text-primary font-semibold" : "text-muted-foreground"
                          }`
                        }
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </NavLink>
                    </Button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;