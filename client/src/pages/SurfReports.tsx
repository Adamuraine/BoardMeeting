import { useLocations, useFavoriteLocations, useToggleFavorite } from "@/hooks/use-locations";
import { Layout } from "@/components/Layout";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Wind, TrendingUp, Lock, Calendar, Camera, ExternalLink, Search, Plus, Star, Waves, Compass, Thermometer, X, ChevronDown, Globe, Check, Activity, Bell, BellRing, Trash2, CalendarCheck, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { PremiumModal } from "@/components/PremiumModal";
import { useMyProfile, useUpdateProfile } from "@/hooks/use-profiles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SurfAlert } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PostWithUser } from "@shared/schema";
import { SafeImage } from "@/components/SafeImage";
import { WindModel } from "@/components/WindModel";
import { SwellModel } from "@/components/SwellModel";

// Worldwide surf spots database with hierarchical location data
type SurfSpot = {
  name: string;
  continent: string;
  country: string;
  state: string;
  area: string;
  lat: number;
  lng: number;
};

const WORLDWIDE_SPOTS: SurfSpot[] = [
  // North America - USA - California - Northern California
  { name: "Mavericks", continent: "North America", country: "USA", state: "California", area: "Half Moon Bay", lat: 37.4950, lng: -122.4960 },
  { name: "Pillar Point", continent: "North America", country: "USA", state: "California", area: "Half Moon Bay", lat: 37.4944, lng: -122.4963 },
  { name: "Rockaway Beach", continent: "North America", country: "USA", state: "California", area: "Pacifica", lat: 37.6068, lng: -122.4952 },
  { name: "Linda Mar", continent: "North America", country: "USA", state: "California", area: "Pacifica", lat: 37.5927, lng: -122.5003 },
  { name: "Ocean Beach SF", continent: "North America", country: "USA", state: "California", area: "San Francisco", lat: 37.7590, lng: -122.5107 },
  { name: "Fort Point", continent: "North America", country: "USA", state: "California", area: "San Francisco", lat: 37.8106, lng: -122.4769 },
  { name: "Bolinas", continent: "North America", country: "USA", state: "California", area: "Marin County", lat: 37.9093, lng: -122.6869 },
  { name: "Stinson Beach", continent: "North America", country: "USA", state: "California", area: "Marin County", lat: 37.9003, lng: -122.6436 },
  { name: "Bodega Bay", continent: "North America", country: "USA", state: "California", area: "Sonoma County", lat: 38.3330, lng: -123.0481 },
  { name: "Salmon Creek", continent: "North America", country: "USA", state: "California", area: "Sonoma County", lat: 38.3517, lng: -123.0653 },
  // North America - USA - California - Santa Cruz
  { name: "Steamer Lane", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 36.9514, lng: -122.0264 },
  { name: "Pleasure Point", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 36.9611, lng: -121.9678 },
  { name: "The Hook", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 36.9628, lng: -121.9653 },
  { name: "Capitola", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 36.9758, lng: -121.9533 },
  { name: "Manresa State Beach", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 36.9408, lng: -121.8650 },
  { name: "Waddell Creek", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 37.1006, lng: -122.2761 },
  { name: "Scott Creek", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 37.0456, lng: -122.2314 },
  { name: "Davenport Landing", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 37.0103, lng: -122.1953 },
  { name: "Natural Bridges", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 36.9519, lng: -122.0575 },
  { name: "Cowell's Beach", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 36.9622, lng: -122.0225 },
  // North America - USA - California - Monterey
  { name: "Asilomar State Beach", continent: "North America", country: "USA", state: "California", area: "Monterey", lat: 36.6189, lng: -121.9353 },
  { name: "Carmel Beach", continent: "North America", country: "USA", state: "California", area: "Monterey", lat: 36.5547, lng: -121.9275 },
  { name: "Moss Landing", continent: "North America", country: "USA", state: "California", area: "Monterey", lat: 36.8042, lng: -121.7869 },
  { name: "Marina State Beach", continent: "North America", country: "USA", state: "California", area: "Monterey", lat: 36.6942, lng: -121.8089 },
  // North America - USA - California - San Luis Obispo
  { name: "Morro Bay", continent: "North America", country: "USA", state: "California", area: "San Luis Obispo", lat: 35.3711, lng: -120.8683 },
  { name: "Morro Strand", continent: "North America", country: "USA", state: "California", area: "San Luis Obispo", lat: 35.3889, lng: -120.8650 },
  { name: "Cayucos Pier", continent: "North America", country: "USA", state: "California", area: "San Luis Obispo", lat: 35.4428, lng: -120.9022 },
  { name: "Pismo Beach Pier", continent: "North America", country: "USA", state: "California", area: "San Luis Obispo", lat: 35.1428, lng: -120.6417 },
  { name: "Avila Beach", continent: "North America", country: "USA", state: "California", area: "San Luis Obispo", lat: 35.1797, lng: -120.7319 },
  { name: "Shell Beach", continent: "North America", country: "USA", state: "California", area: "San Luis Obispo", lat: 35.1608, lng: -120.6675 },
  // North America - USA - California - Santa Barbara County
  { name: "Rincon", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.3736, lng: -119.4765 },
  { name: "Leadbetter Beach", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.4025, lng: -119.7064 },
  { name: "Campus Point UCSB", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.4061, lng: -119.8414 },
  { name: "Goleta Beach", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.4133, lng: -119.8289 },
  { name: "El Capitan State Beach", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.4578, lng: -120.0231 },
  { name: "Refugio State Beach", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.4625, lng: -120.0703 },
  { name: "Jalama Beach", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.5042, lng: -120.5006 },
  { name: "Carpinteria State Beach", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.3906, lng: -119.5164 },
  // North America - USA - California - Ventura County
  { name: "Ventura Point", continent: "North America", country: "USA", state: "California", area: "Ventura County", lat: 34.2739, lng: -119.3050 },
  { name: "C Street", continent: "North America", country: "USA", state: "California", area: "Ventura County", lat: 34.2747, lng: -119.2981 },
  { name: "Ventura Pier", continent: "North America", country: "USA", state: "California", area: "Ventura County", lat: 34.2739, lng: -119.2936 },
  { name: "Silver Strand", continent: "North America", country: "USA", state: "California", area: "Ventura County", lat: 34.1639, lng: -119.2156 },
  { name: "Port Hueneme Pier", continent: "North America", country: "USA", state: "California", area: "Ventura County", lat: 34.1472, lng: -119.2028 },
  { name: "County Line", continent: "North America", country: "USA", state: "California", area: "Ventura County", lat: 34.0514, lng: -118.9664 },
  // North America - USA - California - Los Angeles County - Malibu
  { name: "Malibu Surfrider", continent: "North America", country: "USA", state: "California", area: "Malibu", lat: 34.0359, lng: -118.6781 },
  { name: "First Point Malibu", continent: "North America", country: "USA", state: "California", area: "Malibu", lat: 34.0361, lng: -118.6789 },
  { name: "Second Point Malibu", continent: "North America", country: "USA", state: "California", area: "Malibu", lat: 34.0358, lng: -118.6769 },
  { name: "Third Point Malibu", continent: "North America", country: "USA", state: "California", area: "Malibu", lat: 34.0356, lng: -118.6744 },
  { name: "Zuma Beach", continent: "North America", country: "USA", state: "California", area: "Malibu", lat: 34.0153, lng: -118.8222 },
  { name: "Point Dume", continent: "North America", country: "USA", state: "California", area: "Malibu", lat: 34.0019, lng: -118.8069 },
  { name: "Leo Carrillo", continent: "North America", country: "USA", state: "California", area: "Malibu", lat: 34.0436, lng: -118.9322 },
  { name: "Topanga Beach", continent: "North America", country: "USA", state: "California", area: "Malibu", lat: 34.0397, lng: -118.5781 },
  // North America - USA - California - Los Angeles County - LA Beach Cities
  { name: "Santa Monica Pier", continent: "North America", country: "USA", state: "California", area: "LA Beach Cities", lat: 34.0089, lng: -118.4983 },
  { name: "Venice Beach Breakwater", continent: "North America", country: "USA", state: "California", area: "LA Beach Cities", lat: 33.9850, lng: -118.4731 },
  { name: "El Porto", continent: "North America", country: "USA", state: "California", area: "LA Beach Cities", lat: 33.9003, lng: -118.4175 },
  { name: "Manhattan Beach Pier", continent: "North America", country: "USA", state: "California", area: "LA Beach Cities", lat: 33.8847, lng: -118.4111 },
  { name: "Hermosa Beach Pier", continent: "North America", country: "USA", state: "California", area: "LA Beach Cities", lat: 33.8622, lng: -118.4003 },
  { name: "Redondo Breakwater", continent: "North America", country: "USA", state: "California", area: "LA Beach Cities", lat: 33.8478, lng: -118.3958 },
  { name: "Torrance Beach", continent: "North America", country: "USA", state: "California", area: "LA Beach Cities", lat: 33.8142, lng: -118.3944 },
  { name: "RAT Beach", continent: "North America", country: "USA", state: "California", area: "LA Beach Cities", lat: 33.8039, lng: -118.3939 },
  // North America - USA - California - Los Angeles County - South Bay / Palos Verdes
  { name: "Lunada Bay", continent: "North America", country: "USA", state: "California", area: "Palos Verdes", lat: 33.7622, lng: -118.4258 },
  { name: "Haggerty's", continent: "North America", country: "USA", state: "California", area: "Palos Verdes", lat: 33.7467, lng: -118.4156 },
  { name: "Cabrillo Beach", continent: "North America", country: "USA", state: "California", area: "San Pedro", lat: 33.7083, lng: -118.2756 },
  // North America - USA - California - Los Angeles County - Long Beach/Seal Beach
  { name: "Long Beach", continent: "North America", country: "USA", state: "California", area: "Long Beach", lat: 33.7611, lng: -118.1892 },
  { name: "Seal Beach Pier", continent: "North America", country: "USA", state: "California", area: "Seal Beach", lat: 33.7417, lng: -118.1047 },
  // North America - USA - California - Orange County
  { name: "Huntington Beach Pier", continent: "North America", country: "USA", state: "California", area: "Huntington Beach", lat: 33.6556, lng: -117.9993 },
  { name: "Huntington Cliffs", continent: "North America", country: "USA", state: "California", area: "Huntington Beach", lat: 33.6514, lng: -117.9986 },
  { name: "Bolsa Chica State Beach", continent: "North America", country: "USA", state: "California", area: "Huntington Beach", lat: 33.6989, lng: -118.0494 },
  { name: "56th Street", continent: "North America", country: "USA", state: "California", area: "Newport Beach", lat: 33.6147, lng: -117.9358 },
  { name: "Newport Pier", continent: "North America", country: "USA", state: "California", area: "Newport Beach", lat: 33.6069, lng: -117.9289 },
  { name: "The Wedge", continent: "North America", country: "USA", state: "California", area: "Newport Beach", lat: 33.5931, lng: -117.8822 },
  { name: "Balboa Pier", continent: "North America", country: "USA", state: "California", area: "Newport Beach", lat: 33.5978, lng: -117.9022 },
  { name: "Corona del Mar", continent: "North America", country: "USA", state: "California", area: "Newport Beach", lat: 33.5922, lng: -117.8692 },
  { name: "Crystal Cove", continent: "North America", country: "USA", state: "California", area: "Laguna Beach", lat: 33.5697, lng: -117.8392 },
  { name: "Reef Point", continent: "North America", country: "USA", state: "California", area: "Laguna Beach", lat: 33.5392, lng: -117.7917 },
  { name: "Brooks Street", continent: "North America", country: "USA", state: "California", area: "Laguna Beach", lat: 33.5447, lng: -117.7986 },
  { name: "Thalia Street", continent: "North America", country: "USA", state: "California", area: "Laguna Beach", lat: 33.5411, lng: -117.7958 },
  { name: "Salt Creek", continent: "North America", country: "USA", state: "California", area: "Dana Point", lat: 33.4753, lng: -117.7231 },
  { name: "Strands Beach", continent: "North America", country: "USA", state: "California", area: "Dana Point", lat: 33.4739, lng: -117.7150 },
  { name: "Doheny State Beach", continent: "North America", country: "USA", state: "California", area: "Dana Point", lat: 33.4611, lng: -117.6897 },
  { name: "Capistrano Beach", continent: "North America", country: "USA", state: "California", area: "Dana Point", lat: 33.4511, lng: -117.6694 },
  // North America - USA - California - San Clemente
  { name: "Trestles", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.3825, lng: -117.5889 },
  { name: "Lowers", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.3839, lng: -117.5897 },
  { name: "Uppers", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.3864, lng: -117.5911 },
  { name: "Old Man's", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.3853, lng: -117.5903 },
  { name: "Trails", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.3911, lng: -117.5919 },
  { name: "San Clemente Pier", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.4181, lng: -117.6211 },
  { name: "T-Street", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.4233, lng: -117.6283 },
  { name: "Calafia", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.4108, lng: -117.6150 },
  { name: "Cotton's Point", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.3975, lng: -117.5975 },
  { name: "Church", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.3950, lng: -117.5958 },
  // North America - USA - California - San Diego North County
  { name: "San Onofre", continent: "North America", country: "USA", state: "California", area: "Oceanside", lat: 33.3772, lng: -117.5675 },
  { name: "Oceanside Pier", continent: "North America", country: "USA", state: "California", area: "Oceanside", lat: 33.1936, lng: -117.3831 },
  { name: "Oceanside Harbor", continent: "North America", country: "USA", state: "California", area: "Oceanside", lat: 33.2092, lng: -117.3953 },
  { name: "Buccaneer Beach", continent: "North America", country: "USA", state: "California", area: "Oceanside", lat: 33.1797, lng: -117.3725 },
  { name: "Carlsbad State Beach", continent: "North America", country: "USA", state: "California", area: "Carlsbad", lat: 33.1597, lng: -117.3561 },
  { name: "Tamarack", continent: "North America", country: "USA", state: "California", area: "Carlsbad", lat: 33.1444, lng: -117.3464 },
  { name: "Ponto Beach", continent: "North America", country: "USA", state: "California", area: "Carlsbad", lat: 33.0869, lng: -117.3136 },
  { name: "South Ponto", continent: "North America", country: "USA", state: "California", area: "Carlsbad", lat: 33.0808, lng: -117.3097 },
  { name: "Leucadia State Beach", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0614, lng: -117.2992 },
  { name: "Grandview", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0506, lng: -117.2969 },
  { name: "Beacons", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0453, lng: -117.2958 },
  { name: "Stone Steps", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0403, lng: -117.2944 },
  { name: "Moonlight Beach", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0378, lng: -117.2936 },
  { name: "D Street", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0356, lng: -117.2931 },
  { name: "Swami's", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0347, lng: -117.2931 },
  { name: "Pipes", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0283, lng: -117.2914 },
  { name: "Cardiff Reef", continent: "North America", country: "USA", state: "California", area: "Cardiff", lat: 33.0208, lng: -117.2892 },
  { name: "San Elijo State Beach", continent: "North America", country: "USA", state: "California", area: "Cardiff", lat: 33.0136, lng: -117.2872 },
  { name: "Seaside Reef", continent: "North America", country: "USA", state: "California", area: "Solana Beach", lat: 32.9953, lng: -117.2761 },
  { name: "Fletcher Cove", continent: "North America", country: "USA", state: "California", area: "Solana Beach", lat: 32.9792, lng: -117.2711 },
  { name: "Del Mar", continent: "North America", country: "USA", state: "California", area: "Del Mar", lat: 32.9578, lng: -117.2656 },
  { name: "15th Street Del Mar", continent: "North America", country: "USA", state: "California", area: "Del Mar", lat: 32.9567, lng: -117.2650 },
  { name: "Torrey Pines State Beach", continent: "North America", country: "USA", state: "California", area: "Del Mar", lat: 32.9311, lng: -117.2578 },
  // North America - USA - California - San Diego Central
  { name: "Black's Beach", continent: "North America", country: "USA", state: "California", area: "La Jolla", lat: 32.8894, lng: -117.2528 },
  { name: "Scripps Pier", continent: "North America", country: "USA", state: "California", area: "La Jolla", lat: 32.8661, lng: -117.2547 },
  { name: "La Jolla Shores", continent: "North America", country: "USA", state: "California", area: "La Jolla", lat: 32.8592, lng: -117.2567 },
  { name: "Hospitals", continent: "North America", country: "USA", state: "California", area: "La Jolla", lat: 32.8536, lng: -117.2697 },
  { name: "Windansea", continent: "North America", country: "USA", state: "California", area: "La Jolla", lat: 32.8314, lng: -117.2781 },
  { name: "Big Rock", continent: "North America", country: "USA", state: "California", area: "La Jolla", lat: 32.8283, lng: -117.2792 },
  { name: "Bird Rock", continent: "North America", country: "USA", state: "California", area: "La Jolla", lat: 32.8164, lng: -117.2694 },
  { name: "Tourmaline", continent: "North America", country: "USA", state: "California", area: "Pacific Beach", lat: 32.8056, lng: -117.2631 },
  { name: "Pacific Beach Point", continent: "North America", country: "USA", state: "California", area: "Pacific Beach", lat: 32.8006, lng: -117.2586 },
  { name: "Law Street", continent: "North America", country: "USA", state: "California", area: "Pacific Beach", lat: 32.7989, lng: -117.2569 },
  { name: "Crystal Pier", continent: "North America", country: "USA", state: "California", area: "Pacific Beach", lat: 32.7933, lng: -117.2556 },
  { name: "North Garbage", continent: "North America", country: "USA", state: "California", area: "Pacific Beach", lat: 32.7886, lng: -117.2547 },
  { name: "South Mission Jetty", continent: "North America", country: "USA", state: "California", area: "Mission Beach", lat: 32.7650, lng: -117.2531 },
  { name: "Mission Beach", continent: "North America", country: "USA", state: "California", area: "Mission Beach", lat: 32.7725, lng: -117.2533 },
  { name: "Belmont Park", continent: "North America", country: "USA", state: "California", area: "Mission Beach", lat: 32.7703, lng: -117.2528 },
  // North America - USA - California - San Diego South
  { name: "Ocean Beach Pier", continent: "North America", country: "USA", state: "California", area: "Ocean Beach", lat: 32.7492, lng: -117.2528 },
  { name: "Ocean Beach Jetty", continent: "North America", country: "USA", state: "California", area: "Ocean Beach", lat: 32.7539, lng: -117.2539 },
  { name: "Sunset Cliffs", continent: "North America", country: "USA", state: "California", area: "Ocean Beach", lat: 32.7236, lng: -117.2550 },
  { name: "Garbage Beach", continent: "North America", country: "USA", state: "California", area: "Ocean Beach", lat: 32.7322, lng: -117.2553 },
  { name: "Ab's", continent: "North America", country: "USA", state: "California", area: "Ocean Beach", lat: 32.7197, lng: -117.2547 },
  { name: "Point Loma", continent: "North America", country: "USA", state: "California", area: "Point Loma", lat: 32.6744, lng: -117.2453 },
  { name: "Coronado Beach", continent: "North America", country: "USA", state: "California", area: "Coronado", lat: 32.6836, lng: -117.1892 },
  { name: "Silver Strand State Beach", continent: "North America", country: "USA", state: "California", area: "Coronado", lat: 32.6300, lng: -117.1419 },
  { name: "Imperial Beach Pier", continent: "North America", country: "USA", state: "California", area: "Imperial Beach", lat: 32.5797, lng: -117.1342 },
  { name: "Tijuana Sloughs", continent: "North America", country: "USA", state: "California", area: "Imperial Beach", lat: 32.5517, lng: -117.1275 },
  // North America - USA - Hawaii - Oahu North Shore
  { name: "Pipeline", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6650, lng: -158.0539 },
  { name: "Backdoor", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6650, lng: -158.0530 },
  { name: "Off The Wall", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6647, lng: -158.0517 },
  { name: "Sunset Beach", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6781, lng: -158.0417 },
  { name: "Waimea Bay", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6417, lng: -158.0656 },
  { name: "Rocky Point", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6667, lng: -158.0500 },
  { name: "V-Land", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6833, lng: -158.0333 },
  { name: "Log Cabins", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6625, lng: -158.0558 },
  { name: "Rockpiles", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6639, lng: -158.0547 },
  { name: "Haleiwa", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.5944, lng: -158.1028 },
  { name: "Laniakea", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6183, lng: -158.0822 },
  { name: "Chuns Reef", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6100, lng: -158.0883 },
  { name: "Velzyland", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6847, lng: -158.0319 },
  { name: "Phantoms", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6847, lng: -158.0278 },
  // North America - USA - Hawaii - Oahu South Shore
  { name: "Ala Moana Bowls", continent: "North America", country: "USA", state: "Hawaii", area: "South Shore, Oahu", lat: 21.2889, lng: -157.8506 },
  { name: "Kaisers", continent: "North America", country: "USA", state: "Hawaii", area: "South Shore, Oahu", lat: 21.2708, lng: -157.8331 },
  { name: "Canoes", continent: "North America", country: "USA", state: "Hawaii", area: "South Shore, Oahu", lat: 21.2714, lng: -157.8300 },
  { name: "Queens", continent: "North America", country: "USA", state: "Hawaii", area: "South Shore, Oahu", lat: 21.2714, lng: -157.8278 },
  { name: "Publics", continent: "North America", country: "USA", state: "Hawaii", area: "South Shore, Oahu", lat: 21.2661, lng: -157.8217 },
  { name: "Diamond Head", continent: "North America", country: "USA", state: "Hawaii", area: "South Shore, Oahu", lat: 21.2564, lng: -157.8067 },
  { name: "Cliffs", continent: "North America", country: "USA", state: "Hawaii", area: "South Shore, Oahu", lat: 21.2539, lng: -157.8025 },
  { name: "Tonggs", continent: "North America", country: "USA", state: "Hawaii", area: "South Shore, Oahu", lat: 21.2519, lng: -157.7981 },
  // North America - USA - Hawaii - Oahu West Side
  { name: "Makaha", continent: "North America", country: "USA", state: "Hawaii", area: "West Side, Oahu", lat: 21.4750, lng: -158.2167 },
  { name: "Yokohama Bay", continent: "North America", country: "USA", state: "Hawaii", area: "West Side, Oahu", lat: 21.5500, lng: -158.2500 },
  // North America - USA - Hawaii - Maui
  { name: "Jaws (Peahi)", continent: "North America", country: "USA", state: "Hawaii", area: "Maui", lat: 20.9425, lng: -156.2997 },
  { name: "Honolua Bay", continent: "North America", country: "USA", state: "Hawaii", area: "Maui", lat: 21.0144, lng: -156.6356 },
  { name: "Hookipa", continent: "North America", country: "USA", state: "Hawaii", area: "Maui", lat: 20.9333, lng: -156.3500 },
  { name: "Lahaina Harbor", continent: "North America", country: "USA", state: "Hawaii", area: "Maui", lat: 20.8708, lng: -156.6758 },
  { name: "Lanes", continent: "North America", country: "USA", state: "Hawaii", area: "Maui", lat: 20.8833, lng: -156.4333 },
  { name: "Kanaha", continent: "North America", country: "USA", state: "Hawaii", area: "Maui", lat: 20.9083, lng: -156.4333 },
  // North America - USA - Hawaii - Kauai
  { name: "Hanalei Bay", continent: "North America", country: "USA", state: "Hawaii", area: "Kauai", lat: 22.2042, lng: -159.5028 },
  { name: "Tunnels", continent: "North America", country: "USA", state: "Hawaii", area: "Kauai", lat: 22.2222, lng: -159.5611 },
  { name: "Poipu Beach", continent: "North America", country: "USA", state: "Hawaii", area: "Kauai", lat: 21.8728, lng: -159.4547 },
  { name: "Pakala", continent: "North America", country: "USA", state: "Hawaii", area: "Kauai", lat: 21.8889, lng: -159.6833 },
  { name: "Polihale", continent: "North America", country: "USA", state: "Hawaii", area: "Kauai", lat: 22.0833, lng: -159.7667 },
  // North America - USA - Hawaii - Big Island
  { name: "Honolii", continent: "North America", country: "USA", state: "Hawaii", area: "Big Island", lat: 19.7833, lng: -155.0833 },
  { name: "Pine Trees", continent: "North America", country: "USA", state: "Hawaii", area: "Big Island", lat: 19.7333, lng: -156.0333 },
  { name: "Banyans", continent: "North America", country: "USA", state: "Hawaii", area: "Big Island", lat: 19.6667, lng: -155.9917 },
  // North America - USA - East Coast - New Jersey
  { name: "Long Beach Island", continent: "North America", country: "USA", state: "New Jersey", area: "LBI", lat: 39.6528, lng: -74.1258 },
  { name: "Manasquan Inlet", continent: "North America", country: "USA", state: "New Jersey", area: "Manasquan", lat: 40.1072, lng: -74.0317 },
  { name: "Jenkinson's", continent: "North America", country: "USA", state: "New Jersey", area: "Point Pleasant", lat: 40.0842, lng: -74.0458 },
  { name: "Belmar", continent: "North America", country: "USA", state: "New Jersey", area: "Belmar", lat: 40.1767, lng: -74.0167 },
  { name: "Asbury Park", continent: "North America", country: "USA", state: "New Jersey", area: "Asbury Park", lat: 40.2206, lng: -73.9978 },
  { name: "Sandy Hook", continent: "North America", country: "USA", state: "New Jersey", area: "Highlands", lat: 40.4631, lng: -73.9847 },
  { name: "Ocean City NJ", continent: "North America", country: "USA", state: "New Jersey", area: "Ocean City", lat: 39.2778, lng: -74.5750 },
  { name: "Wildwood", continent: "North America", country: "USA", state: "New Jersey", area: "Wildwood", lat: 38.9917, lng: -74.8139 },
  // North America - USA - East Coast - New York
  { name: "Montauk", continent: "North America", country: "USA", state: "New York", area: "Long Island", lat: 41.0361, lng: -71.9431 },
  { name: "Ditch Plains", continent: "North America", country: "USA", state: "New York", area: "Montauk", lat: 41.0508, lng: -71.9325 },
  { name: "Long Beach NY", continent: "North America", country: "USA", state: "New York", area: "Long Beach", lat: 40.5881, lng: -73.6579 },
  { name: "Rockaway Beach", continent: "North America", country: "USA", state: "New York", area: "Queens", lat: 40.5833, lng: -73.8167 },
  { name: "Fire Island", continent: "North America", country: "USA", state: "New York", area: "Long Island", lat: 40.6381, lng: -73.1700 },
  // North America - USA - East Coast - North Carolina
  { name: "Cape Hatteras", continent: "North America", country: "USA", state: "North Carolina", area: "Outer Banks", lat: 35.2236, lng: -75.5347 },
  { name: "Rodanthe", continent: "North America", country: "USA", state: "North Carolina", area: "Outer Banks", lat: 35.5939, lng: -75.4683 },
  { name: "Buxton", continent: "North America", country: "USA", state: "North Carolina", area: "Outer Banks", lat: 35.2676, lng: -75.5425 },
  { name: "Frisco Pier", continent: "North America", country: "USA", state: "North Carolina", area: "Outer Banks", lat: 35.2367, lng: -75.6267 },
  { name: "Ocracoke", continent: "North America", country: "USA", state: "North Carolina", area: "Outer Banks", lat: 35.1147, lng: -75.9847 },
  { name: "Jennette's Pier", continent: "North America", country: "USA", state: "North Carolina", area: "Nags Head", lat: 35.9106, lng: -75.5969 },
  { name: "Wrightsville Beach", continent: "North America", country: "USA", state: "North Carolina", area: "Wilmington", lat: 34.2133, lng: -77.7867 },
  { name: "Carolina Beach", continent: "North America", country: "USA", state: "North Carolina", area: "Wilmington", lat: 34.0353, lng: -77.8936 },
  // North America - USA - East Coast - South Carolina
  { name: "Folly Beach", continent: "North America", country: "USA", state: "South Carolina", area: "Charleston", lat: 32.6552, lng: -79.9403 },
  { name: "Isle of Palms", continent: "North America", country: "USA", state: "South Carolina", area: "Charleston", lat: 32.7875, lng: -79.7681 },
  { name: "Myrtle Beach", continent: "North America", country: "USA", state: "South Carolina", area: "Myrtle Beach", lat: 33.6891, lng: -78.8867 },
  // North America - USA - East Coast - Florida
  { name: "Sebastian Inlet", continent: "North America", country: "USA", state: "Florida", area: "Melbourne Beach", lat: 27.8583, lng: -80.4481 },
  { name: "Cocoa Beach Pier", continent: "North America", country: "USA", state: "Florida", area: "Cocoa Beach", lat: 28.3725, lng: -80.6067 },
  { name: "Ponce Inlet", continent: "North America", country: "USA", state: "Florida", area: "New Smyrna Beach", lat: 29.0858, lng: -80.9247 },
  { name: "New Smyrna Beach", continent: "North America", country: "USA", state: "Florida", area: "Volusia County", lat: 29.0258, lng: -80.9267 },
  { name: "Jacksonville Beach", continent: "North America", country: "USA", state: "Florida", area: "Jacksonville", lat: 30.2869, lng: -81.3939 },
  { name: "St. Augustine Beach", continent: "North America", country: "USA", state: "Florida", area: "St. Augustine", lat: 29.8517, lng: -81.2692 },
  { name: "Flagler Beach", continent: "North America", country: "USA", state: "Florida", area: "Flagler County", lat: 29.4725, lng: -81.1272 },
  { name: "Reef Road", continent: "North America", country: "USA", state: "Florida", area: "Palm Beach", lat: 26.7061, lng: -80.0333 },
  { name: "Jupiter Inlet", continent: "North America", country: "USA", state: "Florida", area: "Jupiter", lat: 26.9442, lng: -80.0711 },
  { name: "Deerfield Beach", continent: "North America", country: "USA", state: "Florida", area: "Broward County", lat: 26.3178, lng: -80.0739 },
  { name: "Pompano Beach", continent: "North America", country: "USA", state: "Florida", area: "Broward County", lat: 26.2378, lng: -80.0831 },
  // North America - USA - East Coast - Massachusetts/Rhode Island
  { name: "Narragansett", continent: "North America", country: "USA", state: "Rhode Island", area: "Point Judith", lat: 41.4306, lng: -71.4569 },
  { name: "Ruggles", continent: "North America", country: "USA", state: "Rhode Island", area: "Newport", lat: 41.4750, lng: -71.2961 },
  { name: "Nantucket", continent: "North America", country: "USA", state: "Massachusetts", area: "Nantucket Island", lat: 41.2833, lng: -70.0992 },
  { name: "Coast Guard Beach", continent: "North America", country: "USA", state: "Massachusetts", area: "Cape Cod", lat: 41.8525, lng: -69.9503 },
  // North America - USA - East Coast - Virginia/Maryland
  { name: "Virginia Beach", continent: "North America", country: "USA", state: "Virginia", area: "Virginia Beach", lat: 36.8529, lng: -75.9780 },
  { name: "Ocean City MD", continent: "North America", country: "USA", state: "Maryland", area: "Ocean City", lat: 38.3365, lng: -75.0849 },
  // North America - USA - Texas Gulf
  { name: "South Padre Island", continent: "North America", country: "USA", state: "Texas", area: "Padre Island", lat: 26.1078, lng: -97.1655 },
  { name: "Port Aransas", continent: "North America", country: "USA", state: "Texas", area: "Mustang Island", lat: 27.8339, lng: -97.0611 },
  { name: "Galveston", continent: "North America", country: "USA", state: "Texas", area: "Galveston Island", lat: 29.2861, lng: -94.8047 },
  // North America - USA - Pacific Northwest
  { name: "Seaside", continent: "North America", country: "USA", state: "Oregon", area: "Clatsop County", lat: 45.9933, lng: -123.9228 },
  { name: "Cannon Beach", continent: "North America", country: "USA", state: "Oregon", area: "Clatsop County", lat: 45.8917, lng: -123.9614 },
  { name: "Pacific City", continent: "North America", country: "USA", state: "Oregon", area: "Tillamook County", lat: 45.2028, lng: -123.9628 },
  { name: "Short Sands", continent: "North America", country: "USA", state: "Oregon", area: "Oswald West", lat: 45.7597, lng: -123.9603 },
  { name: "Westport", continent: "North America", country: "USA", state: "Washington", area: "Grays Harbor", lat: 46.8908, lng: -124.1044 },
  { name: "Long Beach WA", continent: "North America", country: "USA", state: "Washington", area: "Pacific County", lat: 46.3517, lng: -124.0542 },
  // North America - Mexico - Baja California
  { name: "Todos Santos", continent: "North America", country: "Mexico", state: "Baja California", area: "Ensenada", lat: 31.8167, lng: -116.8000 },
  { name: "San Miguel", continent: "North America", country: "Mexico", state: "Baja California", area: "Ensenada", lat: 31.8958, lng: -116.8292 },
  { name: "K38", continent: "North America", country: "Mexico", state: "Baja California", area: "Rosarito", lat: 32.2986, lng: -117.0778 },
  { name: "K55", continent: "North America", country: "Mexico", state: "Baja California", area: "Rosarito", lat: 32.1667, lng: -117.0833 },
  { name: "K58", continent: "North America", country: "Mexico", state: "Baja California", area: "Rosarito", lat: 32.1333, lng: -117.0917 },
  { name: "Isla Todos Santos", continent: "North America", country: "Mexico", state: "Baja California", area: "Ensenada", lat: 31.8000, lng: -116.8083 },
  { name: "Punta San Jose", continent: "North America", country: "Mexico", state: "Baja California", area: "Ensenada", lat: 31.7500, lng: -116.7500 },
  { name: "Cuatro Casas", continent: "North America", country: "Mexico", state: "Baja California", area: "Ensenada", lat: 31.8042, lng: -116.8125 },
  // North America - Mexico - Baja California Sur
  { name: "Scorpion Bay", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "San Juanico", lat: 26.2333, lng: -111.5500 },
  { name: "Punta Perfecta", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "San Juanico", lat: 26.2417, lng: -111.5583 },
  { name: "Todos Santos BCS", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "Todos Santos", lat: 23.4500, lng: -110.2333 },
  { name: "Los Cerritos", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "Todos Santos", lat: 23.3333, lng: -110.2167 },
  { name: "San Pedrito", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "Todos Santos", lat: 23.4167, lng: -110.2167 },
  { name: "Punta Gaspareno", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "Todos Santos", lat: 23.4083, lng: -110.2250 },
  { name: "Costa Azul", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "San Jose del Cabo", lat: 23.0667, lng: -109.6833 },
  { name: "Zippers", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "San Jose del Cabo", lat: 23.0583, lng: -109.6917 },
  { name: "The Rock", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "San Jose del Cabo", lat: 23.0500, lng: -109.7000 },
  { name: "Monuments", continent: "North America", country: "Mexico", state: "Baja California Sur", area: "Cabo San Lucas", lat: 22.9333, lng: -109.8833 },
  // North America - Mexico - Nayarit
  { name: "Sayulita", continent: "North America", country: "Mexico", state: "Nayarit", area: "Riviera Nayarit", lat: 20.8692, lng: -105.4361 },
  { name: "Punta Mita", continent: "North America", country: "Mexico", state: "Nayarit", area: "Riviera Nayarit", lat: 20.7667, lng: -105.5167 },
  { name: "La Lancha", continent: "North America", country: "Mexico", state: "Nayarit", area: "Punta Mita", lat: 20.7583, lng: -105.5250 },
  { name: "El Faro", continent: "North America", country: "Mexico", state: "Nayarit", area: "Punta Mita", lat: 20.7750, lng: -105.5333 },
  { name: "El Anclote", continent: "North America", country: "Mexico", state: "Nayarit", area: "Punta Mita", lat: 20.7833, lng: -105.5417 },
  { name: "San Pancho", continent: "North America", country: "Mexico", state: "Nayarit", area: "Riviera Nayarit", lat: 20.9167, lng: -105.4000 },
  { name: "Lo de Marcos", continent: "North America", country: "Mexico", state: "Nayarit", area: "Riviera Nayarit", lat: 20.9500, lng: -105.3667 },
  { name: "Chacala", continent: "North America", country: "Mexico", state: "Nayarit", area: "Riviera Nayarit", lat: 21.1667, lng: -105.2167 },
  { name: "Platanitos", continent: "North America", country: "Mexico", state: "Nayarit", area: "Riviera Nayarit", lat: 21.3333, lng: -105.1333 },
  // North America - Mexico - Jalisco
  { name: "Puerto Vallarta", continent: "North America", country: "Mexico", state: "Jalisco", area: "Bahia de Banderas", lat: 20.6534, lng: -105.2253 },
  { name: "Boca de Tomatlan", continent: "North America", country: "Mexico", state: "Jalisco", area: "Puerto Vallarta", lat: 20.5167, lng: -105.3333 },
  { name: "Yelapa", continent: "North America", country: "Mexico", state: "Jalisco", area: "Puerto Vallarta", lat: 20.4667, lng: -105.4333 },
  { name: "Barra de Navidad", continent: "North America", country: "Mexico", state: "Jalisco", area: "Costalegre", lat: 19.2000, lng: -104.6833 },
  { name: "Melaque", continent: "North America", country: "Mexico", state: "Jalisco", area: "Costalegre", lat: 19.2167, lng: -104.7000 },
  { name: "Tenacatita", continent: "North America", country: "Mexico", state: "Jalisco", area: "Costalegre", lat: 19.2833, lng: -104.8500 },
  // North America - Mexico - Colima
  { name: "Pascuales", continent: "North America", country: "Mexico", state: "Colima", area: "Armeria", lat: 18.7833, lng: -103.9167 },
  { name: "Boca de Pascuales", continent: "North America", country: "Mexico", state: "Colima", area: "Armeria", lat: 18.7750, lng: -103.9083 },
  { name: "Olas Altas", continent: "North America", country: "Mexico", state: "Colima", area: "Manzanillo", lat: 19.0500, lng: -104.3167 },
  { name: "Playa Azul Colima", continent: "North America", country: "Mexico", state: "Colima", area: "Manzanillo", lat: 19.0833, lng: -104.3333 },
  { name: "Santiago Bay", continent: "North America", country: "Mexico", state: "Colima", area: "Manzanillo", lat: 19.1333, lng: -104.4000 },
  { name: "El Paraiso", continent: "North America", country: "Mexico", state: "Colima", area: "Armeria", lat: 18.9333, lng: -103.9667 },
  { name: "Cuyutlan", continent: "North America", country: "Mexico", state: "Colima", area: "Armeria", lat: 18.9167, lng: -104.0667 },
  // North America - Mexico - Michoacan
  { name: "Playa Azul", continent: "North America", country: "Mexico", state: "Michoacan", area: "Lazaro Cardenas", lat: 17.9833, lng: -102.3500 },
  { name: "La Ticla", continent: "North America", country: "Mexico", state: "Michoacan", area: "Aquila", lat: 18.3500, lng: -103.3167 },
  { name: "Nexpa", continent: "North America", country: "Mexico", state: "Michoacan", area: "Lazaro Cardenas", lat: 18.0500, lng: -102.5000 },
  { name: "Rio Nexpa", continent: "North America", country: "Mexico", state: "Michoacan", area: "Lazaro Cardenas", lat: 18.0417, lng: -102.5083 },
  // North America - Mexico - Guerrero
  { name: "Troncones", continent: "North America", country: "Mexico", state: "Guerrero", area: "Ixtapa", lat: 17.7833, lng: -101.7333 },
  { name: "Saladita", continent: "North America", country: "Mexico", state: "Guerrero", area: "Ixtapa", lat: 17.7333, lng: -101.6833 },
  { name: "Ixtapa", continent: "North America", country: "Mexico", state: "Guerrero", area: "Zihuatanejo", lat: 17.6667, lng: -101.6167 },
  { name: "La Ropa", continent: "North America", country: "Mexico", state: "Guerrero", area: "Zihuatanejo", lat: 17.6333, lng: -101.5500 },
  { name: "Playa Linda", continent: "North America", country: "Mexico", state: "Guerrero", area: "Ixtapa", lat: 17.6833, lng: -101.6333 },
  { name: "Petacalco", continent: "North America", country: "Mexico", state: "Guerrero", area: "Lazaro Cardenas", lat: 17.9500, lng: -102.1333 },
  // North America - Mexico - Oaxaca
  { name: "Puerto Escondido", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Playa Zicatela", lat: 15.8611, lng: -97.0667 },
  { name: "Playa Zicatela", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Puerto Escondido", lat: 15.8500, lng: -97.0583 },
  { name: "La Punta", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Puerto Escondido", lat: 15.8333, lng: -97.0417 },
  { name: "Carrizalillo", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Puerto Escondido", lat: 15.8583, lng: -97.0750 },
  { name: "Playa Marinero", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Puerto Escondido", lat: 15.8583, lng: -97.0667 },
  { name: "Barra de la Cruz", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Huatulco", lat: 15.8167, lng: -95.9667 },
  { name: "Salina Cruz", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Isthmus", lat: 16.1667, lng: -95.2000 },
  { name: "Punta Conejo", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Salina Cruz", lat: 16.1333, lng: -95.2333 },
  { name: "Chacahua", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Costa Chica", lat: 15.9667, lng: -97.7333 },
  { name: "Zipolite", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Puerto Angel", lat: 15.6667, lng: -96.5000 },
  { name: "Mazunte", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Puerto Angel", lat: 15.6667, lng: -96.5500 },
  { name: "San Agustinillo", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Puerto Angel", lat: 15.6583, lng: -96.5417 },
  // North America - Mexico - Chiapas
  { name: "Puerto Arista", continent: "North America", country: "Mexico", state: "Chiapas", area: "Tonala", lat: 15.9333, lng: -93.8167 },
  { name: "Boca del Cielo", continent: "North America", country: "Mexico", state: "Chiapas", area: "Tonala", lat: 15.9000, lng: -93.7500 },
  // Central America - Costa Rica
  { name: "Playa Hermosa", continent: "Central America", country: "Costa Rica", state: "Puntarenas", area: "Jaco", lat: 9.5556, lng: -84.5806 },
  { name: "Witch's Rock", continent: "Central America", country: "Costa Rica", state: "Guanacaste", area: "Santa Rosa", lat: 10.9167, lng: -85.7833 },
  { name: "Pavones", continent: "Central America", country: "Costa Rica", state: "Puntarenas", area: "Golfo Dulce", lat: 8.3833, lng: -83.1500 },
  // Central America - Nicaragua - Rivas
  { name: "Popoyo", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "Tola", lat: 11.4833, lng: -85.8833 },
  { name: "Playa Colorado", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "Tola", lat: 11.4667, lng: -85.9000 },
  { name: "Playa Santana", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "Tola", lat: 11.4750, lng: -85.8917 },
  { name: "Manzanillo", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "Tola", lat: 11.4583, lng: -85.9083 },
  { name: "Playa Guasacate", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "Tola", lat: 11.4917, lng: -85.8750 },
  { name: "El Astillero", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "Tola", lat: 11.5000, lng: -85.8667 },
  { name: "Punta Teonoste", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "Tola", lat: 11.4500, lng: -85.9167 },
  { name: "Playa Maderas", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "San Juan del Sur", lat: 11.2333, lng: -85.8833 },
  { name: "Playa Remanso", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "San Juan del Sur", lat: 11.2417, lng: -85.8750 },
  { name: "Playa Hermosa Nicaragua", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "San Juan del Sur", lat: 11.2167, lng: -85.8917 },
  { name: "Playa Yankee", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "San Juan del Sur", lat: 11.2083, lng: -85.9000 },
  { name: "Playa El Coco", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "San Juan del Sur", lat: 11.2000, lng: -85.9083 },
  { name: "San Juan del Sur", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "San Juan del Sur", lat: 11.2500, lng: -85.8667 },
  { name: "La Flor", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "San Juan del Sur", lat: 11.1833, lng: -85.9167 },
  // Central America - Nicaragua - Leon
  { name: "Poneloya", continent: "Central America", country: "Nicaragua", state: "Leon", area: "Leon", lat: 12.3833, lng: -87.0167 },
  { name: "Las Penitas", continent: "Central America", country: "Nicaragua", state: "Leon", area: "Leon", lat: 12.3667, lng: -87.0333 },
  { name: "Miramar", continent: "Central America", country: "Nicaragua", state: "Leon", area: "Leon", lat: 12.3500, lng: -87.0500 },
  // Central America - Nicaragua - Chinandega
  { name: "Aposentillo", continent: "Central America", country: "Nicaragua", state: "Chinandega", area: "Chinandega", lat: 12.6833, lng: -87.4167 },
  { name: "Asseradores", continent: "Central America", country: "Nicaragua", state: "Chinandega", area: "Chinandega", lat: 12.7000, lng: -87.4333 },
  { name: "Boom", continent: "Central America", country: "Nicaragua", state: "Chinandega", area: "Chinandega", lat: 12.6667, lng: -87.4000 },
  { name: "Playa Jiquilillo", continent: "Central America", country: "Nicaragua", state: "Chinandega", area: "Chinandega", lat: 12.7167, lng: -87.4500 },
  // Central America - El Salvador - La Libertad
  { name: "Punta Roca", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.4833, lng: -89.3167 },
  { name: "El Sunzal", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.5000, lng: -89.3667 },
  { name: "El Tunco", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.4917, lng: -89.3833 },
  { name: "La Bocana", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.4833, lng: -89.3500 },
  { name: "El Zonte", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.5083, lng: -89.4000 },
  { name: "Playa El Palmarcito", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.5167, lng: -89.4167 },
  { name: "Km 59", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.5250, lng: -89.4333 },
  { name: "Conchalio", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.4750, lng: -89.2917 },
  { name: "La Paz", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.4917, lng: -89.3000 },
  { name: "Playa San Blas", continent: "Central America", country: "El Salvador", state: "La Libertad", area: "La Libertad", lat: 13.4667, lng: -89.2833 },
  // Central America - El Salvador - Sonsonate
  { name: "Los Cobanos", continent: "Central America", country: "El Salvador", state: "Sonsonate", area: "Acajutla", lat: 13.5167, lng: -89.8000 },
  { name: "Mizata", continent: "Central America", country: "El Salvador", state: "Sonsonate", area: "Acajutla", lat: 13.5000, lng: -89.5000 },
  { name: "Playa Las Flores Sonsonate", continent: "Central America", country: "El Salvador", state: "Sonsonate", area: "Acajutla", lat: 13.5083, lng: -89.5167 },
  // Central America - El Salvador - Usulutan
  { name: "Las Flores", continent: "Central America", country: "El Salvador", state: "Usulutan", area: "Jiquilisco", lat: 13.1667, lng: -88.5833 },
  { name: "Punta Mango", continent: "Central America", country: "El Salvador", state: "Usulutan", area: "Jucuaran", lat: 13.2000, lng: -88.3167 },
  { name: "El Espino", continent: "Central America", country: "El Salvador", state: "Usulutan", area: "Usulutan", lat: 13.1833, lng: -88.5000 },
  // Central America - El Salvador - San Miguel
  { name: "Playa El Cuco", continent: "Central America", country: "El Salvador", state: "San Miguel", area: "Chirilagua", lat: 13.1833, lng: -88.1667 },
  { name: "Playa Torola", continent: "Central America", country: "El Salvador", state: "San Miguel", area: "Chirilagua", lat: 13.1750, lng: -88.1833 },
  { name: "Playa El Tamarindo", continent: "Central America", country: "El Salvador", state: "San Miguel", area: "Chirilagua", lat: 13.1917, lng: -88.1500 },
  // Central America - Guatemala
  { name: "Sipacate", continent: "Central America", country: "Guatemala", state: "Escuintla", area: "El Paredon", lat: 13.9333, lng: -91.1500 },
  { name: "El Paredon", continent: "Central America", country: "Guatemala", state: "Escuintla", area: "Sipacate", lat: 13.9167, lng: -91.1333 },
  { name: "Iztapa", continent: "Central America", country: "Guatemala", state: "Escuintla", area: "Puerto San Jose", lat: 13.9333, lng: -90.7000 },
  // Central America - Honduras
  { name: "Tela", continent: "Central America", country: "Honduras", state: "Atlantida", area: "Tela", lat: 15.7833, lng: -87.4667 },
  { name: "Trujillo", continent: "Central America", country: "Honduras", state: "Colon", area: "Trujillo", lat: 15.9167, lng: -85.9500 },
  // Central America - Panama
  { name: "Santa Catalina", continent: "Central America", country: "Panama", state: "Veraguas", area: "Sona", lat: 7.6333, lng: -81.2500 },
  // South America - Brazil
  { name: "Florianopolis", continent: "South America", country: "Brazil", state: "Santa Catarina", area: "Joaquina Beach", lat: -27.5954, lng: -48.5480 },
  { name: "Itacare", continent: "South America", country: "Brazil", state: "Bahia", area: "Costa do Cacau", lat: -14.2833, lng: -38.9833 },
  // South America - Peru
  { name: "Chicama", continent: "South America", country: "Peru", state: "La Libertad", area: "Puerto Malabrigo", lat: -7.7000, lng: -79.4500 },
  { name: "Punta Rocas", continent: "South America", country: "Peru", state: "Lima", area: "Punta Negra", lat: -12.3667, lng: -76.8167 },
  // South America - Chile
  { name: "Punta de Lobos", continent: "South America", country: "Chile", state: "O'Higgins", area: "Pichilemu", lat: -34.4333, lng: -72.0500 },
  // Europe - Portugal
  { name: "Nazare", continent: "Europe", country: "Portugal", state: "Leiria", area: "Praia do Norte", lat: 39.6017, lng: -9.0714 },
  { name: "Peniche", continent: "Europe", country: "Portugal", state: "Leiria", area: "Supertubos", lat: 39.3558, lng: -9.3808 },
  { name: "Ericeira", continent: "Europe", country: "Portugal", state: "Lisbon", area: "Ribeira d'Ilhas", lat: 38.9631, lng: -9.4194 },
  { name: "Coxos", continent: "Europe", country: "Portugal", state: "Lisbon", area: "Ericeira", lat: 38.9772, lng: -9.4256 },
  { name: "Praia do Guincho", continent: "Europe", country: "Portugal", state: "Lisbon", area: "Cascais", lat: 38.7325, lng: -9.4733 },
  { name: "Costa da Caparica", continent: "Europe", country: "Portugal", state: "Lisbon", area: "Almada", lat: 38.6417, lng: -9.2353 },
  { name: "Sagres", continent: "Europe", country: "Portugal", state: "Algarve", area: "Sagres", lat: 37.0083, lng: -8.9408 },
  { name: "Arrifana", continent: "Europe", country: "Portugal", state: "Algarve", area: "Aljezur", lat: 37.2917, lng: -8.8647 },
  // Europe - France
  { name: "Hossegor", continent: "Europe", country: "France", state: "Landes", area: "La Graviere", lat: 43.6667, lng: -1.4000 },
  { name: "La Graviere", continent: "Europe", country: "France", state: "Landes", area: "Hossegor", lat: 43.6619, lng: -1.4439 },
  { name: "Lacanau", continent: "Europe", country: "France", state: "Gironde", area: "Lacanau-Ocean", lat: 45.0000, lng: -1.2000 },
  { name: "Biarritz", continent: "Europe", country: "France", state: "Pyrenees-Atlantiques", area: "Grande Plage", lat: 43.4833, lng: -1.5583 },
  { name: "Anglet", continent: "Europe", country: "France", state: "Pyrenees-Atlantiques", area: "Chambre d'Amour", lat: 43.5000, lng: -1.5167 },
  { name: "Capbreton", continent: "Europe", country: "France", state: "Landes", area: "La Piste", lat: 43.6417, lng: -1.4333 },
  { name: "Guethary", continent: "Europe", country: "France", state: "Pyrenees-Atlantiques", area: "Parlementia", lat: 43.4167, lng: -1.6167 },
  // Europe - Spain
  { name: "Mundaka", continent: "Europe", country: "Spain", state: "Basque Country", area: "Urdaibai", lat: 43.4078, lng: -2.6981 },
  { name: "Zarautz", continent: "Europe", country: "Spain", state: "Basque Country", area: "Gipuzkoa", lat: 43.2833, lng: -2.1667 },
  { name: "Sopelana", continent: "Europe", country: "Spain", state: "Basque Country", area: "Bizkaia", lat: 43.3833, lng: -2.9833 },
  { name: "Rodiles", continent: "Europe", country: "Spain", state: "Asturias", area: "Villaviciosa", lat: 43.5333, lng: -5.3833 },
  { name: "Salinas", continent: "Europe", country: "Spain", state: "Asturias", area: "Castrillon", lat: 43.5667, lng: -5.9500 },
  { name: "Pantin", continent: "Europe", country: "Spain", state: "Galicia", area: "Valdovino", lat: 43.5667, lng: -8.1167 },
  { name: "Razo", continent: "Europe", country: "Spain", state: "Galicia", area: "Carballo", lat: 43.2833, lng: -8.6333 },
  { name: "El Palmar", continent: "Europe", country: "Spain", state: "Andalusia", area: "Cadiz", lat: 36.2167, lng: -6.0667 },
  { name: "Tarifa", continent: "Europe", country: "Spain", state: "Andalusia", area: "Cadiz", lat: 36.0117, lng: -5.6044 },
  // Europe - Canary Islands
  { name: "El Confital", continent: "Europe", country: "Spain", state: "Canary Islands", area: "Gran Canaria", lat: 28.1667, lng: -15.4333 },
  { name: "El Quemao", continent: "Europe", country: "Spain", state: "Canary Islands", area: "Lanzarote", lat: 29.2167, lng: -13.7833 },
  { name: "El Fronton", continent: "Europe", country: "Spain", state: "Canary Islands", area: "Gran Canaria", lat: 28.0667, lng: -15.4500 },
  { name: "Playa de las Americas", continent: "Europe", country: "Spain", state: "Canary Islands", area: "Tenerife", lat: 28.0667, lng: -16.7333 },
  // Europe - UK & Ireland
  { name: "Bundoran", continent: "Europe", country: "Ireland", state: "Donegal", area: "The Peak", lat: 54.4833, lng: -8.2833 },
  { name: "Lahinch", continent: "Europe", country: "Ireland", state: "Clare", area: "Lahinch", lat: 52.9333, lng: -9.3500 },
  { name: "Mullaghmore", continent: "Europe", country: "Ireland", state: "Sligo", area: "Mullaghmore Head", lat: 54.4667, lng: -8.4500 },
  { name: "Easkey", continent: "Europe", country: "Ireland", state: "Sligo", area: "Easkey", lat: 54.2833, lng: -8.9500 },
  { name: "Newquay", continent: "Europe", country: "UK", state: "Cornwall", area: "Fistral Beach", lat: 50.4167, lng: -5.1000 },
  { name: "Watergate Bay", continent: "Europe", country: "UK", state: "Cornwall", area: "Newquay", lat: 50.4500, lng: -5.0500 },
  { name: "Croyde", continent: "Europe", country: "UK", state: "Devon", area: "North Devon", lat: 51.1167, lng: -4.2333 },
  { name: "Porthcawl", continent: "Europe", country: "UK", state: "Wales", area: "Rest Bay", lat: 51.4833, lng: -3.7167 },
  { name: "Thurso East", continent: "Europe", country: "UK", state: "Scotland", area: "Caithness", lat: 58.5833, lng: -3.5167 },
  // Africa - Morocco
  { name: "Taghazout", continent: "Africa", country: "Morocco", state: "Agadir-Ida-Ou-Tanane", area: "Anchor Point", lat: 30.5456, lng: -9.7089 },
  { name: "Anchor Point", continent: "Africa", country: "Morocco", state: "Agadir-Ida-Ou-Tanane", area: "Taghazout", lat: 30.5417, lng: -9.7139 },
  { name: "Killers", continent: "Africa", country: "Morocco", state: "Agadir-Ida-Ou-Tanane", area: "Taghazout", lat: 30.5375, lng: -9.7097 },
  { name: "Imsouane", continent: "Africa", country: "Morocco", state: "Agadir-Ida-Ou-Tanane", area: "Cathedral", lat: 30.8500, lng: -9.8167 },
  { name: "Safi", continent: "Africa", country: "Morocco", state: "Safi", area: "Safi", lat: 32.3000, lng: -9.2333 },
  { name: "Essaouira", continent: "Africa", country: "Morocco", state: "Essaouira", area: "Moulay Bouzerktoun", lat: 31.4833, lng: -9.7667 },
  // Africa - South Africa
  { name: "Jeffreys Bay", continent: "Africa", country: "South Africa", state: "Eastern Cape", area: "Supertubes", lat: -34.0500, lng: 24.9333 },
  { name: "Supertubes", continent: "Africa", country: "South Africa", state: "Eastern Cape", area: "Jeffreys Bay", lat: -34.0417, lng: 24.9417 },
  { name: "Kitchen Windows", continent: "Africa", country: "South Africa", state: "Eastern Cape", area: "Jeffreys Bay", lat: -34.0439, lng: 24.9383 },
  { name: "Durban", continent: "Africa", country: "South Africa", state: "KwaZulu-Natal", area: "North Beach", lat: -29.8500, lng: 31.0333 },
  { name: "Cave Rock", continent: "Africa", country: "South Africa", state: "KwaZulu-Natal", area: "Bluff", lat: -29.9167, lng: 31.0333 },
  { name: "Muizenberg", continent: "Africa", country: "South Africa", state: "Western Cape", area: "Cape Town", lat: -34.1083, lng: 18.4697 },
  { name: "Long Beach Kommetjie", continent: "Africa", country: "South Africa", state: "Western Cape", area: "Cape Town", lat: -34.1500, lng: 18.3333 },
  { name: "Dungeons", continent: "Africa", country: "South Africa", state: "Western Cape", area: "Hout Bay", lat: -34.0500, lng: 18.3500 },
  // Asia - Indonesia - Bali
  { name: "Uluwatu", continent: "Asia", country: "Indonesia", state: "Bali", area: "Bukit Peninsula", lat: -8.8291, lng: 115.0849 },
  { name: "Padang Padang", continent: "Asia", country: "Indonesia", state: "Bali", area: "Bukit Peninsula", lat: -8.8150, lng: 115.1019 },
  { name: "Bingin", continent: "Asia", country: "Indonesia", state: "Bali", area: "Bukit Peninsula", lat: -8.8100, lng: 115.1017 },
  { name: "Dreamland", continent: "Asia", country: "Indonesia", state: "Bali", area: "Bukit Peninsula", lat: -8.8150, lng: 115.1033 },
  { name: "Impossibles", continent: "Asia", country: "Indonesia", state: "Bali", area: "Bukit Peninsula", lat: -8.8133, lng: 115.1008 },
  { name: "Balangan", continent: "Asia", country: "Indonesia", state: "Bali", area: "Bukit Peninsula", lat: -8.7933, lng: 115.1100 },
  { name: "Canggu", continent: "Asia", country: "Indonesia", state: "Bali", area: "Canggu", lat: -8.6500, lng: 115.1333 },
  { name: "Echo Beach", continent: "Asia", country: "Indonesia", state: "Bali", area: "Canggu", lat: -8.6556, lng: 115.1294 },
  { name: "Keramas", continent: "Asia", country: "Indonesia", state: "Bali", area: "Gianyar", lat: -8.5833, lng: 115.3333 },
  { name: "Medewi", continent: "Asia", country: "Indonesia", state: "Bali", area: "Jembrana", lat: -8.4167, lng: 114.8500 },
  // Asia - Indonesia - Java
  { name: "G-Land", continent: "Asia", country: "Indonesia", state: "Java", area: "Plengkung", lat: -8.4214, lng: 114.3542 },
  { name: "Cimaja", continent: "Asia", country: "Indonesia", state: "Java", area: "West Java", lat: -7.0333, lng: 106.4500 },
  { name: "Batu Karas", continent: "Asia", country: "Indonesia", state: "Java", area: "West Java", lat: -7.7500, lng: 108.4833 },
  { name: "Pacitan", continent: "Asia", country: "Indonesia", state: "Java", area: "East Java", lat: -8.2000, lng: 111.1000 },
  // Asia - Indonesia - Lombok/Sumbawa
  { name: "Desert Point", continent: "Asia", country: "Indonesia", state: "Lombok", area: "Bangko-Bangko", lat: -8.7500, lng: 115.8500 },
  { name: "Kuta Lombok", continent: "Asia", country: "Indonesia", state: "Lombok", area: "Kuta", lat: -8.8833, lng: 116.2833 },
  { name: "Gerupuk", continent: "Asia", country: "Indonesia", state: "Lombok", area: "Kuta", lat: -8.9167, lng: 116.3000 },
  { name: "Selong Belanak", continent: "Asia", country: "Indonesia", state: "Lombok", area: "Kuta", lat: -8.8833, lng: 116.2500 },
  { name: "Lakey Peak", continent: "Asia", country: "Indonesia", state: "Sumbawa", area: "Hu'u", lat: -8.8167, lng: 118.3833 },
  { name: "Yo Yo's", continent: "Asia", country: "Indonesia", state: "Sumbawa", area: "Lakey Beach", lat: -8.8000, lng: 118.3667 },
  { name: "Supersuck", continent: "Asia", country: "Indonesia", state: "Sumbawa", area: "Scar Reef", lat: -9.2333, lng: 119.0333 },
  // Asia - Indonesia - Mentawais
  { name: "Macaronis", continent: "Asia", country: "Indonesia", state: "Mentawai Islands", area: "South Pagai", lat: -2.9667, lng: 100.0167 },
  { name: "Lance's Right (HT's)", continent: "Asia", country: "Indonesia", state: "Mentawai Islands", area: "South Pagai", lat: -2.9583, lng: 100.0250 },
  { name: "Lance's Left", continent: "Asia", country: "Indonesia", state: "Mentawai Islands", area: "Silabu", lat: -2.7667, lng: 99.8833 },
  { name: "Rifles", continent: "Asia", country: "Indonesia", state: "Mentawai Islands", area: "North Pagai", lat: -2.6667, lng: 99.8333 },
  { name: "Telescopes", continent: "Asia", country: "Indonesia", state: "Mentawai Islands", area: "South Pagai", lat: -2.9750, lng: 100.0083 },
  // Asia - Japan
  { name: "Shonan", continent: "Asia", country: "Japan", state: "Kanagawa", area: "Kamakura", lat: 35.3167, lng: 139.4833 },
  { name: "Chiba", continent: "Asia", country: "Japan", state: "Chiba", area: "Ichinomiya", lat: 35.3833, lng: 140.3833 },
  { name: "Tsurigasaki", continent: "Asia", country: "Japan", state: "Chiba", area: "Ichinomiya", lat: 35.3667, lng: 140.4167 },
  { name: "Niijima", continent: "Asia", country: "Japan", state: "Tokyo", area: "Izu Islands", lat: 34.3667, lng: 139.2667 },
  { name: "Miyazaki", continent: "Asia", country: "Japan", state: "Miyazaki", area: "Kizaki Beach", lat: 31.9000, lng: 131.4333 },
  // Asia - Philippines
  { name: "Siargao", continent: "Asia", country: "Philippines", state: "Surigao del Norte", area: "Cloud 9", lat: 9.8500, lng: 126.1500 },
  { name: "Cloud 9", continent: "Asia", country: "Philippines", state: "Surigao del Norte", area: "Siargao", lat: 9.8444, lng: 126.1583 },
  { name: "Tuason Point", continent: "Asia", country: "Philippines", state: "Surigao del Norte", area: "Siargao", lat: 9.8333, lng: 126.1500 },
  { name: "Stimpy's", continent: "Asia", country: "Philippines", state: "Surigao del Norte", area: "Siargao", lat: 9.8417, lng: 126.1583 },
  { name: "La Union", continent: "Asia", country: "Philippines", state: "La Union", area: "San Juan", lat: 16.6833, lng: 120.3167 },
  { name: "Baler", continent: "Asia", country: "Philippines", state: "Aurora", area: "Sabang Beach", lat: 15.7667, lng: 121.5667 },
  // Asia - Sri Lanka
  { name: "Arugam Bay", continent: "Asia", country: "Sri Lanka", state: "Eastern Province", area: "Pottuvil", lat: 6.8500, lng: 81.8333 },
  { name: "Hikkaduwa", continent: "Asia", country: "Sri Lanka", state: "Southern Province", area: "Hikkaduwa", lat: 6.1333, lng: 80.1000 },
  { name: "Weligama", continent: "Asia", country: "Sri Lanka", state: "Southern Province", area: "Weligama Bay", lat: 5.9667, lng: 80.4167 },
  // Asia - Maldives
  { name: "Pasta Point", continent: "Asia", country: "Maldives", state: "North Male Atoll", area: "Thulusdhoo", lat: 4.3833, lng: 73.6333 },
  { name: "Cokes", continent: "Asia", country: "Maldives", state: "North Male Atoll", area: "Thulusdhoo", lat: 4.3750, lng: 73.6417 },
  { name: "Chickens", continent: "Asia", country: "Maldives", state: "North Male Atoll", area: "Thulusdhoo", lat: 4.3917, lng: 73.6250 },
  { name: "Sultans", continent: "Asia", country: "Maldives", state: "North Male Atoll", area: "Kuda Huraa", lat: 4.3333, lng: 73.5667 },
  { name: "Honky's", continent: "Asia", country: "Maldives", state: "North Male Atoll", area: "Kuda Huraa", lat: 4.3250, lng: 73.5583 },
  // Oceania - Australia - Gold Coast/NSW
  { name: "Snapper Rocks", continent: "Oceania", country: "Australia", state: "Queensland", area: "Gold Coast", lat: -28.1658, lng: 153.5500 },
  { name: "Kirra", continent: "Oceania", country: "Australia", state: "Queensland", area: "Gold Coast", lat: -28.1667, lng: 153.5167 },
  { name: "Currumbin", continent: "Oceania", country: "Australia", state: "Queensland", area: "Gold Coast", lat: -28.1333, lng: 153.4833 },
  { name: "Burleigh Heads", continent: "Oceania", country: "Australia", state: "Queensland", area: "Gold Coast", lat: -28.0833, lng: 153.4500 },
  { name: "D-Bah", continent: "Oceania", country: "Australia", state: "Queensland", area: "Gold Coast", lat: -28.1639, lng: 153.5536 },
  { name: "Noosa Heads", continent: "Oceania", country: "Australia", state: "Queensland", area: "Sunshine Coast", lat: -26.3833, lng: 153.0833 },
  { name: "Byron Bay", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Byron Bay", lat: -28.6500, lng: 153.6167 },
  { name: "The Pass", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Byron Bay", lat: -28.6417, lng: 153.6333 },
  { name: "Lennox Head", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Lennox Head", lat: -28.7833, lng: 153.6000 },
  { name: "Angourie", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Yamba", lat: -29.4833, lng: 153.3667 },
  { name: "Crescent Head", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Crescent Head", lat: -31.1833, lng: 152.9833 },
  { name: "Manly Beach", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Sydney", lat: -33.7917, lng: 151.2889 },
  { name: "Bondi Beach", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Sydney", lat: -33.8917, lng: 151.2750 },
  { name: "Dee Why", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Sydney", lat: -33.7500, lng: 151.2917 },
  { name: "Narrabeen", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Sydney", lat: -33.7167, lng: 151.3000 },
  { name: "Cronulla", continent: "Oceania", country: "Australia", state: "New South Wales", area: "Sydney", lat: -34.0500, lng: 151.1500 },
  // Oceania - Australia - Victoria
  { name: "Bells Beach", continent: "Oceania", country: "Australia", state: "Victoria", area: "Torquay", lat: -38.3686, lng: 144.2811 },
  { name: "Winkipop", continent: "Oceania", country: "Australia", state: "Victoria", area: "Torquay", lat: -38.3664, lng: 144.2825 },
  { name: "Johanna Beach", continent: "Oceania", country: "Australia", state: "Victoria", area: "Great Ocean Road", lat: -38.7500, lng: 143.3833 },
  { name: "Gunnamatta", continent: "Oceania", country: "Australia", state: "Victoria", area: "Mornington Peninsula", lat: -38.4500, lng: 144.8833 },
  { name: "Phillip Island", continent: "Oceania", country: "Australia", state: "Victoria", area: "Woolamai", lat: -38.5500, lng: 145.3333 },
  // Oceania - Australia - Western Australia
  { name: "Margaret River", continent: "Oceania", country: "Australia", state: "Western Australia", area: "Main Break", lat: -33.9556, lng: 114.9931 },
  { name: "The Box", continent: "Oceania", country: "Australia", state: "Western Australia", area: "Margaret River", lat: -33.9833, lng: 114.9667 },
  { name: "North Point", continent: "Oceania", country: "Australia", state: "Western Australia", area: "Margaret River", lat: -33.8833, lng: 114.9833 },
  { name: "Lefthanders", continent: "Oceania", country: "Australia", state: "Western Australia", area: "Margaret River", lat: -33.9500, lng: 114.9750 },
  { name: "Trigg Point", continent: "Oceania", country: "Australia", state: "Western Australia", area: "Perth", lat: -31.8667, lng: 115.7500 },
  { name: "Scarborough", continent: "Oceania", country: "Australia", state: "Western Australia", area: "Perth", lat: -31.8917, lng: 115.7500 },
  { name: "Rottnest Island", continent: "Oceania", country: "Australia", state: "Western Australia", area: "Perth", lat: -32.0000, lng: 115.5000 },
  // Oceania - Fiji
  { name: "Cloudbreak", continent: "Oceania", country: "Fiji", state: "Western Division", area: "Tavarua", lat: -17.8667, lng: 177.1833 },
  { name: "Restaurants", continent: "Oceania", country: "Fiji", state: "Western Division", area: "Tavarua", lat: -17.8500, lng: 177.2000 },
  { name: "Frigates", continent: "Oceania", country: "Fiji", state: "Western Division", area: "Namotu Island", lat: -17.8833, lng: 177.2167 },
  { name: "Swimming Pools", continent: "Oceania", country: "Fiji", state: "Western Division", area: "Namotu Island", lat: -17.8917, lng: 177.2083 },
  // Oceania - French Polynesia
  { name: "Teahupoo", continent: "Oceania", country: "French Polynesia", state: "Tahiti", area: "Teahupoo Village", lat: -17.8500, lng: -149.2667 },
  { name: "Papara", continent: "Oceania", country: "French Polynesia", state: "Tahiti", area: "Papara", lat: -17.7333, lng: -149.5333 },
  // Oceania - New Zealand
  { name: "Raglan", continent: "Oceania", country: "New Zealand", state: "Waikato", area: "Manu Bay", lat: -37.8000, lng: 174.8667 },
  { name: "Manu Bay", continent: "Oceania", country: "New Zealand", state: "Waikato", area: "Raglan", lat: -37.8083, lng: 174.8250 },
  { name: "Whale Bay", continent: "Oceania", country: "New Zealand", state: "Waikato", area: "Raglan", lat: -37.8167, lng: 174.8167 },
  { name: "Indicators", continent: "Oceania", country: "New Zealand", state: "Waikato", area: "Raglan", lat: -37.8083, lng: 174.8333 },
  { name: "Piha", continent: "Oceania", country: "New Zealand", state: "Auckland", area: "West Auckland", lat: -36.9500, lng: 174.4667 },
  { name: "Muriwai", continent: "Oceania", country: "New Zealand", state: "Auckland", area: "West Auckland", lat: -36.8333, lng: 174.4333 },
  { name: "Mount Maunganui", continent: "Oceania", country: "New Zealand", state: "Bay of Plenty", area: "Tauranga", lat: -37.6333, lng: 176.1833 },
  { name: "Gisborne", continent: "Oceania", country: "New Zealand", state: "Gisborne", area: "Wainui Beach", lat: -38.6833, lng: 178.0500 },
  // Oceania - Samoa
  { name: "Aganoa", continent: "Oceania", country: "Samoa", state: "Savai'i", area: "South Coast", lat: -13.8500, lng: -171.7667 },
  // Caribbean
  { name: "Puerto Rico Rincon", continent: "North America", country: "Puerto Rico", state: "Rincon", area: "Rincon", lat: 18.3408, lng: -67.2500 },
  { name: "Maria's", continent: "North America", country: "Puerto Rico", state: "Rincon", area: "Rincon", lat: 18.3500, lng: -67.2583 },
  { name: "Domes", continent: "North America", country: "Puerto Rico", state: "Rincon", area: "Rincon", lat: 18.3583, lng: -67.2667 },
  { name: "Sandy Beach PR", continent: "North America", country: "Puerto Rico", state: "Rincon", area: "Rincon", lat: 18.3417, lng: -67.2417 },
  { name: "Barbados Soup Bowl", continent: "North America", country: "Barbados", state: "St. Joseph", area: "Bathsheba", lat: 13.2167, lng: -59.5167 },
];

function WaveIcon({ height, rating }: { height: number; rating: string }) {
  const color = rating === 'epic' ? '#8b5cf6' : rating === 'good' ? '#10b981' : rating === 'fair' ? '#06b6d4' : '#94a3b8';
  const scale = Math.min(1, Math.max(0.4, height / 8));
  
  return (
    <svg viewBox="0 0 40 30" className="w-full h-8" style={{ transform: `scaleY(${scale})` }}>
      <path
        d="M0 25 Q10 15, 20 20 T40 15 L40 30 L0 30 Z"
        fill={color}
        opacity="0.8"
      />
      <path
        d="M0 22 Q8 12, 18 18 T38 12"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

// Check if coordinates are in California (roughly)
function isCaliforniaCoords(lat: number, lng: number): boolean {
  return lat >= 32.5 && lat <= 42 && lng >= -124.5 && lng <= -114;
}

// Fetch surf data from backend API (priority: Spitcast for CA, then Stormglass, then Open-Meteo)
async function fetchSurfData(lat: number, lng: number, spotName?: string) {
  try {
    // For California spots, try Spitcast first (most accurate for CA)
    if (isCaliforniaCoords(lat, lng)) {
      try {
        const spitcastUrl = spotName 
          ? `/api/surf/spitcast/forecast?name=${encodeURIComponent(spotName)}&lat=${lat}&lng=${lng}`
          : `/api/surf/spitcast/forecast?lat=${lat}&lng=${lng}`;
        
        const spitcastResponse = await fetch(spitcastUrl);
        
        if (spitcastResponse.ok) {
          const spitcastData = await spitcastResponse.json();
          if (spitcastData && spitcastData.length > 0) {
            const spitcastReports = spitcastData.map((report: any) => ({
              date: report.date,
              waveHeightMin: report.waveHeightMin || 1,
              waveHeightMax: report.waveHeightMax || 2,
              rating: report.rating || 'fair',
              windDirection: 'SW',
              period: 10,
              source: 'spitcast',
              spotName: report.spotName,
            }));
            
            if (spitcastReports.length >= 7) {
              return spitcastReports;
            }
            
            try {
              const meteoFallback = await fetch(
                `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&daily=wave_height_max,wave_period_max,wave_direction_dominant&timezone=auto&forecast_days=7`
              );
              const meteoData = await meteoFallback.json();
              if (meteoData.daily) {
                const spitcastDates = new Set(spitcastReports.map((r: any) => r.date));
                const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                const meteoFills = meteoData.daily.time
                  .map((date: string, i: number) => {
                    if (spitcastDates.has(date)) return null;
                    const waveHeightM = meteoData.daily.wave_height_max[i] || 0;
                    const waveHeightFt = Math.round(waveHeightM * 3.28084);
                    const period = meteoData.daily.wave_period_max[i] || 0;
                    const direction = meteoData.daily.wave_direction_dominant[i] || 0;
                    let rating = 'poor';
                    if (waveHeightFt >= 6 && period >= 12) rating = 'epic';
                    else if (waveHeightFt >= 4 && period >= 10) rating = 'good';
                    else if (waveHeightFt >= 2 && period >= 8) rating = 'fair';
                    return {
                      date,
                      waveHeightMin: Math.max(1, waveHeightFt - 1),
                      waveHeightMax: waveHeightFt,
                      rating,
                      windDirection: directions[Math.round(direction / 45) % 8],
                      period,
                      source: 'open-meteo',
                    };
                  })
                  .filter(Boolean);
                return [...spitcastReports, ...meteoFills].sort((a: any, b: any) => a.date.localeCompare(b.date));
              }
            } catch {}
            
            return spitcastReports;
          }
        }
      } catch (spitcastError) {
        console.log('Spitcast not available, trying other sources');
      }
    }

    // Try to find a matching location from the backend (Stormglass data)
    const response = await fetch('/api/locations');
    const locations = await response.json();
    
    const matchingLocation = locations.find((loc: any) => {
      const latDiff = Math.abs(parseFloat(loc.latitude) - lat);
      const lngDiff = Math.abs(parseFloat(loc.longitude) - lng);
      return latDiff < 0.5 && lngDiff < 0.5;
    });
    
    if (matchingLocation && matchingLocation.reports && matchingLocation.reports.length > 0) {
      return matchingLocation.reports.map((report: any) => ({
        date: report.date,
        waveHeightMin: report.waveHeightMin || 1,
        waveHeightMax: report.waveHeightMax || 2,
        rating: report.rating || 'fair',
        windDirection: report.windDirection || 'SW',
        period: report.swellPeriodSec || 10,
        source: 'stormglass',
      }));
    }
    
    // Fallback: fetch from Open-Meteo for spots not in our database
    const meteoResponse = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&daily=wave_height_max,wave_period_max,wave_direction_dominant&timezone=auto&forecast_days=7`
    );
    const data = await meteoResponse.json();
    
    if (!data.daily) return null;
    
    return data.daily.time.map((date: string, i: number) => {
      const waveHeightM = data.daily.wave_height_max[i] || 0;
      const waveHeightFt = Math.round(waveHeightM * 3.28084);
      const period = data.daily.wave_period_max[i] || 0;
      const direction = data.daily.wave_direction_dominant[i] || 0;
      
      let rating = 'poor';
      if (waveHeightFt >= 6 && period >= 12) rating = 'epic';
      else if (waveHeightFt >= 4 && period >= 10) rating = 'good';
      else if (waveHeightFt >= 2 && period >= 8) rating = 'fair';
      
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const windDirection = directions[Math.round(direction / 45) % 8];
      
      return {
        date,
        waveHeightMin: Math.max(1, waveHeightFt - 1),
        waveHeightMax: waveHeightFt,
        rating,
        windDirection,
        period,
        source: 'open-meteo',
      };
    });
  } catch (error) {
    return null;
  }
}

function SpotCard({ spot, onRemove, onAddSpot, allSpots, isPremium, onShowPremium }: { 
  spot: SurfSpot; 
  onRemove: () => void;
  onAddSpot: (spotName: string) => void;
  allSpots: SurfSpot[];
  isPremium?: boolean;
  onShowPremium: () => void;
}) {
  const [selectedSpot, setSelectedSpot] = useState<SurfSpot>(spot);
  const [showSpotSelector, setShowSpotSelector] = useState(false);
  const today = new Date();
  
  const { data: reports, isLoading } = useQuery({
    queryKey: ['surf-data', selectedSpot.name, selectedSpot.lat, selectedSpot.lng],
    queryFn: () => fetchSurfData(selectedSpot.lat, selectedSpot.lng, selectedSpot.name),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
  
  const todayReport = reports?.[0];
  // Show all 7 forecast days, but lock days beyond 2 for free users
  const freeDays = 2;
  const allForecastDays = reports?.slice(1, 8) || [];
  
  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-400 to-slate-500 animate-pulse">
          <Skeleton className="h-6 w-32 bg-white/20 mb-2" />
          <Skeleton className="h-4 w-24 bg-white/20 mb-4" />
          <Skeleton className="h-10 w-20 bg-white/20" />
        </div>
        <div className="bg-card border-x border-b border-border/50 rounded-b-2xl p-3">
          <div className="flex gap-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="flex-1 h-12" />)}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer group relative">
      {/* Remove button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        data-testid={`button-remove-${spot.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      
      {/* Nearby spots selector */}
      <Popover open={showSpotSelector} onOpenChange={setShowSpotSelector}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 left-2 z-10 h-7 px-2 rounded-full bg-black/30 hover:bg-black/50 text-white text-xs gap-1"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-nearby-spots-${spot.name}`}
          >
            <Search className="h-3 w-3" />
            Nearby Spots
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b">
            <p className="text-xs font-medium text-muted-foreground">Spots near {selectedSpot.area}</p>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-2">
              {allSpots
                .filter(s => s.state === selectedSpot.state && s.name !== selectedSpot.name)
                .map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    onAddSpot(s.name);
                    setShowSpotSelector(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm hover:bg-secondary/80 transition-colors"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.area}</p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {allSpots.filter(s => s.state === selectedSpot.state && s.name !== selectedSpot.name).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No other spots in this area</p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      
      {/* Main spot card with gradient based on conditions */}
      <div className={cn(
        "p-4 pt-12 relative",
        todayReport?.rating === 'epic' ? "bg-gradient-to-r from-violet-500 to-purple-600" :
        todayReport?.rating === 'good' ? "bg-gradient-to-r from-emerald-500 to-teal-600" :
        todayReport?.rating === 'fair' ? "bg-gradient-to-r from-cyan-500 to-sky-600" :
        "bg-gradient-to-r from-slate-400 to-slate-500"
      )}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold text-white drop-shadow-sm">
              {selectedSpot.name}
            </h3>
            <p className="text-white/80 text-xs">{selectedSpot.area}, {selectedSpot.state}, {selectedSpot.country}</p>
          </div>
        </div>
        
        {/* Today's conditions - big and bold */}
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-white drop-shadow-md">
              {todayReport?.waveHeightMin || 0}-{todayReport?.waveHeightMax || 0}
            </span>
            <span className="text-lg font-bold text-white/90">ft</span>
          </div>
          <div className="text-right">
            <span className={cn(
              "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
              "bg-white/25 text-white backdrop-blur-sm"
            )}>
              {todayReport?.rating || 'fair'}
            </span>
            <p className="text-white/70 text-[10px] mt-1 flex items-center justify-end gap-1">
              <Compass className="h-3 w-3" />
              {todayReport?.windDirection || 'SW'} swell
            </p>
          </div>
        </div>
      </div>
      
      {/* Forecast strip - 2 days free, remaining locked for premium */}
      <div className="bg-card border-x border-b border-border/50 rounded-b-2xl p-3">
        <div className="flex justify-between gap-1">
          {Array.from({ length: 6 }, (_, idx) => {
            const report = allForecastDays[idx];
            const isLocked = !isPremium && idx >= freeDays;
            
            return (
              <div
                key={idx}
                className={cn(
                  "flex-1 text-center relative",
                  isLocked && "cursor-pointer"
                )}
                onClick={isLocked ? (e) => { e.stopPropagation(); onShowPremium(); } : undefined}
                data-testid={isLocked ? `locked-day-${idx}` : `free-day-${idx}`}
              >
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">
                  {format(addDays(today, idx + 1), 'EEE')}
                </p>
                {isLocked ? (
                  <div className="flex flex-col items-center justify-center opacity-40">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground mt-1">--</p>
                  </div>
                ) : report ? (
                  <>
                    <WaveIcon height={report.waveHeightMax || 2} rating={report.rating || 'fair'} />
                    <p className="text-xs font-bold text-foreground mt-1">
                      {report.waveHeightMin}-{report.waveHeightMax}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-4 w-6 bg-muted/30 rounded animate-pulse" />
                    <p className="text-[10px] text-muted-foreground mt-1">--</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Premium upgrade prompt for free users */}
        {!isPremium && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowPremium();
            }}
            className="w-full mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
            data-testid="button-upgrade-forecast"
          >
            <Lock className="h-3 w-3" />
            <span className="font-medium">Upgrade for $5/mo - 7 Day Forecast</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Hierarchical spot picker component - 5 levels like Surfline
function SpotPicker({ 
  addedSpots, 
  onToggleSpot,
  onClose 
}: { 
  addedSpots: string[]; 
  onToggleSpot: (spotName: string) => void;
  onClose: () => void;
}) {
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get unique continents
  const continents = Array.from(new Set(WORLDWIDE_SPOTS.map(s => s.continent)));
  
  // Get countries for selected continent
  const countries = selectedContinent 
    ? Array.from(new Set(WORLDWIDE_SPOTS.filter(s => s.continent === selectedContinent).map(s => s.country)))
    : [];
    
  // Get states for selected country
  const states = selectedCountry
    ? Array.from(new Set(WORLDWIDE_SPOTS.filter(s => s.country === selectedCountry).map(s => s.state)))
    : [];
  
  // Get areas for selected state
  const areas = selectedState
    ? Array.from(new Set(WORLDWIDE_SPOTS.filter(s => s.state === selectedState).map(s => s.area)))
    : [];
    
  // Get spots for selected area
  const spots = selectedArea
    ? WORLDWIDE_SPOTS.filter(s => s.area === selectedArea)
    : [];
    
  // Search results
  const searchResults = searchQuery.length >= 2
    ? WORLDWIDE_SPOTS.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.country.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  const goBack = () => {
    if (selectedArea) {
      setSelectedArea(null);
    } else if (selectedState) {
      setSelectedState(null);
    } else if (selectedCountry) {
      setSelectedCountry(null);
    } else if (selectedContinent) {
      setSelectedContinent(null);
    }
  };
  
  const currentLevel = selectedArea ? 'spots' : selectedState ? 'areas' : selectedCountry ? 'states' : selectedContinent ? 'countries' : 'continents';
  
  // Step labels for visual hierarchy
  const stepLabels: Record<string, string> = {
    continents: 'Select Region',
    countries: 'Select Country',
    states: 'Select State/Province',
    areas: 'Select City/Area',
    spots: 'Select Spot'
  };

  return (
    <div className="bg-card">
      {/* Header with step indicator */}
      <div className="bg-primary/5 dark:bg-primary/10 px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground text-sm">Add Surf Spot</h3>
          {selectedContinent && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs gap-1"
              onClick={goBack}
            >
              <ChevronDown className="h-3 w-3 rotate-90" />
              Back
            </Button>
          )}
        </div>
        
        {/* Progress steps */}
        <div className="flex items-center gap-1">
          {['continents', 'countries', 'states', 'areas', 'spots'].map((step, idx) => {
            const stepOrder = ['continents', 'countries', 'states', 'areas', 'spots'];
            const currentIdx = stepOrder.indexOf(currentLevel);
            const isActive = idx === currentIdx;
            const isCompleted = idx < currentIdx;
            return (
              <div 
                key={step}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  isActive ? "bg-primary" : isCompleted ? "bg-primary/60" : "bg-muted"
                )}
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{stepLabels[currentLevel]}</p>
      </div>
      
      {/* Search bar */}
      <div className="p-3 border-b bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search all spots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
            data-testid="input-search-spots"
          />
        </div>
      </div>
      
      {/* Breadcrumb */}
      {selectedContinent && !searchQuery && (
        <div className="px-4 py-2 bg-muted/30 border-b">
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[selectedContinent, selectedCountry, selectedState, selectedArea].filter(Boolean).join(' › ')}
          </p>
        </div>
      )}
      
      {searchQuery.length >= 2 ? (
        <ScrollArea className="h-[280px]">
          <div className="p-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No spots found</p>
            ) : (
              searchResults.map((spot) => {
                const isAdded = addedSpots.includes(spot.name);
                return (
                  <button
                    key={spot.name}
                    onClick={() => {
                      onToggleSpot(spot.name);
                      if (!isAdded) onClose();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors border mb-1",
                      isAdded 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "bg-background border-transparent hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-sm">{spot.name}</p>
                      <p className="text-xs text-muted-foreground">{spot.area}, {spot.state}, {spot.country}</p>
                    </div>
                    {isAdded ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="h-[280px]">
          <div className="p-2">
            {currentLevel === 'continents' && continents.map(continent => (
              <button
                key={continent}
                onClick={() => setSelectedContinent(continent)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left bg-background hover:bg-muted/50 border border-transparent hover:border-border transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="font-semibold text-foreground">{continent}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
              </button>
            ))}
            
            {currentLevel === 'countries' && countries.map(country => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left bg-background hover:bg-muted/50 border border-transparent hover:border-border transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="font-semibold text-foreground">{country}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
              </button>
            ))}
            
            {currentLevel === 'states' && states.map(state => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left bg-background hover:bg-muted/50 border border-transparent hover:border-border transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="font-semibold text-foreground">{state}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
              </button>
            ))}
            
            {currentLevel === 'areas' && areas.map(area => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left bg-background hover:bg-muted/50 border border-transparent hover:border-border transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Waves className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="font-semibold text-foreground">{area}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
              </button>
            ))}
            
            {currentLevel === 'spots' && spots.map(spot => {
              const isAdded = addedSpots.includes(spot.name);
              return (
                <button
                  key={spot.name}
                  onClick={() => {
                    onToggleSpot(spot.name);
                    if (!isAdded) onClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left transition-colors border mb-1",
                    isAdded 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-background border-transparent hover:bg-muted/50 hover:border-border"
                  )}
                  data-testid={`button-spot-${spot.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isAdded ? "bg-primary/20" : "bg-sky-100 dark:bg-sky-900/50"
                    )}>
                      <Waves className={cn(
                        "h-4 w-4",
                        isAdded ? "text-primary" : "text-sky-600 dark:text-sky-400"
                      )} />
                    </div>
                    <div>
                      <p className={cn("font-semibold", isAdded && "text-primary")}>{spot.name}</p>
                      <p className="text-xs text-muted-foreground">{spot.area}</p>
                    </div>
                  </div>
                  {isAdded ? <Check className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

const STORAGE_KEY = 'boardmeeting_saved_spots';

const SWELL_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function SurfAlertsSection({ spots, isPremium, onShowPremium }: { 
  spots: SurfSpot[]; 
  isPremium: boolean; 
  onShowPremium: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<string>("");
  const [minHeight, setMinHeight] = useState(3);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [autoBlock, setAutoBlock] = useState(false);

  const { data: alerts = [], isLoading } = useQuery<SurfAlert[]>({
    queryKey: ['/api/surf-alerts'],
    enabled: isPremium,
  });

  const createAlert = useMutation({
    mutationFn: async (data: { spotName: string; spotLat: string; spotLng: string; minHeight: number; swellDirections: string[] | null; autoBlock: boolean }) => {
      const res = await apiRequest("POST", "/api/surf-alerts", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/surf-alerts'] });
      toast({ title: "Alert created", description: "You'll be notified when conditions match" });
      setShowCreateAlert(false);
      setSelectedSpot("");
      setMinHeight(3);
      setSelectedDirections([]);
      setAutoBlock(false);
    },
    onError: () => {
      toast({ title: "Failed to create alert", variant: "destructive" });
    },
  });

  const toggleAlert = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/surf-alerts/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/surf-alerts'] }),
  });

  const toggleAutoBlock = useMutation({
    mutationFn: async ({ id, autoBlock }: { id: number; autoBlock: boolean }) => {
      const res = await apiRequest("PATCH", `/api/surf-alerts/${id}`, { autoBlock });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/surf-alerts'] }),
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/surf-alerts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/surf-alerts'] });
      toast({ title: "Alert deleted" });
    },
  });

  const handleCreateAlert = () => {
    const spot = spots.find(s => s.name === selectedSpot);
    if (!spot) return;
    createAlert.mutate({
      spotName: spot.name,
      spotLat: String(spot.lat),
      spotLng: String(spot.lng),
      minHeight,
      swellDirections: selectedDirections.length > 0 ? selectedDirections : null,
      autoBlock,
    });
  };

  const toggleDirection = (dir: string) => {
    setSelectedDirections(prev => 
      prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir]
    );
  };

  if (!isPremium) {
    return (
      <Card className="p-4" data-testid="surf-alerts-premium-upsell">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <BellRing className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">Surf Alerts & Auto Calendar</h3>
              <UiBadge variant="secondary" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </UiBadge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Go Premium to add surf alerts and put firing surf days in your calendar so you don't miss another swell!
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li className="flex items-center gap-1.5">
                <Bell className="h-3 w-3 text-cyan-500" />
                Set alerts for minimum wave height & swell direction
              </li>
              <li className="flex items-center gap-1.5">
                <CalendarCheck className="h-3 w-3 text-cyan-500" />
                Auto-block calendar when surf forecast meets your criteria
              </li>
            </ul>
            <Button 
              size="sm" 
              className="mt-3 gap-1.5"
              onClick={onShowPremium}
              data-testid="button-upgrade-surf-alerts"
            >
              <Crown className="h-3.5 w-3.5" />
              Upgrade - $5/mo
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4" data-testid="surf-alerts-section">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="font-semibold text-foreground">Surf Alerts</h3>
          {alerts.length > 0 && (
            <UiBadge variant="secondary" className="text-xs">{alerts.length}</UiBadge>
          )}
        </div>
        <Button 
          size="sm" 
          variant="outline"
          className="gap-1.5 rounded-full"
          onClick={() => setShowCreateAlert(!showCreateAlert)}
          data-testid="button-create-surf-alert"
        >
          <Plus className="h-3.5 w-3.5" />
          New Alert
        </Button>
      </div>

      {showCreateAlert && (
        <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 space-y-3" data-testid="surf-alert-create-form">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Spot</label>
            <Select value={selectedSpot} onValueChange={setSelectedSpot}>
              <SelectTrigger data-testid="select-alert-spot">
                <SelectValue placeholder="Select a surf spot" />
              </SelectTrigger>
              <SelectContent>
                {spots.map(s => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Minimum Wave Height (ft)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={25}
                value={minHeight}
                onChange={(e) => setMinHeight(parseInt(e.target.value))}
                className="flex-1 accent-cyan-500"
                data-testid="input-min-height"
              />
              <span className="text-sm font-bold text-foreground w-10 text-center">{minHeight} ft</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Swell Direction (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {SWELL_DIRECTIONS.map(dir => (
                <Button
                  key={dir}
                  size="sm"
                  variant={selectedDirections.includes(dir) ? "default" : "outline"}
                  className="text-xs rounded-full"
                  onClick={() => toggleDirection(dir)}
                  data-testid={`button-direction-${dir}`}
                >
                  {dir}
                </Button>
              ))}
            </div>
            {selectedDirections.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No filter = any direction</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm text-foreground">Auto-block calendar</label>
            </div>
            <Switch
              checked={autoBlock}
              onCheckedChange={setAutoBlock}
              data-testid="switch-auto-block"
            />
          </div>
          {autoBlock && (
            <p className="text-xs text-muted-foreground -mt-1 ml-6">
              Your availability calendar will show "Surfing" when forecast meets your criteria
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button 
              size="sm" 
              onClick={handleCreateAlert} 
              disabled={!selectedSpot || createAlert.isPending}
              className="gap-1.5"
              data-testid="button-save-alert"
            >
              <Bell className="h-3.5 w-3.5" />
              {createAlert.isPending ? "Creating..." : "Create Alert"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreateAlert(false)} data-testid="button-cancel-alert">Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : alerts.length === 0 && !showCreateAlert ? (
        <div className="text-center py-6">
          <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Add surf alerts and put firing surf days in your calendar so you don't miss another swell!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div 
              key={alert.id} 
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                alert.enabled ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
              )}
              data-testid={`surf-alert-${alert.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">{alert.spotName}</span>
                  <UiBadge variant="secondary" className="text-xs">
                    {alert.minHeight}+ ft
                  </UiBadge>
                  {alert.swellDirections && alert.swellDirections.length > 0 && (
                    <UiBadge variant="outline" className="text-xs">
                      {alert.swellDirections.join(", ")}
                    </UiBadge>
                  )}
                  {alert.autoBlock && (
                    <UiBadge variant="outline" className="text-xs gap-1 border-cyan-500/30 text-cyan-700 dark:text-cyan-400">
                      <CalendarCheck className="h-3 w-3" />
                      Auto-block
                    </UiBadge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Switch
                  checked={alert.enabled ?? true}
                  onCheckedChange={(enabled) => toggleAlert.mutate({ id: alert.id, enabled })}
                  data-testid={`switch-alert-${alert.id}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => deleteAlert.mutate(alert.id)}
                  data-testid={`button-delete-alert-${alert.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function SurfReports() {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showAddSpots, setShowAddSpots] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { data: profile } = useMyProfile();
  const isPremium = profile?.isPremium;
  const updateProfile = useUpdateProfile();
  const hasSyncedFromServer = useRef(false);
  const userChangedSpots = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addedSpots, setAddedSpots] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (profile && !hasSyncedFromServer.current) {
      hasSyncedFromServer.current = true;
      const serverSpots = (profile.savedSurfSpots || []).filter(Boolean);
      if (serverSpots.length > 0) {
        setAddedSpots(serverSpots);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverSpots));
      } else {
        const localSpots = addedSpots;
        if (localSpots.length > 0) {
          updateProfile.mutate({ savedSurfSpots: localSpots });
        }
      }
    }
  }, [profile]);  // eslint-disable-line react-hooks/exhaustive-deps

  const setAddedSpotsWithSave = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    userChangedSpots.current = true;
    setAddedSpots(updater);
  }, []);

  useEffect(() => {
    if (!userChangedSpots.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addedSpots));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (profile) {
        updateProfile.mutate({ savedSurfSpots: addedSpots });
      }
    }, 1000);
  }, [addedSpots]);  // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date();
    
  // Get the actual spot objects for added spots
  const userSpots = addedSpots.map(name => WORLDWIDE_SPOTS.find(s => s.name === name)).filter(Boolean) as SurfSpot[];
  
  const toggleSpot = (spotName: string) => {
    if (addedSpots.includes(spotName)) {
      setAddedSpotsWithSave(prev => prev.filter(s => s !== spotName));
    } else {
      setAddedSpotsWithSave(prev => [...prev, spotName]);
    }
  };

  const [activeTab, setActiveTab] = useState("surf");
  
  return (
    <Layout>
      <PremiumModal open={showPremiumModal} onOpenChange={setShowPremiumModal} />
      <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 via-cyan-50/30 to-background dark:from-slate-900 dark:via-slate-900 dark:to-background">
        <header className="px-4 pt-4 pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3 h-12 p-1">
              <TabsTrigger 
                value="surf" 
                className="gap-1.5 text-xs data-[state=active]:bg-cyan-500 data-[state=active]:text-white data-[state=inactive]:text-cyan-700 dark:data-[state=inactive]:text-cyan-400" 
                data-testid="tab-surf-report"
              >
                <Waves className="h-4 w-4" />
                Surf Report
              </TabsTrigger>
              <TabsTrigger 
                value="wind" 
                className="gap-1.5 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=inactive]:text-teal-700 dark:data-[state=inactive]:text-teal-400" 
                data-testid="tab-wind-model"
              >
                <Wind className="h-4 w-4" />
                Wind
              </TabsTrigger>
              <TabsTrigger 
                value="swell" 
                className="gap-1.5 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-blue-700 dark:data-[state=inactive]:text-blue-400" 
                data-testid="tab-swell-model"
              >
                <Activity className="h-4 w-4" />
                Swell
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {activeTab === "surf" && (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Waves className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  <h1 className="text-xl font-bold text-foreground">Surf Forecast</h1>
                </div>
                <Popover open={showAddSpots} onOpenChange={setShowAddSpots}>
                  <PopoverTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="gap-1.5 rounded-full"
                      data-testid="button-add-spots"
                    >
                      <Globe className="h-4 w-4" />
                      Add Spots
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0" align="end">
                    <SpotPicker addedSpots={addedSpots} onToggleSpot={toggleSpot} onClose={() => setShowAddSpots(false)} />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-muted-foreground">
                {userSpots.length > 0 ? `Tracking ${userSpots.length} spot${userSpots.length > 1 ? 's' : ''}` : 'Add spots to see live conditions'}
              </p>
            </>
          )}
        </header>

        {activeTab === "surf" ? (
          <main className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
            {userSpots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-4">
                  <Waves className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No spots added yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                  Add your favorite surf spots to track live wave conditions from around the world
                </p>
                <Button 
                  onClick={() => setShowAddSpots(true)}
                  className="gap-2"
                  data-testid="button-add-first-spot"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Spot
                </Button>
              </div>
            ) : (
              <>
                {userSpots.map((spot) => (
                  <SpotCard 
                    key={spot.name}
                    spot={spot}
                    allSpots={WORLDWIDE_SPOTS}
                    isPremium={isPremium ?? false}
                    onShowPremium={() => setShowPremiumModal(true)}
                    onRemove={() => setAddedSpotsWithSave(prev => prev.filter(s => s !== spot.name))}
                    onAddSpot={(spotName) => {
                      if (!addedSpots.includes(spotName)) {
                        setAddedSpotsWithSave(prev => [...prev, spotName]);
                      }
                    }}
                  />
                ))}
                <SurfAlertsSection 
                  spots={userSpots} 
                  isPremium={isPremium ?? false} 
                  onShowPremium={() => setShowPremiumModal(true)} 
                />
              </>
            )}
          </main>
        ) : activeTab === "wind" ? (
          <main className="flex-1 overflow-y-auto pb-24">
            <WindModel 
              lat={userSpots[0]?.lat || 33.1936} 
              lng={userSpots[0]?.lng || -117.3831} 
              locationName={userSpots[0]?.name || "Oceanside, CA"} 
            />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto pb-24">
            <SwellModel />
          </main>
        )}
      </div>

      <LocationDetail 
        location={selectedLocation} 
        open={!!selectedLocation} 
        onOpenChange={(open) => !open && setSelectedLocation(null)} 
      />
    </Layout>
  );
}

function Badge({ rating }: { rating: string }) {
  const colors = {
    epic: "bg-purple-100 text-purple-700 border-purple-200",
    good: "bg-green-100 text-green-700 border-green-200",
    fair: "bg-blue-100 text-blue-700 border-blue-200",
    poor: "bg-gray-100 text-gray-700 border-gray-200",
  };
  
  return (
    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border", colors[rating as keyof typeof colors] || colors.poor)}>
      {rating}
    </span>
  );
}

function LocationDetail({ location, open, onOpenChange }: { location: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { data: profile } = useMyProfile();
  const { data: favorites } = useFavoriteLocations();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const [showPremium, setShowPremium] = useState(false);
  const { data: posts, isLoading: postsLoading } = useQuery<PostWithUser[]>({
    queryKey: [location ? `/api/locations/${location.id}/posts` : null],
    enabled: !!location,
  });

  if (!location) return null;

  const isPremium = profile?.isPremium;
  const daysToShow = isPremium ? 7 : 3;
  const today = new Date();
  const isFav = favorites?.some(f => f.id === location.id);

  return (
    <>
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          <div className="h-48 relative w-full shrink-0 bg-muted">
             <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
             <SafeImage 
               src="https://images.unsplash.com/photo-1526346698789-22fd84314424?w=800&q=80" 
               alt="Surf Spot" 
               className="w-full h-full object-cover"
             />
             <div className="absolute top-4 right-4 z-20">
               <Button 
                 size="icon" 
                 variant="ghost" 
                 className={cn("h-10 w-10 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40", isFav && "text-yellow-400")}
                 onClick={(e) => {
                   e.stopPropagation();
                   toggleFavorite(location.id);
                 }}
               >
                 <Star className={cn("h-5 w-5", isFav && "fill-current")} />
               </Button>
             </div>
             <div className="absolute bottom-4 left-6 z-20">
               <h2 className="text-3xl font-display font-bold text-foreground">{location.name}</h2>
               <p className="text-muted-foreground flex items-center text-sm">
                 <MapPin className="w-4 h-4 mr-1" />
                 {location.latitude}, {location.longitude}
               </p>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div>
              <h3 className="font-bold text-lg mb-2 text-foreground">Description</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {location.description || "A classic reef break suitable for intermediate to advanced surfers. Best on a SW swell and NE wind."}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-foreground">Forecast</h3>
                {!isPremium && (
                  <button onClick={() => setShowPremium(true)} className="text-xs text-primary font-medium flex items-center hover:underline">
                    Unlock 7 Day Forecast - $5/mo <Lock className="w-3 h-3 ml-1" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(today, i);
                  const isLocked = i >= daysToShow;
                  const report = location.reports?.[i] || location.reports?.[0];

                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border",
                        isLocked ? "bg-muted/50 border-transparent opacity-60" : "bg-card border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 text-center">
                           <div className="text-[10px] text-muted-foreground uppercase font-bold">{format(date, 'EEE')}</div>
                           <div className="font-bold text-sm">{format(date, 'd')}</div>
                        </div>
                        {isLocked ? (
                          <div className="flex items-center text-muted-foreground text-sm">
                            <Lock className="w-4 h-4 mr-2" />
                            Premium Only
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <Badge rating={report?.rating || 'fair'} />
                            <div className="text-sm font-bold">
                              {report?.waveHeightMin}-{report?.waveHeightMax}ft
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {!isLocked && (
                        <div className="text-right">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Wind className="w-3 h-3 mr-1" />
                            {report?.windSpeed}kts
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                  <Camera className="h-5 w-5 text-primary" />
                  User Photos
                </h3>
                <Button size="sm" variant="ghost" className="text-xs text-primary h-8">
                  Share Photo
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-8">
                {posts?.map((post) => (
                  <Card key={post.id} className="group relative aspect-square overflow-hidden border-none shadow-md bg-muted">
                    <SafeImage 
                      src={post.imageUrl} 
                      alt="Surf session" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2">
                        <Link href={`/profile/${post.user.userId}`}>
                          <Button size="sm" className="w-full h-8 text-[10px] bg-white/20 backdrop-blur-md border-white/10 text-white hover:bg-white/40">
                            <ExternalLink className="mr-1 h-3 w-3" />
                            User Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
                {!posts?.length && !postsLoading && (
                  <div className="col-span-2 py-8 text-center bg-secondary/30 rounded-xl border border-dashed">
                    <p className="text-xs text-muted-foreground italic">Be the first to share a photo from this spot!</p>
                  </div>
                )}
                {postsLoading && (
                  <>
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="aspect-square rounded-xl" />
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportsSkeleton() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex justify-between px-2">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-10 w-10 rounded-full" />)}
        </div>
        <div className="space-y-4 mt-8">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-[20px]" />
          ))}
        </div>
      </div>
    </Layout>
  );
}
