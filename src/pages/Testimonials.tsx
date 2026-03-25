import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Star, Plus, MessageSquare } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function Testimonials() {
  const { user, profile } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const { data: myTestimonials = [] } = useQuery({
    queryKey: ['my-testimonials', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('testimonials').insert({
        user_id: user!.id,
        tenant_id: profile?.tenant_id || null,
        full_name: profile?.full_name || 'Anónimo',
        business_name: tenant?.name || null,
        rating,
        review,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('¡Testimonio enviado! Será revisado por el equipo.');
      setOpen(false);
      setReview('');
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ['my-testimonials'] });
    },
    onError: () => toast.error('Error al enviar testimonio'),
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Testimonios</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Comparte tu experiencia con ParkiUpar</p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Escribir Testimonio
        </Button>
      </div>

      {myTestimonials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aún no has escrito ningún testimonio</p>
            <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>Escribir mi primer testimonio</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myTestimonials.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < t.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">"{t.review}"</p>
                <Badge variant={t.is_approved ? 'default' : 'secondary'} className="text-[10px]">
                  {t.is_approved ? 'Publicado' : 'Pendiente de aprobación'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escribir Testimonio</DialogTitle>
            <DialogDescription>Tu testimonio será revisado antes de publicarse</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Calificación</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating) ? 'fill-primary text-primary' : 'text-muted-foreground/30'
                    }`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tu reseña *</Label>
              <Textarea
                placeholder="Cuéntanos tu experiencia con ParkiUpar..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{review.length}/500</p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Nombre:</span> <strong>{profile?.full_name || 'Anónimo'}</strong></p>
              {tenant?.name && <p><span className="text-muted-foreground">Parqueadero:</span> <strong>{tenant.name}</strong></p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => setConfirmSubmit(true)} disabled={!review.trim() || submitMutation.isPending}>
              {submitMutation.isPending ? 'Enviando...' : 'Enviar Testimonio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Confirmar Envío"
        description="¿Enviar tu testimonio? Será revisado por el equipo antes de publicarse."
        onConfirm={() => { setConfirmSubmit(false); submitMutation.mutate(); }}
        loading={submitMutation.isPending}
      />
    </div>
  );
}
