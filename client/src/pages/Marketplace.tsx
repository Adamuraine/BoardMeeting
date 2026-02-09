import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useMyProfile, useUpdateProfile } from "@/hooks/use-profiles";
import { useLocation } from "wouter";
import { Plus, MessageCircle, MapPin, Tag, X, LayoutGrid, Search, Loader2, Bell } from "lucide-react";
import mapSearchIcon from "@assets/IMG_4807_1770411311458.jpeg";
import { ObjectUploader } from "@/components/ObjectUploader";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MarketplaceListing, Profile } from "@shared/schema";
import marketplaceBg from "@assets/IMG_4441_1769639666501.jpeg";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function createDollarIcon(price: string) {
  return L.divIcon({
    className: 'marketplace-dollar-marker',
    html: `<div style="
      background: #16a34a;
      color: white;
      font-weight: 700;
      font-size: 13px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      cursor: pointer;
      line-height: 1;
    ">${price}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function MapFitBounds({ listings }: { listings: ListingWithSeller[] }) {
  const map = useMap();
  useEffect(() => {
    if (listings.length === 0) return;
    const bounds = L.latLngBounds(
      listings.map(l => [parseFloat(l.latitude!), parseFloat(l.longitude!)] as [number, number])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [listings, map]);
  return null;
}

function getZoomForRadius(miles: number): number {
  if (miles <= 5) return 12;
  if (miles <= 10) return 11;
  if (miles <= 20) return 10;
  if (miles <= 50) return 9;
  if (miles <= 100) return 8;
  return 7;
}

function MapController({ center, radius }: { center: [number, number] | null; radius: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      const zoom = getZoomForRadius(radius);
      map.setView(center, zoom, { animate: true });
    }
  }, [center, radius, map]);
  
  return null;
}

type ListingWithSeller = MarketplaceListing & { seller: Profile };

const CATEGORIES = [
  { value: "surfboard", label: "Surfboard" },
  { value: "wetsuit", label: "Wetsuit" },
  { value: "accessories", label: "Accessories" },
  { value: "other", label: "Other" },
];

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like-new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const LISTING_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "trade", label: "Trade" },
  { value: "free", label: "Free" },
];

const RADIUS_OPTIONS = [
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 20, label: "20 miles" },
  { value: 50, label: "50 miles" },
  { value: 100, label: "100 miles" },
];

function formatPrice(cents: number | null, listingType: string): string {
  if (listingType === "free") return "FREE";
  if (cents === null) return "Trade Only";
  return `$${(cents / 100).toFixed(0)}`;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getConditionColor(condition: string): string {
  switch (condition) {
    case "new": return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "like-new": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
    case "good": return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    case "fair": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    case "poor": return "bg-red-500/20 text-red-700 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getCategoryLabel(category: string): string {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat?.label || category;
}

function getListingTypeLabel(type: string): string {
  const lt = LISTING_TYPES.find(l => l.value === type);
  return lt?.label || type;
}

async function geocodeZipCode(zip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=US&format=json`,
      {
        headers: {
          'User-Agent': 'SurfTribe-Marketplace/1.0'
        }
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function geocodeLocationText(locationText: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationText)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'SurfTribe-Marketplace/1.0'
        }
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding location text error:', error);
    return null;
  }
}

export default function Marketplace() {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const updateProfileMutation = useUpdateProfile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [listingTypeFilter, setListingTypeFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingWithSeller | null>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  
  const [radius, setRadius] = useState<number>(50);
  const [searchZip, setSearchZip] = useState("");
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [listingType, setListingType] = useState("");
  const [location, setLocationValue] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [zipCode, setZipCode] = useState("");
  const [listingCoords, setListingCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isGeocodingZip, setIsGeocodingZip] = useState(false);

  const { data: listings, isLoading } = useQuery<ListingWithSeller[]>({
    queryKey: ["/api/marketplace"],
  });

  useEffect(() => {
    if (zipCode.length === 5) {
      setIsGeocodingZip(true);
      geocodeZipCode(zipCode).then(coords => {
        setListingCoords(coords);
        setIsGeocodingZip(false);
      });
    } else if (zipCode.length > 0) {
      setListingCoords(null);
    }
  }, [zipCode]);

  useEffect(() => {
    if (zipCode.length > 0) return;
    if (!location || location.length < 3) {
      setListingCoords(null);
      return;
    }
    const timer = setTimeout(() => {
      setIsGeocodingZip(true);
      geocodeLocationText(location).then(coords => {
        setListingCoords(coords);
        setIsGeocodingZip(false);
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [location, zipCode]);

  const handleSearchLocation = async () => {
    if (!searchZip || searchZip.length !== 5) {
      toast({ title: "Invalid zip code", description: "Please enter a valid 5-digit zip code", variant: "destructive" });
      return;
    }
    setIsSearchingLocation(true);
    const coords = await geocodeZipCode(searchZip);
    if (coords) {
      setUserCoords(coords);
      toast({ title: "Location set", description: `Showing listings within ${radius} miles` });
    } else {
      toast({ title: "Location not found", description: "Could not find that zip code", variant: "destructive" });
    }
    setIsSearchingLocation(false);
  };

  const clearLocationFilter = () => {
    setUserCoords(null);
    setSearchZip("");
  };

  const createListing = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      price?: number | null;
      category: string;
      condition: string;
      listingType: string;
      location?: string;
      imageUrls?: string[];
      zipCode?: string;
      latitude?: string;
      longitude?: string;
    }) => {
      const res = await apiRequest("POST", "/api/marketplace", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      resetForm();
      setCreateDialogOpen(false);
      toast({ title: "Listing created!", description: "Your item is now live." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create listing", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("");
    setCondition("");
    setListingType("");
    setLocationValue("");
    setImageUrls([]);
    setZipCode("");
    setListingCoords(null);
  };

  const handleSubmit = async () => {
    if (!title || !category || !condition || !listingType) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const priceInCents = (listingType === "trade" || listingType === "free") ? null : (price ? Math.round(parseFloat(price) * 100) : null);
    
    let finalLat = listingCoords?.lat?.toString() || undefined;
    let finalLng = listingCoords?.lng?.toString() || undefined;

    if (!finalLat && !finalLng && location) {
      const coords = await geocodeLocationText(location);
      if (coords) {
        finalLat = coords.lat.toString();
        finalLng = coords.lng.toString();
      }
    }

    createListing.mutate({
      title,
      description: description || undefined,
      price: priceInCents ?? undefined,
      category,
      condition,
      listingType,
      location: location || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      zipCode: zipCode || undefined,
      latitude: finalLat,
      longitude: finalLng,
    });
  };

  const marketplaceUploadPaths = useRef<Record<string, string>>({});

  const handleImageUpload = async (file: { name: string; size: number; type: string }) => {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadURL, objectPath } = await res.json();
    marketplaceUploadPaths.current[file.name] = objectPath;
    return { method: "PUT" as const, url: uploadURL, objectPath };
  };

  const filteredListings = listings?.filter(listing => {
    if (categoryFilter !== "all" && listing.category !== categoryFilter) return false;
    if (listingTypeFilter !== "all" && listing.listingType !== listingTypeFilter) return false;
    
    if (userCoords && listing.latitude && listing.longitude) {
      const listingLat = parseFloat(listing.latitude);
      const listingLng = parseFloat(listing.longitude);
      const distance = calculateDistance(userCoords.lat, userCoords.lng, listingLat, listingLng);
      if (distance > radius) return false;
    }
    
    return true;
  }) || [];

  const listingsWithCoords = filteredListings.filter(
    listing => listing.latitude && listing.longitude
  );

  const handleMessageSeller = (sellerId: string) => {
    if (!user) {
      toast({ title: "Login required", description: "Please log in to message sellers" });
      return;
    }
    setLocation(`/messages?to=${sellerId}`);
  };

  const handleViewDetails = (listing: ListingWithSeller) => {
    setSelectedListing(listing);
    setDetailsOpen(true);
  };

  const mapCenter: [number, number] = userCoords 
    ? [userCoords.lat, userCoords.lng] 
    : listingsWithCoords.length > 0 
      ? [parseFloat(listingsWithCoords[0].latitude!), parseFloat(listingsWithCoords[0].longitude!)]
      : [37.7749, -122.4194];

  return (
    <Layout>
      <div className="flex flex-col h-full">
      <div className="shrink-0">
      <div className="px-4 pt-4">
      <div className="relative h-32 -mx-4 -mt-4 mb-4 overflow-hidden">
        <img 
          src={marketplaceBg} 
          alt="Surf Gear Marketplace" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Surf Gear Market</h1>
              <p className="text-sm text-white/80">Buy, sell, or trade your gear</p>
            </div>
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2">
              <Bell className="h-4 w-4 text-white/80" />
              <Switch
                id="marketplace-notifications"
                checked={profile?.marketplaceNotifications ?? false}
                onCheckedChange={(checked) => {
                  updateProfileMutation.mutate({ marketplaceNotifications: checked });
                }}
                data-testid="switch-marketplace-notifications"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Input
              placeholder="Enter zip code"
              value={searchZip}
              onChange={(e) => setSearchZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="w-24"
              data-testid="input-search-zip"
            />
            <Button 
              size="sm" 
              onClick={handleSearchLocation}
              disabled={isSearchingLocation || searchZip.length !== 5}
              data-testid="button-search-location"
            >
              {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-1 hidden sm:inline">Search</span>
            </Button>
            {userCoords && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={clearLocationFilter}
                data-testid="button-clear-location"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <Select value={radius.toString()} onValueChange={(v) => setRadius(parseInt(v))}>
            <SelectTrigger className="w-[110px]" data-testid="select-radius">
              <SelectValue placeholder="Radius" />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-md overflow-visible">
            <Button
              size="default"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              className="rounded-none"
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button
              size="default"
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              className="rounded-none"
              onClick={() => setViewMode('map')}
              data-testid="button-view-map"
            >
              <img src={mapSearchIcon} alt="Map" className="w-12 h-12 rounded-sm object-cover" />
            </Button>
          </div>
        </div>
        
        {userCoords && (
          <p className="text-xs text-muted-foreground mt-2" data-testid="text-location-status">
            Showing listings within {radius} miles of {searchZip}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[9999]">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[9999]">
            <SelectItem value="all">All Types</SelectItem>
            {LISTING_TYPES.map(lt => (
              <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {user && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-auto" data-testid="button-post-item">
                <Plus className="w-4 h-4 mr-1" /> Post Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post a New Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g. 6'2 Shortboard"
                    data-testid="input-title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Describe your item..."
                    data-testid="input-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition">Condition *</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger data-testid="select-condition">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map(cond => (
                          <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="listingType">Listing Type *</Label>
                    <Select value={listingType} onValueChange={setListingType}>
                      <SelectTrigger data-testid="select-listing-type">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {LISTING_TYPES.map(lt => (
                          <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input 
                      id="price" 
                      type="number" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)} 
                      placeholder="0"
                      disabled={listingType === "trade" || listingType === "free"}
                      data-testid="input-price"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <Input 
                        id="location" 
                        value={location} 
                        onChange={(e) => setLocationValue(e.target.value)} 
                        placeholder="e.g. San Diego, CA"
                        data-testid="input-location"
                      />
                      {!zipCode && isGeocodingZip && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {!zipCode && listingCoords && (
                      <p className="text-xs text-green-600 mt-1" data-testid="text-location-coords-success">
                        Location found
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="zipCode">Zip Code (optional)</Label>
                    <div className="relative">
                      <Input 
                        id="zipCode" 
                        value={zipCode} 
                        onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} 
                        placeholder="e.g. 92101"
                        data-testid="input-zip-code"
                      />
                      {isGeocodingZip && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {listingCoords && (
                      <p className="text-xs text-green-600 mt-1" data-testid="text-coords-success">
                        Location found
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Photos</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {imageUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16">
                        <img src={url} alt="" className="w-full h-full object-cover rounded" />
                        <button 
                          onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                          data-testid={`button-remove-image-${idx}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={52428800}
                    onGetUploadParameters={async (file) => {
                      const { url, objectPath } = await handleImageUpload({ name: file.name, size: file.size || 0, type: file.type });
                      return { method: "PUT" as const, url, headers: { "Content-Type": file.type || "application/octet-stream" } };
                    }}
                    onComplete={(result) => {
                      const paths = (result.successful || [])
                        .map((f: any) => marketplaceUploadPaths.current[f.name] || marketplaceUploadPaths.current[f.id])
                        .filter(Boolean) as string[];
                      if (paths.length > 0) {
                        setImageUrls(prev => [...prev, ...paths]);
                        marketplaceUploadPaths.current = {};
                      }
                    }}
                    buttonClassName="w-full"
                  >
                    Add Photos
                  </ObjectUploader>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  className="w-full" 
                  disabled={createListing.isPending}
                  data-testid="button-submit-listing"
                >
                  {createListing.isPending ? "Posting..." : "Post Listing"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-32 w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <div className="h-full rounded-lg overflow-hidden border relative" data-testid="map-container">
          {filteredListings.length === 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg" data-testid="text-no-listings-map">
              <p className="text-sm text-muted-foreground">No listings found in this area</p>
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={userCoords ? getZoomForRadius(radius) : 4}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            touchZoom={true}
            doubleClickZoom={true}
            dragging={true}
          >
            {userCoords ? (
              <MapController 
                center={[userCoords.lat, userCoords.lng]} 
                radius={radius} 
              />
            ) : (
              <MapFitBounds listings={listingsWithCoords} />
            )}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {userCoords && (
              <Circle
                center={[userCoords.lat, userCoords.lng]}
                radius={radius * 1609.34}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            )}
            {listingsWithCoords.map((listing) => (
              <Marker
                key={listing.id}
                position={[parseFloat(listing.latitude!), parseFloat(listing.longitude!)]}
                icon={createDollarIcon(
                  listing.listingType === 'free' ? 'FREE' :
                  listing.listingType === 'trade' ? '$' :
                  listing.price ? `$${Math.round(listing.price / 100)}` : '$'
                )}
              >
                <Popup>
                  <div style={{ width: '180px', padding: '0', margin: '-10px -16px -10px -16px' }}>
                    {listing.imageUrls && listing.imageUrls.length > 0 ? (
                      <img 
                        src={listing.imageUrls[0]} 
                        alt={listing.title}
                        style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px 4px 0 0', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '80px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px 4px 0 0' }}>
                        <span style={{ fontSize: '24px', color: '#9ca3af' }}>$</span>
                      </div>
                    )}
                    <div style={{ padding: '8px 12px 10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: '1.3', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {listing.title}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#16a34a' }}>
                        {formatPrice(listing.price, listing.listingType)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {listing.location || listing.seller.location || ''}
                      </div>
                      <button
                        onClick={() => handleViewDetails(listing)}
                        style={{
                          marginTop: '6px', width: '100%', padding: '5px 0', fontSize: '12px', fontWeight: 600,
                          background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }}
                        data-testid={`button-map-view-${listing.id}`}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-listings">
          <p>No listings found</p>
          {userCoords && <p className="text-sm mt-2">Try expanding your search radius or clearing the location filter</p>}
          {!userCoords && user && <p className="text-sm mt-2">Be the first to post an item!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredListings.map((listing) => (
            <Card 
              key={listing.id} 
              className="overflow-hidden cursor-pointer hover-elevate"
              onClick={() => handleViewDetails(listing)}
              data-testid={`card-listing-${listing.id}`}
            >
              <div className="relative h-32 bg-muted">
                {listing.imageUrls && listing.imageUrls.length > 0 ? (
                  <img 
                    src={listing.imageUrls[0]} 
                    alt={listing.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Tag className="w-8 h-8" />
                  </div>
                )}
                <Badge className={`absolute top-2 right-2 text-xs ${getConditionColor(listing.condition)}`}>
                  {listing.condition}
                </Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-sm truncate" data-testid={`text-title-${listing.id}`}>
                  {listing.title}
                </h3>
                <p className="text-primary font-semibold text-sm" data-testid={`text-price-${listing.id}`}>
                  {formatPrice(listing.price, listing.listingType)}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={listing.seller.imageUrls?.[0]} />
                    <AvatarFallback className="text-[8px]">
                      {listing.seller.displayName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{listing.seller.displayName}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedListing.title}</DialogTitle>
              </DialogHeader>
              
              {selectedListing.imageUrls && selectedListing.imageUrls.length > 0 && (
                <div className="relative h-48 bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={selectedListing.imageUrls[0]} 
                    alt={selectedListing.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary" data-testid="text-detail-price">
                    {formatPrice(selectedListing.price, selectedListing.listingType)}
                  </span>
                  <div className="flex gap-2">
                    <Badge className={getConditionColor(selectedListing.condition)}>
                      {selectedListing.condition}
                    </Badge>
                    <Badge variant="outline">{getListingTypeLabel(selectedListing.listingType)}</Badge>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Category: </span>
                  <span className="text-sm">{getCategoryLabel(selectedListing.category)}</span>
                </div>

                {selectedListing.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {selectedListing.location}
                    {selectedListing.zipCode && ` (${selectedListing.zipCode})`}
                  </div>
                )}

                {selectedListing.description && (
                  <p className="text-sm text-muted-foreground" data-testid="text-detail-description">
                    {selectedListing.description}
                  </p>
                )}

                <div className="border-t pt-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedListing.seller.imageUrls?.[0]} />
                      <AvatarFallback>
                        {selectedListing.seller.displayName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium" data-testid="text-seller-name">
                        {selectedListing.seller.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">Seller</p>
                    </div>
                  </div>
                </div>

                {user && user.id !== selectedListing.sellerId && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleMessageSeller(selectedListing.sellerId)}
                    data-testid="button-message-seller"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message Seller
                  </Button>
                )}

                {!user && (
                  <p className="text-center text-sm text-muted-foreground">
                    Log in to message this seller
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
      </div>
    </Layout>
  );
}
