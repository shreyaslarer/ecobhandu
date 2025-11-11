import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Platform,
  Animated,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeEnvironmentalImage } from '@/lib/gemini';
import { createReport } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSavedUser } from '@/lib/auth';

const CATEGORIES = [
  'Waste Management',
  'Air Pollution',
  'Water Contamination',
  'Deforestation',
  'Illegal Dumping',
  'Noise Pollution',
  'Soil Erosion',
  'Wildlife Harm',
  'Industrial Waste',
  'Plastic Pollution',
  'Energy Waste',
  'Green Space Loss',
  'Littering',
  'Chemical Spills',
  'Sewage Overflow',
  'Oil Spills',
  'River Pollution',
  'Lake Contamination',
  'Ocean Pollution',
  'Groundwater Pollution',
  'Agricultural Runoff',
  'Pesticide Contamination',
  'E-Waste Dumping',
  'Medical Waste',
  'Radioactive Waste',
  'Construction Debris',
  'Vehicle Pollution',
  'Smoke Emission',
  'Dust Pollution',
  'Odor Nuisance',
  'Light Pollution',
  'Heat Pollution',
  'Wetland Destruction',
  'Mangrove Cutting',
  'Beach Pollution',
  'Park Vandalism',
  'Tree Felling',
  'Illegal Mining',
  'Sand Mining',
  'Quarry Issues',
  'Land Encroachment',
  'Unauthorized Construction',
  'Drainage Blockage',
  'Flooding Issues',
  'Stagnant Water',
  'Mosquito Breeding',
  'Road Damage',
  'Pavement Encroachment',
  'Street Vending Issues',
  'Public Urination',
  'Open Defecation',
  'Stray Animal Issues',
  'Bird Nesting Problems',
  'Insect Infestation',
  'Rodent Problems',
  'Snake Sighting',
  'Wild Animal Conflict',
  'Poaching',
  'Animal Cruelty',
  'Pet Waste',
  'Cattle Menace',
  'Farm Waste',
  'Crop Burning',
  'Greenhouse Gas',
  'Carbon Emission',
  'Ozone Depletion',
  'Acid Rain',
  'Smog Formation',
  'Indoor Air Quality',
  'Asbestos Hazard',
  'Lead Contamination',
  'Mercury Pollution',
  'Arsenic in Water',
  'Fluoride in Water',
  'Algal Bloom',
  'Eutrophication',
  'Coral Bleaching',
  'Biodiversity Loss',
  'Habitat Fragmentation',
  'Invasive Species',
  'Genetic Pollution',
  'Ecosystem Damage',
  'Climate Change Impact',
  'Glacier Melting',
  'Sea Level Rise',
  'Drought',
  'Desertification',
  'Wildfire',
  'Landslide Risk',
  'Avalanche Risk',
  'Tsunami Damage',
  'Earthquake Damage',
  'Volcanic Activity',
  'Other',
];

