import { useTrips, useCreateTrip } from "@/hooks/use-trips";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin, Car, Anchor, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema, type CreateTripRequest } from "@shared/routes";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function Trips() {
  const { data: trips, isLoading } = useTrips();
  const [open, setOpen] = useState(false);

  return (
    <Layout>
      <div className="p-4 pb-20">
        <header className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Surf Trips</h1>
            <p className="text-muted-foreground">Find a ride or plan a journey</p>
          </div>
          <CreateTripDialog open={open} onOpenChange={setOpen} />
        </header>

        {isLoading ? (
          <div className="space-y-4">
             {[1, 2].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {trips?.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
            {trips?.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
                No trips planned yet. Be the first!
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function TripCard({ trip }: { trip: any }) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
           <div className="flex items-center text-xs text-primary font-bold uppercase tracking-wider mb-1">
             {trip.tripType === 'carpool' ? <Car className="w-3 h-3 mr-1" /> : <Anchor className="w-3 h-3 mr-1" />}
             {trip.tripType}
           </div>
           <h3 className="text-xl font-bold font-display">{trip.destination}</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-display text-primary flex items-center justify-end">
            <span className="text-sm text-muted-foreground font-normal mr-1">est.</span>
            ${trip.cost}
          </div>
        </div>
      </div>
      
      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
        {trip.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs">
            {trip.organizer.displayName.substring(0, 2).toUpperCase()}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Organized by</span>
            <div className="font-semibold">{trip.organizer.displayName}</div>
          </div>
        </div>

        <div className="flex items-center text-sm font-medium bg-secondary/50 px-3 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4 mr-2 opacity-70" />
          {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d')}
        </div>
      </div>
    </div>
  );
}

function CreateTripDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { mutate, isPending } = useCreateTrip();
  const { user } = useAuth();
  
  const form = useForm<CreateTripRequest>({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      organizerId: user?.id,
      destination: "",
      cost: 0,
      tripType: "carpool",
    }
  });

  const onSubmit = (data: CreateTripRequest) => {
    mutate({ ...data, organizerId: user?.id! }, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90">
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan a Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Destination</Label>
            <Input {...form.register("destination")} placeholder="Where to?" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...form.register("startDate")} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" {...form.register("endDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Est. Cost ($)</Label>
              <Input type="number" {...form.register("cost", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select 
                {...form.register("tripType")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="carpool">Carpool</option>
                <option value="boat">Boat Trip</option>
                <option value="resort">Resort Stay</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea {...form.register("description")} placeholder="Looking for 2 people to split gas..." />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Creating..." : "Create Trip"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
