import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, AlertTriangle, Info, XCircle, ShieldAlert, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

const TYPE_ICONS = {
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
};

const TYPE_COLORS = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  danger: 'text-destructive',
};

export function NotificationBell() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channelConfig: Record<string, string> = {
      event: '*',
      schema: 'public',
      table: 'notifications',
    };

    if (role !== 'superadmin') {
      channelConfig.filter = `user_id=eq.${user.id}`;
    }

    const channel = supabase
      .channel(`realtime-notifications-${role}-${user.id}`)
      .on('postgres_changes', channelConfig as any, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, queryClient]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    refetchInterval: role === 'superadmin' ? 10000 : 30000,
    queryFn: async () => {
      const base = supabase.from('notifications').select('*');

      const q = role === 'superadmin'
        ? base.or(`user_id.eq.${user!.id},user_id.is.null`)
        : base.eq('user_id', user!.id);

      const { data } = await q.order('created_at', { ascending: false }).limit(30);
      return data || [];
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const base = supabase.from('notifications').update({ is_read: true }).eq('is_read', false);

      const q = role === 'superadmin'
        ? base.or(`user_id.eq.${user!.id},user_id.is.null`)
        : base.eq('user_id', user!.id);

      await q;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notificación eliminada' });
    },
  });

  const deleteAllNotifications = useMutation({
    mutationFn: async () => {
      const base = supabase.from('notifications').delete();

      const q = role === 'superadmin'
        ? base.or(`user_id.eq.${user!.id},user_id.is.null`)
        : base.eq('user_id', user!.id);

      await q;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Todas las notificaciones eliminadas' });
    },
  });

  const handleReactivate = async (notifId: string, tenantId: string) => {
    const { error } = await supabase.from('tenants').update({ is_active: true }).eq('id', tenantId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    toast({ title: '✅ Parqueadero reactivado' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    queryClient.invalidateQueries({ queryKey: ['reactivation-requests'] });
  };

  const isReactivationRequest = (n: any) =>
    n.title === 'Solicitud de reactivación' && !n.is_read && n.metadata?.tenant_id;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notificaciones</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => markAllRead.mutate()}>
                <Check className="h-3 w-3 mr-1" /> Leer
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 px-2 text-destructive hover:text-destructive" 
                onClick={() => deleteAllNotifications.mutate()}
                disabled={deleteAllNotifications.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Borrar
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sin notificaciones
            </div>
          ) : (
            notifications.map(n => {
              const isReactivation = role === 'superadmin' && isReactivationRequest(n);
              const Icon = isReactivation
                ? ShieldAlert
                : TYPE_ICONS[n.type as keyof typeof TYPE_ICONS] || Info;
              const color = isReactivation
                ? 'text-destructive'
                : TYPE_COLORS[n.type as keyof typeof TYPE_COLORS] || 'text-muted-foreground';

              return (
                <div
                  key={n.id}
                  className={`flex gap-3 p-3 border-b last:border-0 transition-colors group ${!n.is_read ? 'bg-muted/30' : ''} ${!isReactivation ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => !n.is_read && !isReactivation && markAsRead.mutate(n.id)}
                >
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </p>

                    {/* Action buttons for reactivation requests */}
                    {isReactivation && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Button
                          size="sm"
                          className="h-6 gap-1 text-[10px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactivate(n.id, (n.metadata as any).tenant_id);
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Activar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 text-[10px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead.mutate(n.id);
                          }}
                        >
                          <XCircle className="h-3 w-3" /> Descartar
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    {!n.is_read && !isReactivation && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate(n.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