// Category-based description suggestions
const DESCRIPTION_SUGGESTIONS: { [key: string]: string[] } = {
  'Waste Management': [
    'Overflowing garbage bins',
    'Uncollected waste on streets',
    'Improper waste disposal',
    'Garbage accumulation near residential area',
  ],
  'Air Pollution': [
    'Heavy smoke from factory',
    'Vehicle emission pollution',
    'Burning of waste materials',
    'Industrial chimney releasing smoke',
  ],
  'Water Contamination': [
    'Sewage overflow in water body',
    'Industrial waste in river',
    'Dirty contaminated water source',
    'Chemical discharge in lake',
  ],
  'Deforestation': [
    'Illegal tree cutting activity',
    'Forest land clearing for construction',
    'Tree burning in forested area',
    'Loss of green cover',
  ],
  'Illegal Dumping': [
    'Construction debris dumped illegally',
    'Electronic waste disposal site',
    'Hazardous waste dumping',
    'Unauthorized garbage dump',
  ],
  'Noise Pollution': [
    'Excessive construction noise',
    'Loud machinery operation',
    'Traffic noise disturbance',
    'Industrial noise exceeding limits',
  ],
  'Soil Erosion': [
    'Land degradation visible',
    'Topsoil erosion in area',
    'Construction causing soil erosion',
    'Agricultural land deterioration',
  ],
  'Wildlife Harm': [
    'Injured animal found',
    'Animal habitat destruction',
    'Wildlife trapped or endangered',
    'Illegal hunting or poaching',
  ],
  'Industrial Waste': [
    'Factory waste disposal issue',
    'Chemical waste leakage',
    'Industrial effluent discharge',
    'Toxic waste accumulation',
  ],
  'Plastic Pollution': [
    'Plastic waste accumulation',
    'Single-use plastic littering',
    'Plastic bags clogging drainage',
    'Marine plastic pollution',
  ],
  'Energy Waste': [
    'Excessive energy consumption',
    'Streetlights on during daytime',
    'Unnecessary power usage',
    'Energy inefficient infrastructure',
  ],
  'Green Space Loss': [
    'Public park area encroached',
    'Garden converted to construction',
    'Loss of urban greenery',
    'Tree removal for development',
  ],
  'Littering': [
    'Roadside littering',
    'Public space waste disposal',
    'Bottles and cans thrown',
    'Food waste littering',
  ],
  'Chemical Spills': [
    'Chemical substance spill',
    'Oil leakage on ground',
    'Toxic material spillage',
    'Hazardous liquid discharge',
  ],
  'Sewage Overflow': [
    'Sewage leakage on road',
    'Manhole overflow',
    'Septic tank overflow',
    'Drainage system blockage',
  ],
  'Oil Spills': [
    'Oil spillage on water',
    'Petroleum leakage',
    'Fuel tank leakage',
    'Oil contamination of soil',
  ],
  'River Pollution': [
    'River water contamination',
    'Industrial discharge in river',
    'Garbage dumping in river',
    'River ecosystem damage',
  ],
  'Lake Contamination': [
    'Lake water pollution',
    'Algae growth in lake',
    'Dead fish in lake',
    'Lake eutrophication',
  ],
  'Ocean Pollution': [
    'Ocean plastic waste',
    'Marine debris accumulation',
    'Oil slick on ocean',
    'Coastal water pollution',
  ],
  'Groundwater Pollution': [
    'Contaminated well water',
    'Industrial seepage into groundwater',
    'Pesticide in groundwater',
    'Groundwater depletion',
  ],
  'Agricultural Runoff': [
    'Fertilizer runoff into water',
    'Pesticide contamination',
    'Farm chemical leaching',
    'Agricultural waste in streams',
  ],
  'Pesticide Contamination': [
    'Excessive pesticide spraying',
    'Pesticide residue on crops',
    'Pesticide in water supply',
    'Chemical farming pollution',
  ],
  'E-Waste Dumping': [
    'Electronic waste dumped illegally',
    'Old electronics disposal',
    'Computer parts littering',
    'Mobile waste accumulation',
  ],
  'Medical Waste': [
    'Hospital waste dumped publicly',
    'Syringes and needles littering',
    'Biomedical waste exposure',
    'Pharmaceutical waste disposal',
  ],
  'Radioactive Waste': [
    'Nuclear waste disposal concern',
    'Radioactive material exposure',
    'Radiation hazard detected',
    'Nuclear contamination risk',
  ],
  'Construction Debris': [
    'Building demolition waste',
    'Construction material dumping',
    'Concrete and rubble pile',
    'Construction site pollution',
  ],
  'Vehicle Pollution': [
    'Smoke from old vehicles',
    'Traffic emission levels high',
    'Diesel smoke pollution',
    'Vehicle exhaust fumes',
  ],
  'Smoke Emission': [
    'Factory chimney smoke',
    'Industrial smoke release',
    'Black smoke emission',
    'Continuous smoke discharge',
  ],
  'Dust Pollution': [
    'Construction dust in air',
    'Road dust causing air pollution',
    'Cement dust from factory',
    'Sand dust accumulation',
  ],
  'Odor Nuisance': [
    'Foul smell from factory',
    'Sewage odor in area',
    'Garbage stench',
    'Chemical odor pollution',
  ],
  'Light Pollution': [
    'Excessive artificial lighting',
    'Streetlights causing glare',
    'Night sky pollution',
    'Light trespass from buildings',
  ],
  'Heat Pollution': [
    'Urban heat island effect',
    'Thermal discharge in water',
    'Industrial heat release',
    'Excessive heat from infrastructure',
  ],
  'Wetland Destruction': [
    'Wetland area being filled',
    'Marsh land conversion',
    'Swamp drainage for development',
    'Loss of wetland ecosystem',
  ],
  'Mangrove Cutting': [
    'Illegal mangrove removal',
    'Coastal mangrove destruction',
    'Mangrove forest clearing',
    'Loss of mangrove cover',
  ],
  'Beach Pollution': [
    'Beach littered with plastic',
    'Sewage discharge on beach',
    'Oil tar on sand',
    'Marine debris on shore',
  ],
  'Park Vandalism': [
    'Public park equipment damaged',
    'Park trees being cut',
    'Garden area destruction',
    'Park facilities vandalized',
  ],
  'Tree Felling': [
    'Unauthorized tree cutting',
    'Large tree being removed',
    'Urban tree felling',
    'Avenue tree removal',
  ],
  'Illegal Mining': [
    'Unauthorized mining activity',
    'Illegal sand extraction',
    'Stone quarrying without permit',
    'Mining causing land damage',
  ],
  'Sand Mining': [
    'River bed sand extraction',
    'Beach sand mining',
    'Illegal sand dredging',
    'Sand mining erosion',
  ],
  'Quarry Issues': [
    'Quarry operation pollution',
    'Stone crushing dust',
    'Quarry blasting damage',
    'Illegal quarrying activity',
  ],
  'Land Encroachment': [
    'Public land being encroached',
    'Government property occupied',
    'Forest land encroachment',
    'Unauthorized land occupation',
  ],
  'Unauthorized Construction': [
    'Illegal building construction',
    'Construction without permit',
    'Violation of building norms',
    'Unauthorized structure',
  ],
  'Drainage Blockage': [
    'Storm drain blocked',
    'Sewer line clogged',
    'Drainage overflow',
    'Water logging due to blockage',
  ],
  'Flooding Issues': [
    'Area prone to flooding',
    'Water accumulation on roads',
    'Flash flood damage',
    'Flood water stagnation',
  ],
  'Stagnant Water': [
    'Water pooling on ground',
    'Standing water for days',
    'Puddles not draining',
    'Water accumulation causing issues',
  ],
  'Mosquito Breeding': [
    'Mosquito larvae in stagnant water',
    'Dengue breeding site',
    'Mosquito infestation',
    'Standing water breeding ground',
  ],
  'Road Damage': [
    'Pothole on road',
    'Road surface deterioration',
    'Cracked pavement',
    'Road requiring repair',
  ],
  'Pavement Encroachment': [
    'Footpath blocked by vendors',
    'Pavement occupied illegally',
    'Sidewalk encroachment',
    'Pedestrian path obstructed',
  ],
  'Street Vending Issues': [
    'Unauthorized street vendors',
    'Vending causing obstruction',
    'Food stall hygiene issues',
    'Vendor waste disposal problem',
  ],
  'Public Urination': [
    'Open urination in public area',
    'Public toilet unavailable',
    'Urination spot causing nuisance',
    'Lack of sanitation facilities',
  ],
  'Open Defecation': [
    'Open defecation practice',
    'Lack of toilet facilities',
    'Sanitation issue in area',
    'Public health hazard',
  ],
  'Stray Animal Issues': [
    'Stray dogs menace',
    'Abandoned animals problem',
    'Animal attack risk',
    'Stray cattle on roads',
  ],
  'Bird Nesting Problems': [
    'Birds nesting causing issues',
    'Pigeon droppings problem',
    'Bird infestation in building',
    'Nesting blocking ventilation',
  ],
  'Insect Infestation': [
    'Termite infestation',
    'Bee hive in public area',
    'Wasp nest problem',
    'Ant colony issues',
  ],
  'Rodent Problems': [
    'Rat infestation in area',
    'Mouse problem in building',
    'Rodent damage to property',
    'Rodent health hazard',
  ],
  'Snake Sighting': [
    'Venomous snake spotted',
    'Snake in residential area',
    'Reptile rescue needed',
    'Snake menace reported',
  ],
  'Wild Animal Conflict': [
    'Wild animal entering village',
    'Elephant human conflict',
    'Leopard sighting near habitation',
    'Human wildlife conflict',
  ],
  'Poaching': [
    'Illegal wildlife hunting',
    'Animal poaching activity',
    'Endangered species killing',
    'Wildlife crime reported',
  ],
  'Animal Cruelty': [
    'Animal abuse witnessed',
    'Cruelty to animals',
    'Pet neglect case',
    'Animal welfare concern',
  ],
  'Pet Waste': [
    'Dog waste not cleaned',
    'Pet litter on footpath',
    'Animal feces in public area',
    'Pet owner not cleaning',
  ],
  'Cattle Menace': [
    'Stray cattle on roads',
    'Bulls causing danger',
    'Abandoned cows problem',
    'Livestock roaming freely',
  ],
  'Farm Waste': [
    'Agricultural waste burning',
    'Farm stubble fire',
    'Crop residue pollution',
    'Farm chemical disposal',
  ],
  'Crop Burning': [
    'Stubble burning smoke',
    'Agricultural fire',
    'Paddy straw burning',
    'Farm fire causing pollution',
  ],
  'Greenhouse Gas': [
    'High CO2 emission',
    'Methane release',
    'Industrial greenhouse gases',
    'Carbon footprint concern',
  ],
  'Carbon Emission': [
    'High carbon dioxide release',
    'Factory carbon emissions',
    'Vehicle CO2 pollution',
    'Carbon pollution source',
  ],
  'Ozone Depletion': [
    'Ozone layer damage',
    'CFC emission source',
    'Stratospheric ozone loss',
    'UV radiation increase',
  ],
  'Acid Rain': [
    'Acidic rainfall reported',
    'pH imbalance in rain',
    'Sulfur dioxide causing acid rain',
    'Vegetation damage from rain',
  ],
  'Smog Formation': [
    'Dense smog in area',
    'Photochemical smog',
    'Visibility reduced by smog',
    'Air quality hazardous',
  ],
  'Indoor Air Quality': [
    'Poor ventilation indoors',
    'Mold growth in building',
    'Indoor pollutants detected',
    'Sick building syndrome',
  ],
  'Asbestos Hazard': [
    'Asbestos material exposure',
    'Building containing asbestos',
    'Asbestos dust hazard',
    'Health risk from asbestos',
  ],
  'Lead Contamination': [
    'Lead in drinking water',
    'Lead paint hazard',
    'Lead poisoning risk',
    'Lead contamination detected',
  ],
  'Mercury Pollution': [
    'Mercury in water source',
    'Industrial mercury release',
    'Fish mercury contamination',
    'Mercury vapor exposure',
  ],
  'Arsenic in Water': [
    'Arsenic contamination in well',
    'Groundwater arsenic levels high',
    'Arsenic poisoning risk',
    'Water arsenic detected',
  ],
  'Fluoride in Water': [
    'Excess fluoride in water',
    'Fluorosis cases reported',
    'High fluoride levels',
    'Fluoride contamination',
  ],
  'Algal Bloom': [
    'Toxic algae in water body',
    'Green algae bloom',
    'Water discoloration from algae',
    'Algal toxins present',
  ],
  'Eutrophication': [
    'Nutrient pollution in lake',
    'Excessive algae growth',
    'Oxygen depletion in water',
    'Lake eutrophication',
  ],
  'Coral Bleaching': [
    'Coral reef bleaching',
    'Marine ecosystem damage',
    'Coral death observed',
    'Reef degradation',
  ],
  'Biodiversity Loss': [
    'Species extinction threat',
    'Loss of native species',
    'Ecosystem biodiversity decline',
    'Wildlife diversity reduced',
  ],
  'Habitat Fragmentation': [
    'Wildlife corridor broken',
    'Habitat disconnection',
    'Ecosystem fragmented',
    'Animal migration blocked',
  ],
  'Invasive Species': [
    'Non-native species invasion',
    'Alien plant growth',
    'Invasive animal population',
    'Ecosystem disruption',
  ],
  'Genetic Pollution': [
    'GMO crop contamination',
    'Genetic modification issues',
    'Cross-breeding pollution',
    'Gene pool contamination',
  ],
  'Ecosystem Damage': [
    'Natural ecosystem disrupted',
    'Ecological balance disturbed',
    'Habitat destruction',
    'Environmental degradation',
  ],
  'Climate Change Impact': [
    'Rising temperatures observed',
    'Weather pattern changes',
    'Climate anomaly detected',
    'Global warming effects',
  ],
  'Glacier Melting': [
    'Glacier retreat observed',
    'Ice sheet melting',
    'Glacial lake formation',
    'Permafrost thawing',
  ],
  'Sea Level Rise': [
    'Coastal erosion from sea rise',
    'Flooding from rising seas',
    'Beach erosion accelerating',
    'Low-lying area inundation',
  ],
  'Drought': [
    'Water scarcity in area',
    'Prolonged dry spell',
    'Crop failure from drought',
    'Drinking water shortage',
  ],
  'Desertification': [
    'Land turning into desert',
    'Soil degradation severe',
    'Vegetation loss',
    'Arid land expansion',
  ],
  'Wildfire': [
    'Forest fire outbreak',
    'Uncontrolled wildfire',
    'Vegetation burning',
    'Fire damage to ecosystem',
  ],
  'Landslide Risk': [
    'Slope instability observed',
    'Landslide prone area',
    'Soil movement detected',
    'Hill cutting causing risk',
  ],
  'Avalanche Risk': [
    'Snow avalanche danger',
    'Mountain slope unstable',
    'Avalanche warning area',
    'Snow slide risk',
  ],
  'Tsunami Damage': [
    'Coastal damage from tsunami',
    'Tidal wave destruction',
    'Seismic sea wave impact',
    'Tsunami aftermath',
  ],
  'Earthquake Damage': [
    'Seismic activity damage',
    'Building collapsed from quake',
    'Ground fissures appeared',
    'Earthquake structural damage',
  ],
  'Volcanic Activity': [
    'Volcanic eruption observed',
    'Lava flow damage',
    'Volcanic ash fallout',
    'Geothermal activity increase',
  ],
  'Other': [
    'Environmental concern',
    'Ecological damage observed',
    'Natural resource degradation',
    'Sustainability issue',
  ],
};

