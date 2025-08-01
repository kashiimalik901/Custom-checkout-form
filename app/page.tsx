"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { MapPin, Calculator, CreditCard, Mail, Phone, User, Search, Upload, X, Calendar as CalendarIcon, Clock } from "lucide-react"
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js"
import { toast } from "sonner"
import { format } from "date-fns"

const services = [
  { id: "towing-germany", name: "Towing within Germany", baseFee: 60, pricePerKm: 1.0, description: "€60 base fee + €1 per km" },
  { id: "towing-outside", name: "Towing outside Germany", baseFee: 100, pricePerKm: 0.8, description: "€100 base fee + €0.80 per km" },
  { id: "moving", name: "Moving services", baseFee: 0, pricePerKm: 1.5, description: "€1.50 per km (no base fee)" },
  { id: "vehicle-transfer", name: "Vehicle transfer", baseFee: 0, pricePerKm: 1.5, description: "€1.50 per km (no base fee)" },
]

interface PlaceSuggestion {
  place_id: string
  display_name: string
  formatted_address: string
}

export default function ServiceCheckoutForm() {
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone: "",
    bookingDate: undefined as Date | undefined,
    bookingTime: "",
    startAddress: "",
    endAddress: "",
    startPlaceId: "",
    endPlaceId: "",
    distance: 0,
    selectedServices: [] as string[],
    additionalNotes: "",
    estimateRequested: false,
  })

  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [totalCost, setTotalCost] = useState(0)
  const [showPayPal, setShowPayPal] = useState(false)
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)
  const [isRequestingEstimate, setIsRequestingEstimate] = useState(false)

  // Autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([])
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceSuggestion[]>([])
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false)
  const [isSearchingPickup, setIsSearchingPickup] = useState(false)
  const [isSearchingDestination, setIsSearchingDestination] = useState(false)

  const pickupTimeoutRef = useRef<NodeJS.Timeout>()
  const destinationTimeoutRef = useRef<NodeJS.Timeout>()

  // Search for places using the new Places API
  const searchPlaces = async (query: string, isPickup: boolean) => {
    if (query.length < 2) {
      if (isPickup) {
        setPickupSuggestions([])
        setShowPickupSuggestions(false)
      } else {
        setDestinationSuggestions([])
        setShowDestinationSuggestions(false)
      }
      return
    }

    if (isPickup) {
      setIsSearchingPickup(true)
    } else {
      setIsSearchingDestination(true)
    }

    try {
      const response = await fetch("/api/search-places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          region: "US", // You can change this or make it dynamic
        }),
      })

      const data = await response.json()

      if (data.success && data.places) {
        const suggestions = data.places.map((place: any) => ({
          place_id: place.place_id,
          display_name: place.display_name,
          formatted_address: place.formatted_address,
        }))

        if (isPickup) {
          setPickupSuggestions(suggestions)
          setShowPickupSuggestions(suggestions.length > 0)
        } else {
          setDestinationSuggestions(suggestions)
          setShowDestinationSuggestions(suggestions.length > 0)
        }
      }
    } catch (error) {
      console.error("Error searching places:", error)
    } finally {
      if (isPickup) {
        setIsSearchingPickup(false)
      } else {
        setIsSearchingDestination(false)
      }
    }
  }

  // Handle pickup address input change
  const handlePickupChange = (value: string) => {
    setFormData((prev) => ({ ...prev, startAddress: value, startPlaceId: "" }))

    // Clear previous timeout
    if (pickupTimeoutRef.current) {
      clearTimeout(pickupTimeoutRef.current)
    }

    // Debounce the search
    pickupTimeoutRef.current = setTimeout(() => {
      searchPlaces(value, true)
    }, 300)
  }

  // Handle destination address input change
  const handleDestinationChange = (value: string) => {
    setFormData((prev) => ({ ...prev, endAddress: value, endPlaceId: "" }))

    // Clear previous timeout
    if (destinationTimeoutRef.current) {
      clearTimeout(destinationTimeoutRef.current)
    }

    // Debounce the search
    destinationTimeoutRef.current = setTimeout(() => {
      searchPlaces(value, false)
    }, 300)
  }

  // Handle place selection
  const handlePlaceSelect = (place: PlaceSuggestion, isPickup: boolean) => {
    if (isPickup) {
      setFormData((prev) => ({
        ...prev,
        startAddress: place.formatted_address,
        startPlaceId: place.place_id,
      }))
      setShowPickupSuggestions(false)
      setPickupSuggestions([])

      // Calculate distance if destination is set
      if (formData.endPlaceId) {
        setTimeout(() => calculateDistance(place.place_id, formData.endPlaceId), 500)
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        endAddress: place.formatted_address,
        endPlaceId: place.place_id,
      }))
      setShowDestinationSuggestions(false)
      setDestinationSuggestions([])

      // Calculate distance if pickup is set
      if (formData.startPlaceId) {
        setTimeout(() => calculateDistance(formData.startPlaceId, place.place_id), 500)
      }
    }
  }

  // Calculate distance using place IDs
  const calculateDistance = async (originPlaceId: string, destinationPlaceId: string) => {
    console.log("calculateDistance called with place IDs:", { originPlaceId, destinationPlaceId })

    if (!originPlaceId || !destinationPlaceId) {
      console.log("Missing place IDs")
      return
    }

    setIsCalculatingDistance(true)
    console.log("Starting distance calculation with Routes API...")

    try {
      const response = await fetch("/api/calculate-distance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originPlaceId: originPlaceId,
          destinationPlaceId: destinationPlaceId,
        }),
      })

      console.log("API response status:", response.status)
      const data = await response.json()
      console.log("API response data:", data)

      if (data.success && data.distance) {
        // Convert from meters to kilometers
        const distanceInKm = Math.round((data.distance / 1000) * 10) / 10
        console.log("Distance calculated:", distanceInKm, "km")

        setFormData((prev) => ({
          ...prev,
          distance: distanceInKm,
        }))

        // Auto-calculate total if services are selected
        setTimeout(() => {
          if (formData.selectedServices.length > 0) {
            console.log("Auto-calculating total cost...")
            calculateTotal(distanceInKm)
          }
        }, 100)
      } else {
        console.error("Distance calculation failed:", data.message)
        toast.error(`Could not calculate distance: ${data.message}`)
      }
    } catch (error) {
      console.error("Error calculating distance:", error)
      toast.error("Error calculating distance. Please check your internet connection and try again.")
    } finally {
      setIsCalculatingDistance(false)
      console.log("Distance calculation completed")
    }
  }

  const calculateTotal = (distance?: number) => {
    const distanceToUse = distance || formData.distance
    const total = formData.selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId)
      if (!service) return total
      
      // Calculate cost for this service
      const serviceCost = service.baseFee + (distanceToUse * service.pricePerKm)
      return total + serviceCost
    }, 0)

    // Add 19% VAT
    const totalWithVAT = total * 1.19
    setTotalCost(totalWithVAT)
    return totalWithVAT
  }

  const handleServiceChange = (serviceId: string, checked: boolean) => {
    const newSelectedServices = checked
      ? [...formData.selectedServices, serviceId]
      : formData.selectedServices.filter((id) => id !== serviceId)

    setFormData((prev) => ({
      ...prev,
      selectedServices: newSelectedServices,
    }))

    // Auto-calculate total if distance is available
    if (formData.distance > 0) {
      const total = newSelectedServices.reduce((total, serviceId) => {
        const service = services.find((s) => s.id === serviceId)
        if (!service) return total
        
        // Calculate cost for this service
        const serviceCost = service.baseFee + (formData.distance * service.pricePerKm)
        return total + serviceCost
      }, 0)
      
      // Add 19% VAT
      const totalWithVAT = total * 1.19
      setTotalCost(totalWithVAT)
    }
  }

  const handleRequestEstimate = async () => {
    try {
      setIsRequestingEstimate(true)
      const formDataToSend = new FormData()
      
      // Add text fields
      formDataToSend.append('customerName', formData.customerName)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('phone', formData.phone)
      formDataToSend.append('bookingDate', formData.bookingDate ? formData.bookingDate.toISOString().split('T')[0] : '')
      formDataToSend.append('bookingTime', formData.bookingTime)
      formDataToSend.append('startAddress', formData.startAddress)
      formDataToSend.append('endAddress', formData.endAddress)
      formDataToSend.append('distance', formData.distance.toString())
      formDataToSend.append('selectedServices', JSON.stringify(formData.selectedServices))
      formDataToSend.append('additionalNotes', formData.additionalNotes)
      
      // Add files
      attachedFiles.forEach(file => {
        formDataToSend.append('files', file)
      })

      const response = await fetch("/api/send-estimate", {
        method: "POST",
        body: formDataToSend,
      })

      const data = await response.json()

      if (data.success) {
        const fileMessage = data.filesAttached > 0 ? ` with ${data.filesAttached} attached file(s)` : ''
        toast.success(`Estimate request sent successfully${fileMessage}! You will receive a detailed quote via email within 24 hours.`)
        setFormData((prev) => ({ ...prev, estimateRequested: true }))
        setAttachedFiles([]) // Clear attached files after successful submission
      } else {
        toast.error("Failed to send estimate request. Please try again.")
      }
    } catch (error) {
      console.error("Error sending estimate:", error)
      toast.error("Error sending estimate request. Please try again.")
    } finally {
      setIsRequestingEstimate(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024 // 10MB limit
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
      
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not a supported type. Please upload images, PDFs, or text files.`)
        return false
      }
      
      return true
    })
    
    setAttachedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleProceedToPayment = () => {
    if (totalCost > 0) {
      setShowPayPal(true)
    }
  }

  const paypalOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "YOUR_PAYPAL_CLIENT_ID",
    currency: "EUR",
    intent: "capture",
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(".autocomplete-container")) {
        setShowPickupSuggestions(false)
        setShowDestinationSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-black to-gray-900 border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-yellow-400 text-center">ENGEL-TRANS</h1>
          <p className="text-gray-300 text-center mt-2">
            TOWING AND TRANSFERRING CARS/TRUCKS 5T – CONTACT: 996-238 8338
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Customer Information */}
          <Card className="bg-gray-900 border-yellow-400 border-2">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName" className="text-white">
                  Full Name *
                </Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                  className="bg-black border-gray-600 text-white focus:border-yellow-400"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-black border-gray-600 text-white focus:border-yellow-400"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="bg-black border-gray-600 text-white focus:border-yellow-400"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bookingDate" className="text-white">
                    Preferred Date *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-black border-gray-600 text-white hover:bg-gray-800 focus:border-yellow-400"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.bookingDate ? (
                          format(formData.bookingDate, "PPP")
                        ) : (
                          <span className="text-gray-400">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600">
                      <Calendar
                        mode="single"
                        selected={formData.bookingDate}
                        onSelect={(date) => setFormData((prev) => ({ ...prev, bookingDate: date }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="bg-gray-800 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="bookingTime" className="text-white">
                    Preferred Time *
                  </Label>
                  <Input
                    id="bookingTime"
                    type="time"
                    value={formData.bookingTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bookingTime: e.target.value }))}
                    className="bg-black border-gray-600 text-white focus:border-yellow-400"
                    placeholder="Select time"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Details */}
          <Card className="bg-gray-900 border-yellow-400 border-2">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="autocomplete-container relative">
                <Label htmlFor="pickupAddress" className="text-white">
                  Pickup Address *
                </Label>
                <div className="relative">
                  <Input
                    id="pickupAddress"
                    value={formData.startAddress}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    className="bg-black border-gray-600 text-white focus:border-yellow-400 mt-2 pr-10"
                    placeholder="Enter pickup address..."
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isSearchingPickup ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                    ) : (
                      <Search className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Pickup Suggestions Dropdown */}
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {pickupSuggestions.map((place) => (
                      <div
                        key={place.place_id}
                        onClick={() => handlePlaceSelect(place, true)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 transition-colors"
                      >
                        <div className="text-white font-medium">{place.display_name}</div>
                        <div className="text-gray-400 text-sm">{place.formatted_address}</div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-400 mt-1">Start typing to see address suggestions in Germany, Austria, Slovenia, and Croatia</p>
              </div>

              <div className="autocomplete-container relative">
                <Label htmlFor="destinationAddress" className="text-white">
                  Destination Address *
                </Label>
                <div className="relative">
                  <Input
                    id="destinationAddress"
                    value={formData.endAddress}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    className="bg-black border-gray-600 text-white focus:border-yellow-400 mt-2 pr-10"
                    placeholder="Enter destination address..."
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isSearchingDestination ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                    ) : (
                      <Search className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Destination Suggestions Dropdown */}
                {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {destinationSuggestions.map((place) => (
                      <div
                        key={place.place_id}
                        onClick={() => handlePlaceSelect(place, false)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0 transition-colors"
                      >
                        <div className="text-white font-medium">{place.display_name}</div>
                        <div className="text-gray-400 text-sm">{place.formatted_address}</div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-400 mt-1">Start typing to see address suggestions in Germany, Austria, Slovenia, and Croatia</p>
              </div>

              <div>
                <Label className="text-white">Distance</Label>
                <div className="relative">
                  <Input
                    value={
                      isCalculatingDistance
                        ? "Calculating..."
                        : formData.distance > 0
                          ? `${formData.distance} km`
                          : "Select both addresses to calculate"
                    }
                    readOnly
                    className="bg-gray-800 border-gray-600 text-gray-300 cursor-not-allowed"
                  />
                  {isCalculatingDistance && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">Distance calculated automatically via Google Routes API</p>
              </div>


            </CardContent>
          </Card>
        </div>

        {/* Service Selection */}
        <Card className="bg-gray-900 border-yellow-400 border-2 mt-8">
                      <CardHeader>
              <CardTitle className="text-yellow-400">Select Services</CardTitle>
              <p className="text-gray-300">Choose the services you need. All prices include 19% VAT (German tax rate).</p>
            </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center space-x-3 p-3 bg-black rounded-lg border border-gray-600 hover:border-yellow-400 transition-colors"
                >
                  <Checkbox
                    id={service.id}
                    checked={formData.selectedServices.includes(service.id)}
                    onCheckedChange={(checked) => handleServiceChange(service.id, checked as boolean)}
                    className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                  />
                  <div className="flex-1">
                    <Label htmlFor={service.id} className="text-white font-medium cursor-pointer">
                      {service.name}
                    </Label>
                    <p className="text-yellow-400 font-bold text-sm">{service.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card className="bg-gray-900 border-yellow-400 border-2 mt-8">
          <CardHeader>
            <CardTitle className="text-yellow-400">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="additionalNotes" className="text-white">
                Special Instructions or Notes
              </Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))}
                className="bg-black border-gray-600 text-white focus:border-yellow-400 mt-2"
                placeholder="Any special requirements, fragile items, time preferences, etc."
                rows={3}
              />
            </div>

            {/* File Upload Section */}
            <div>
              <Label className="text-white">
                Attach Files (Optional)
              </Label>
              <p className="text-sm text-gray-400 mb-2">
                Upload photos of your vehicle, documents, or other relevant files (Max 10MB each)
              </p>
              
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black bg-transparent"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* File List */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">Attached Files:</p>
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Upload className="w-4 h-4 text-yellow-400" />
                          <span className="text-white text-sm">{file.name}</span>
                          <span className="text-gray-400 text-xs">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Calculation & Payment */}
        <Card className="bg-gray-900 border-yellow-400 border-2 mt-8">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Cost Calculation & Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button
                onClick={handleRequestEstimate}
                variant="outline"
                className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black bg-transparent"
                disabled={!formData.customerName || !formData.email || !formData.startAddress || !formData.endAddress || isRequestingEstimate}
              >
                {isRequestingEstimate ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Request Detailed Estimate
                  </>
                )}
              </Button>
            </div>

            {totalCost > 0 && (
              <div className="bg-black p-6 rounded-lg border border-yellow-400">
                <div className="space-y-2">
                  <div className="flex justify-between text-white">
                    <span>Route:</span>
                    <span className="text-right text-sm">
                      {formData.startAddress.split(",")[0]} → {formData.endAddress.split(",")[0]}
                    </span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Distance:</span>
                    <span>{formData.distance} km</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Selected Services:</span>
                    <span>{formData.selectedServices.length} service(s)</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {formData.selectedServices.map((serviceId) => {
                      const service = services.find((s) => s.id === serviceId)
                      return service ? (
                        <div key={serviceId} className="flex justify-between">
                          <span>{service.name}:</span>
                          <span>
                            €{service.baseFee} + €{service.pricePerKm}/km × {formData.distance}km = €
                            {(service.baseFee + (service.pricePerKm * formData.distance)).toFixed(2)}
                          </span>
                        </div>
                      ) : null
                    })}
                  </div>
                  <div className="border-t border-gray-600 pt-2">
                    <div className="flex justify-between text-xl font-bold text-yellow-400">
                      <span>Total Cost:</span>
                      <span>€{totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <Button
                    onClick={handleProceedToPayment}
                    className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-bold py-3"
                    disabled={!formData.customerName || !formData.email || !formData.phone}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to PayPal Payment
                  </Button>

                  {showPayPal && (
                    <div className="mt-4">
                      {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID !== "YOUR_PAYPAL_CLIENT_ID" ? (
                        <PayPalScriptProvider options={paypalOptions}>
                          <PayPalButtons
                          createOrder={(data, actions) => {
                            return actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [
                                {
                                  amount: {
                                    value: totalCost.toFixed(2),
                                    currency_code: "EUR",
                                  },
                                  description: `Transport Service - ${formData.distance}km from ${formData.startAddress.split(",")[0]} to ${formData.endAddress.split(",")[0]}`,
                                },
                              ],
                            })
                          }}
                          onApprove={async (data, actions) => {
                            try {
                              toast.loading("Processing payment...")
                              const details = await actions.order?.capture()

                              // Send order confirmation
                              const response = await fetch("/api/process-payment", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  paymentId: details?.id,
                                  customerInfo: {
                                    name: formData.customerName,
                                    email: formData.email,
                                    phone: formData.phone,
                                  },
                                  serviceDetails: {
                                    bookingDate: formData.bookingDate ? formData.bookingDate.toISOString().split('T')[0] : null,
                                    bookingTime: formData.bookingTime,
                                    startAddress: formData.startAddress,
                                    endAddress: formData.endAddress,
                                    distance: formData.distance,
                                    services: formData.selectedServices,
                                    notes: formData.additionalNotes,
                                  },
                                  totalAmount: totalCost,
                                }),
                              })

                              const result = await response.json()
                              toast.dismiss()

                              if (result.success) {
                                const emailStatus = result.emailSent ? "✅ Email sent" : "⚠️ Email not sent (check console)"
                                toast.success(
                                  `Payment Successful!`,
                                  {
                                    description: `Transaction ID: ${details?.id}\nOrder ID: ${result.orderId}\n${emailStatus}`,
                                    duration: 8000,
                                  }
                                )
                                
                                // Reset form after successful payment
                                setFormData({
                                  customerName: "",
                                  email: "",
                                  phone: "",
                                  bookingDate: undefined,
                                  bookingTime: "",
                                  startAddress: "",
                                  endAddress: "",
                                  startPlaceId: "",
                                  endPlaceId: "",
                                  distance: 0,
                                  selectedServices: [],
                                  additionalNotes: "",
                                  estimateRequested: false,
                                })
                                setTotalCost(0)
                                setAttachedFiles([])
                                setShowPayPal(false)
                              } else {
                                toast.error(`Payment processing failed: ${result.message}`)
                              }
                            } catch (error) {
                              toast.dismiss()
                              console.error("Payment processing error:", error)
                              toast.error("Payment processing failed. Please try again or contact support.")
                            }
                          }}
                                                      onError={(err) => {
                              console.error("PayPal error:", err)
                              toast.error("Payment failed. Please try again or contact support.")
                            }}
                            onCancel={() => {
                              toast.info("Payment cancelled by user")
                            }}
                                                      style={{
                              layout: "vertical",
                              color: "gold",
                              shape: "rect",
                              label: "paypal",
                            }}
                          />
                        </PayPalScriptProvider>
                      ) : (
                        <div className="bg-yellow-900 border border-yellow-400 p-4 rounded-lg">
                          <p className="text-yellow-400">
                            ⚠️ PayPal is not configured. Please add your PayPal Client ID to the environment variables.
                          </p>
                          <p className="text-yellow-300 text-sm mt-2">
                            Add NEXT_PUBLIC_PAYPAL_CLIENT_ID to your .env.local file
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.distance === 0 && formData.selectedServices.length > 0 && (
              <div className="bg-blue-900 border border-blue-400 p-4 rounded-lg">
                <p className="text-blue-400">
                  Please select both pickup and destination addresses to calculate the total cost.
                </p>
              </div>
            )}

            {formData.estimateRequested && (
              <div className="bg-green-900 border border-green-400 p-4 rounded-lg">
                <p className="text-green-400 font-medium">
                  ✓ Estimate request sent successfully! You will receive a detailed quote within 24 hours.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-gray-900 border-yellow-400 border-2 mt-8">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-white">
              <div>
                <p className="font-medium">Email Support:</p>
                <p className="text-yellow-400">transport2023de@gmail.com</p>
              </div>
              <div>
                <p className="font-medium">Phone Support:</p>
                <p className="text-yellow-400">+996-238-8338</p>
              </div>
            </div>
            <p className="text-gray-400 mt-4 text-sm">Business hours: Monday - Friday, 9:00 AM - 6:00 PM</p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-black border-t-2 border-yellow-400 mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-gray-400">© 2024 ENGEL-TRANS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