export default function ReportIssue() {
  const [selectedCategory, setSelectedCategory] = useState('Waste Management');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'Minor' | 'Major' | 'Critical'>('Minor');
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [location, setLocation] = useState('Detecting location...');
  const [coordinates, setCoordinates] = useState<{latitude: number; longitude: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDescriptionGenerated, setIsDescriptionGenerated] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Normalize strings for robust category searching (ignores case, spaces, hyphens, punctuation)
  const normalizeCategory = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Spin animation for analyzing and loading states
  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    
    if (isAnalyzing || isLoadingLocation || isSearching) {
      animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      spinValue.setValue(0);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isAnalyzing, isLoadingLocation, isSearching]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Get current location
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable location access to automatically detect your location.'
        );
        setLocation('Location access denied');
        setIsLoadingLocation(false);
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;
      setCoordinates({ latitude, longitude });

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const locationString = [
          address.street,
          address.city,
          address.region,
        ]
          .filter(Boolean)
          .join(', ');
        
        setLocation(locationString || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      } else {
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Location Error:', error);
      Alert.alert(
        'Location Error',
        'Could not get your current location. Please try again.'
      );
      setLocation('Unable to detect location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Get location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Search for locations
  const searchLocation = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await Location.geocodeAsync(query);
      
      if (results && results.length > 0) {
        // Get addresses for each coordinate
        const locationsWithAddresses = await Promise.all(
          results.slice(0, 5).map(async (result) => {
            const addresses = await Location.reverseGeocodeAsync({
              latitude: result.latitude,
              longitude: result.longitude,
            });
            
            const address = addresses[0];
            const locationString = address
              ? [address.street, address.city, address.region, address.country]
                  .filter(Boolean)
                  .join(', ')
              : `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`;

            return {
              latitude: result.latitude,
              longitude: result.longitude,
              address: locationString,
            };
          })
        );
        
        setSearchResults(locationsWithAddresses);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Select location from search
  const selectLocation = (result: any) => {
    setCoordinates({
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setLocation(result.address);
    setShowLocationModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Analyze image with Gemini API
  const analyzeImageWithGemini = async (imageUri: string) => {
    setIsAnalyzing(true);
    try {
      console.log('Starting image analysis for:', imageUri);
      
      // Use ImageManipulator to get base64 (React Native compatible)
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }], // Resize to reduce API payload
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      
      if (!manipulatedImage.base64) {
        throw new Error('Failed to convert image to base64');
      }
      
      console.log('Image converted to base64, length:', manipulatedImage.base64.length);
      
      // Call Gemini API with base64 image
      const generatedDescription = await analyzeEnvironmentalImage(manipulatedImage.base64);
      console.log('AI Description generated:', generatedDescription);
      
      setDescription(generatedDescription);
      setIsDescriptionGenerated(true);
    } catch (error) {
      console.error('Gemini API Error:', error);
      Alert.alert(
        'Analysis Failed',
        'Could not analyze the image automatically. Please enter a description manually.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Pick image from gallery or camera
  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access photos');
      return;
    }

    // Show options
    Alert.alert(
      'Upload Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images, // fallback: current installed version lacks MediaType enum
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled) {
              setSelectedImage(result.assets[0].uri);
              // Get fresh location when photo is taken
              getCurrentLocation();
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images, // fallback to avoid runtime error
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled) {
              setSelectedImage(result.assets[0].uri);
              // Get fresh location when photo is uploaded
              getCurrentLocation();
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Submit report
  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double taps
    // Validate all required fields
    if (!selectedImage) {
      Alert.alert('Missing Photo', 'Please upload a photo of the issue');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please provide a description of the issue');
      return;
    }

    if (!coordinates) {
      Alert.alert('Missing Location', 'Please enable location services or select a location');
      return;
    }

    try {
      setIsSubmitting(true);
      // Get user info from persistent storage
      const user = await getSavedUser();
      if (!user) {
        Alert.alert('Session expired', 'Please log in again to submit a report.');
        router.push('/signin');
        return;
      }

      // Convert image to base64 if needed
      let base64Image = '';
      if (selectedImage) {
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            selectedImage,
            [{ resize: { width: 1024 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          base64Image = manipulatedImage.base64 || '';
        } catch (error) {
          console.error('Image conversion error:', error);
          // Continue without image if conversion fails
        }
      }

      // Prepare report data
      const reportData = {
        userId: (user as any).id || (user as any)._id, // support both shapes just in case
        userName: user.name,
        userEmail: user.email,
        category: selectedCategory,
        description: description.trim(),
        severity: severity,
        isUrgent: isUrgent,
        location: location,
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        image: base64Image,
      };

      console.log('Submitting report...');

      // Submit to backend
      const createdReport = await createReport(reportData);

      console.log('Report submitted successfully:', createdReport._id);

      // Show success modal instead of system Alert for richer UI
      setShowSuccessModal(true);

      // Reset form
      setSelectedCategory('Waste Management');
      setDescription('');
      setSeverity('Minor');
      setIsUrgent(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Submit report error:', error);
      Alert.alert(
        'Submission Failed',
        error instanceof Error ? error.message : 'Failed to submit report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report an Issue</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Section */}
        <Text style={styles.sectionTitle}>Category</Text>
        
        {/* Category Search */}
        <View style={styles.categorySearchContainer}>
          <View style={styles.categorySearchBox}>
            <Ionicons name="search" size={20} color="#666666" />
            <TextInput
              style={styles.categorySearchInput}
              placeholder="Search categories..."
              placeholderTextColor="#999999"
              value={categorySearchQuery}
              onChangeText={setCategorySearchQuery}
            />
            {categorySearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {CATEGORIES
            .filter((category) => {
              const q = normalizeCategory(categorySearchQuery);
              if (q.length === 0) return true; // show all when empty
              const c = normalizeCategory(category);
              return c.includes(q);
            })
            .map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => {
                setSelectedCategory(category);
                // Auto-fill first suggestion when category is selected (only if description is empty)
                if (!description && DESCRIPTION_SUGGESTIONS[category]) {
                  setDescription(DESCRIPTION_SUGGESTIONS[category][0]);
                }
                // Clear search after a small delay to avoid render issues
                // Keep the search text so the selected chip stays visible in the filtered list
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Photo Upload Section */}
        <Text style={styles.sectionTitle}>Add a Photo</Text>
        <View style={styles.photoSection}>
          {!selectedImage ? (
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <View style={styles.uploadIconContainer}>
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="camera" size={32} color="#5e8c61" />
                </View>
              </View>
              <Text style={styles.uploadTitle}>Tap to upload</Text>
              <Text style={styles.uploadSubtitle}>Take a photo or choose from gallery</Text>
              <View style={styles.uploadHint}>
                <Ionicons name="information-circle-outline" size={16} color="#5e8c61" />
                <Text style={styles.uploadHintText}>Clear photos help resolve issues faster</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.uploadedImage} />
              <View style={styles.imageOverlay}>
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Description Section */}
        <Text style={styles.sectionTitle}>Description</Text>
        
        <View style={styles.descriptionSection}>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the issue you see..."
            placeholderTextColor="#33333380"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
          
          {/* Quick Suggestions */}
          {DESCRIPTION_SUGGESTIONS[selectedCategory] && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>Quick suggestions:</Text>
              <View style={styles.suggestionsChips}>
                {DESCRIPTION_SUGGESTIONS[selectedCategory].map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.suggestionChip,
                      description === suggestion && styles.suggestionChipActive,
                    ]}
                    onPress={() => setDescription(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.suggestionChipText,
                        description === suggestion && styles.suggestionChipTextActive,
                      ]}
                    >
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Severity Section */}
        <Text style={styles.sectionTitle}>Severity</Text>
        <View style={styles.severityContainer}>
          <TouchableOpacity
            style={styles.severitySelector}
            onPress={() => setShowSeverityDropdown(!showSeverityDropdown)}
            activeOpacity={0.7}
          >
            <View style={styles.severitySelected}>
              <View style={[
                styles.severityIndicator,
                severity === 'Minor' && styles.severityIndicatorMinor,
                severity === 'Major' && styles.severityIndicatorMajor,
                severity === 'Critical' && styles.severityIndicatorCritical,
              ]} />
              <Text style={styles.severityText}>{severity}</Text>
            </View>
            <Ionicons 
              name={showSeverityDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#33333380" 
            />
          </TouchableOpacity>

          {showSeverityDropdown && (
            <View style={styles.severityDropdown}>
              <TouchableOpacity
                style={[styles.severityOption, severity === 'Minor' && styles.severityOptionActive]}
                onPress={() => {
                  setSeverity('Minor');
                  setShowSeverityDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.severityIndicator, styles.severityIndicatorMinor]} />
                <Text style={[styles.severityOptionText, severity === 'Minor' && styles.severityOptionTextActive]}>
                  Minor
                </Text>
                {severity === 'Minor' && (
                  <Ionicons name="checkmark" size={20} color="#5e8c61" style={styles.severityCheck} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.severityOption, severity === 'Major' && styles.severityOptionActive]}
                onPress={() => {
                  setSeverity('Major');
                  setShowSeverityDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.severityIndicator, styles.severityIndicatorMajor]} />
                <Text style={[styles.severityOptionText, severity === 'Major' && styles.severityOptionTextActive]}>
                  Major
                </Text>
                {severity === 'Major' && (
                  <Ionicons name="checkmark" size={20} color="#5e8c61" style={styles.severityCheck} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.severityOption, severity === 'Critical' && styles.severityOptionActive]}
                onPress={() => {
                  setSeverity('Critical');
                  setShowSeverityDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.severityIndicator, styles.severityIndicatorCritical]} />
                <Text style={[styles.severityOptionText, severity === 'Critical' && styles.severityOptionTextActive]}>
                  Critical
                </Text>
                {severity === 'Critical' && (
                  <Ionicons name="checkmark" size={20} color="#5e8c61" style={styles.severityCheck} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Urgent Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setIsUrgent(!isUrgent)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isUrgent && styles.checkboxChecked]}>
            {isUrgent && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkboxLabel}>Mark as urgent</Text>
        </TouchableOpacity>

        {/* Location Section */}
        <Text style={styles.sectionTitle}>Location</Text>
        <TouchableOpacity
          style={styles.locationContainer}
          onPress={() => setShowLocationModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.locationContent}>
            {isLoadingLocation ? (
              <>
                <Ionicons name="location" size={24} color="#C3D105" />
                <Text style={styles.locationTextLoading}>Detecting your location...</Text>
              </>
            ) : (
              <>
                <Ionicons name="location" size={24} color="#5e8c61" />
                <Text style={styles.locationText} numberOfLines={2}>{location}</Text>
              </>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#5e8c61" />
        </TouchableOpacity>
        {coordinates && (
          <View style={styles.coordinatesContainer}>
            <Ionicons name="navigate-circle-outline" size={14} color="#5e8c61" />
            <Text style={styles.coordinatesText}>
              {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Submit Button Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={isSubmitting ? 1 : 0.8}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.submitInnerRow}>
              <ActivityIndicator color="#21230F" />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={56} color="#5e8c61" />
            </View>
            <Text style={styles.successTitle}>Report Submitted</Text>
            <Text style={styles.successMessage}>
              Thank you for contributing! Your report will help local authorities take action.
            </Text>
            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.successButton, styles.successPrimary]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push('/(tabs)');
                }}
              >
                <Text style={styles.successButtonTextPrimary}>View Reports</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.successButton, styles.successSecondary]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.back();
                }}
              >
                <Text style={styles.successButtonTextSecondary}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => {
                setShowLocationModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#333333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Location</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#5e8c61" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a location..."
                placeholderTextColor="#33333380"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={20} color="#33333380" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Current Location Option */}
            <TouchableOpacity
              style={styles.locationOption}
              onPress={() => {
                getCurrentLocation();
                setShowLocationModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.locationOptionIcon}>
                <Ionicons name="locate" size={24} color="#5e8c61" />
              </View>
              <View style={styles.locationOptionContent}>
                <Text style={styles.locationOptionTitle}>Use Current Location</Text>
                <Text style={styles.locationOptionSubtitle}>Enable GPS to detect your location</Text>
              </View>
              <Ionicons name="navigate" size={20} color="#C3D105" />
            </TouchableOpacity>

            {/* Divider */}
            {searchResults.length > 0 && (
              <View style={styles.divider}>
                <Text style={styles.dividerText}>Search Results</Text>
              </View>
            )}

            {/* Loading State */}
            {isSearching && (
              <View style={styles.searchLoading}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={24} color="#5e8c61" />
                </Animated.View>
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            )}

            {/* Search Results */}
            {!isSearching && searchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.locationOption}
                onPress={() => selectLocation(result)}
                activeOpacity={0.7}
              >
                <View style={styles.locationOptionIcon}>
                  <Ionicons name="location" size={24} color="#5e8c61" />
                </View>
                <View style={styles.locationOptionContent}>
                  <Text style={styles.locationOptionTitle} numberOfLines={2}>
                    {result.address}
                  </Text>
                  <Text style={styles.locationOptionSubtitle}>
                    {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#33333380" />
              </TouchableOpacity>
            ))}

            {/* Empty State */}
            {!isSearching && searchQuery.length >= 3 && searchResults.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#33333380" />
                <Text style={styles.emptyStateText}>No locations found</Text>
                <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
              </View>
            )}

            {/* Helper Text */}
            {searchQuery.length === 0 && (
              <View style={styles.helperContainer}>
                <Ionicons name="information-circle-outline" size={20} color="#5e8c61" />
                <Text style={styles.helperText}>
                  Search by address, landmark, or place name
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E9CE',
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Increased to prevent covering Android navigation buttons
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  categorySearchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categorySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E7E9CE',
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    padding: 0,
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  categoryScrollContent: {
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 9999,
    backgroundColor: '#F3F4E6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#F8F8F5',
    borderColor: '#5e8c61',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33333380',
  },
  categoryChipTextActive: {
    color: '#5e8c61',
  },
  photoSection: {
    paddingHorizontal: 16,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C3D105',
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FAFAF8',
  },
  uploadIconContainer: {
    marginBottom: 8,
  },
  uploadIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4E6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5e8c61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginTop: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#33333380',
    textAlign: 'center',
  },
  uploadHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4E6',
    borderRadius: 20,
  },
  uploadHintText: {
    fontSize: 12,
    color: '#5e8c61',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadedImage: {
    width: '100%',
    height: 240,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3F4E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C3D105',
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5e8c61',
  },
  analyzingContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4E6',
    padding: 32,
    alignItems: 'center',
  },
  analyzingContent: {
    alignItems: 'center',
    gap: 12,
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5e8c61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginTop: 8,
  },
  analyzingSubtext: {
    fontSize: 13,
    color: '#33333380',
    textAlign: 'center',
  },
  descriptionSection: {
    paddingHorizontal: 16,
  },
  textAreaContainer: {
    position: 'relative',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E7E9CE',
    borderRadius: 12,
    backgroundColor: '#F3F4E6',
    padding: 12,
    paddingBottom: 50,
    fontSize: 14,
    color: '#333333',
    minHeight: 120,
  },
  suggestionsContainer: {
    marginTop: 12,
  },
  suggestionsLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  suggestionsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F5',
    borderWidth: 1,
    borderColor: '#E7E9CE',
  },
  suggestionChipActive: {
    backgroundColor: '#C3D105',
    borderColor: '#C3D105',
  },
  suggestionChipText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  suggestionChipTextActive: {
    color: '#FFFFFF',
  },
  textAreaGenerated: {
    borderColor: '#C3D105',
    borderWidth: 2,
    backgroundColor: '#FAFAF8',
  },
  aiGenerateButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5e8c61',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  aiGenerateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#5e8c61',
    backgroundColor: '#F3F4E6',
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5e8c61',
  },
  generatedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  generatedHintText: {
    fontSize: 12,
    color: '#5e8c61',
    fontStyle: 'italic',
  },
  severityContainer: {
    marginHorizontal: 16,
    position: 'relative',
  },
  severitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E9CE',
  },
  severitySelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  severityIndicatorMinor: {
    backgroundColor: '#4CAF50',
  },
  severityIndicatorMajor: {
    backgroundColor: '#FF9800',
  },
  severityIndicatorCritical: {
    backgroundColor: '#F44336',
  },
  severityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  severityDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E9CE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  severityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4E6',
  },
  severityOptionActive: {
    backgroundColor: '#F3F4E6',
  },
  severityOptionText: {
    fontSize: 15,
    color: '#333333',
    flex: 1,
  },
  severityOptionTextActive: {
    fontWeight: '600',
    color: '#5e8c61',
  },
  severityCheck: {
    marginLeft: 'auto',
  },
  pickerContainer: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E7E9CE',
    borderRadius: 12,
    backgroundColor: '#F3F4E6',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    color: '#333333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#E7E9CE',
    borderRadius: 4,
    backgroundColor: '#F3F4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5e8c61',
    borderColor: '#5e8c61',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4E6',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  locationTextLoading: {
    fontSize: 14,
    color: '#C3D105',
    flex: 1,
    fontStyle: 'italic',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#5e8c61',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8F8F5',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32, // Extra padding to stay above Android navigation buttons
    borderTopWidth: 1,
    borderTopColor: '#E7E9CE',
  },
  submitButton: {
    backgroundColor: '#C3D105',
    borderRadius: 9999,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#21230F',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  successIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#F3F4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333333',
    marginTop: 4,
  },
  successMessage: {
    fontSize: 14,
    color: '#33333380',
    textAlign: 'center',
    marginTop: 8,
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  successButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
    borderWidth: 2,
  },
  successPrimary: {
    backgroundColor: '#C3D105',
    borderColor: '#C3D105',
  },
  successSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E9CE',
  },
  successButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#21230F',
  },
  successButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5e8c61',
  },
  // Location Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F8F5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E9CE',
  },
  modalBackButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E9CE',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4E6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  modalContent: {
    flex: 1,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4E6',
  },
  locationOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOptionContent: {
    flex: 1,
  },
  locationOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  locationOptionSubtitle: {
    fontSize: 13,
    color: '#33333380',
  },
  divider: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4E6',
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5e8c61',
    textTransform: 'uppercase',
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  searchLoadingText: {
    fontSize: 15,
    color: '#5e8c61',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#33333380',
    marginTop: 8,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 16,
  },
  helperText: {
    fontSize: 13,
    color: '#5e8c61',
    flex: 1,
  },
});
