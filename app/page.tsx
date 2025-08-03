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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Calculator, CreditCard, Mail, Phone, User, Search, Upload, X, Calendar as CalendarIcon, Clock, AlertTriangle, FileText } from "lucide-react"
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js"
import { toast } from "sonner"
import { format } from "date-fns"

const services = [
  { id: "towing-germany", name: "Abschleppen innerhalb Deutschlands", baseFee: 60, pricePerKm: 1.0, description: "€60 Grundgebühr + €1 pro km" },
  { id: "towing-outside", name: "Abschleppen außerhalb Deutschlands", baseFee: 100, pricePerKm: 0.8, description: "€100 Grundgebühr + €0.80 pro km" },
  { id: "moving", name: "Umzugsservice", baseFee: 0, pricePerKm: 1.5, description: "€1.50 pro km (keine Grundgebühr)" },
  { id: "vehicle-transfer", name: "Überführung Auf Eigene Achse( mit Tüv oder Ohne Tüv  Versichert)", baseFee: 0, pricePerKm: 1.5, description: "€1.50 pro km (keine Grundgebühr)" },
]

interface PlaceSuggestion {
  place_id: string
  display_name: string
  formatted_address: string
}

export default function ServiceCheckoutForm() {
  const [ageVerified, setAgeVerified] = useState(false)
  const [showAgeVerification, setShowAgeVerification] = useState(true)
  const [showImpressum, setShowImpressum] = useState(false)
  const [showVipTransfer, setShowVipTransfer] = useState(false)
  const [vipAmount, setVipAmount] = useState("")
  const [isVipTransfer, setIsVipTransfer] = useState(false)
  const [showManualPayment, setShowManualPayment] = useState(false)
  const [isSendingManualPayment, setIsSendingManualPayment] = useState(false)
  
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

  const handleAgeVerification = (confirmed: boolean) => {
    if (confirmed) {
      setAgeVerified(true)
      setShowAgeVerification(false)
      toast.success("Altersverifikation abgeschlossen. Willkommen bei ENGEL-TRANS!")
    } else {
      toast.error("Sie müssen mindestens 18 Jahre alt sein, um diesen Service zu nutzen.")
    }
  }

  // Prevent escape key from closing the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAgeVerification) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showAgeVerification])

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
    <>
      {/* Age Verification Modal */}
      <Dialog open={showAgeVerification} onOpenChange={() => {}}>
        <DialogContent className="bg-gray-900 border-yellow-400 border-2 text-white max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6" />
              Altersverifikation erforderlich
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="bg-yellow-900 border border-yellow-400 rounded-lg p-4 mb-4">
                <h3 className="text-yellow-400 font-bold text-lg mb-2">⚠️ Altersbeschränkung</h3>
                <p className="text-gray-300">
                  Sie müssen mindestens 18 Jahre alt sein, um ENGEL-TRANS-Dienstleistungen zu nutzen.
                </p>
              </div>
              <p className="text-gray-400 text-sm">
                Durch Klicken auf "Ich bin 18 oder älter" bestätigen Sie, dass Sie das Alterserfordernis für die Nutzung unserer Transportdienstleistungen erfüllen.
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => handleAgeVerification(true)}
                className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
              >
                ✅ Ich bin 18 oder älter
              </Button>
              <Button
                onClick={() => handleAgeVerification(false)}
                variant="outline"
                className="flex-1 border-red-400 text-red-400 hover:bg-red-900 hover:text-red-300"
              >
                ❌ Ich bin unter 18
              </Button>
            </div>
            
            <div className="text-center text-xs text-gray-500 pt-2">
              <p>Diese Verifikation ist für die rechtliche Compliance erforderlich.</p>
              <p>Kontakt: +49 152 13550785 für Unterstützung</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Impressum Modal */}
      <Dialog open={showImpressum} onOpenChange={setShowImpressum}>
        <DialogContent className="bg-gray-900 border-yellow-400 border-2 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6" />
              Impressum
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>
              Dieses Impressum gilt für alle Angebote unter der Domain www.engel-trans.de inklusive aller Subdomains (Unterseiten).
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-yellow-400 font-medium mb-3">Angaben gemäß § 5 TMG</h3>
              <div className="space-y-2">
                <p><strong>Geschäftsführer:</strong> Tin Matijasevic</p>
                <p><strong>Unternehmen:</strong> Transport & Online Handel</p>
                <p><strong>Adresse:</strong> Ostenstr. 6 68794</p>
                <p><strong>Telefon:</strong> +49 152 13550785</p>
                <p><strong>E-Mail:</strong> app2023trans@gmail.com</p>
              </div>
            </div>
            <div className="text-center pt-4">
              <Button 
                onClick={() => setShowImpressum(false)}
                className="bg-yellow-400 text-black hover:bg-yellow-500"
              >
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIP Transfer Modal */}
      <Dialog open={showVipTransfer} onOpenChange={setShowVipTransfer}>
        <DialogContent className="bg-gray-900 border-yellow-400 border-2 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2 text-xl">
              🚀 VIP Transfer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="bg-yellow-900 border border-yellow-400 rounded-lg p-4 mb-4">
                <h3 className="text-yellow-400 font-bold text-lg mb-2">💎 VIP Direktzahlung</h3>
                <p className="text-gray-300 text-sm">
                  Schnelle Zahlung ohne Formular - nur Betrag eingeben und bezahlen!
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="vipAmount" className="text-white">
                Betrag (EUR) *
              </Label>
              <Input
                id="vipAmount"
                type="number"
                value={vipAmount}
                onChange={(e) => setVipAmount(e.target.value)}
                className="bg-black border-gray-600 text-white focus:border-yellow-400"
                placeholder="z.B. 50"
                min="1"
                step="0.01"
              />
              <p className="text-gray-400 text-xs">
                Geben Sie den gewünschten Betrag in Euro ein
              </p>
            </div>

            {vipAmount && parseFloat(vipAmount) > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="text-yellow-400 font-medium mb-2">Zahlungsübersicht</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Betrag:</strong> €{parseFloat(vipAmount).toFixed(2)}</p>
                  <p><strong>MwSt (19%):</strong> €{(parseFloat(vipAmount) * 0.19).toFixed(2)}</p>
                  <p className="text-lg font-bold text-yellow-400">
                    <strong>Gesamtbetrag:</strong> €{(parseFloat(vipAmount) * 1.19).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowVipTransfer(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => {
                  if (vipAmount && parseFloat(vipAmount) > 0) {
                    setShowVipTransfer(false)
                    setShowPayPal(true)
                    setTotalCost(parseFloat(vipAmount) * 1.19)
                    setIsVipTransfer(true)
                    toast.success("VIP Transfer vorbereitet - PayPal wird geöffnet")
                    
                    // Auto scroll to PayPal section after a short delay
                    setTimeout(() => {
                      const paypalSection = document.getElementById('paypal-section')
                      if (paypalSection) {
                        paypalSection.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center' 
                        })
                      }
                    }, 500)
                  } else {
                    toast.error("Bitte geben Sie einen gültigen Betrag ein")
                  }
                }}
                className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
                disabled={!vipAmount || parseFloat(vipAmount) <= 0}
              >
                💳 Mit PayPal bezahlen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Modal */}
      <Dialog open={showManualPayment} onOpenChange={setShowManualPayment}>
        <DialogContent className="bg-gray-900 border-yellow-400 border-2 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2 text-xl">
              💳 Überweisung - Banküberweisung
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="bg-yellow-900 border border-yellow-400 rounded-lg p-4 mb-4">
                <h3 className="text-yellow-400 font-bold text-lg mb-2">🏦 Banküberweisung</h3>
                <p className="text-gray-300 text-sm">
                  Bitte überweisen Sie den Betrag an die folgenden Bankdaten. Die Zahlungsanweisung wird an Ihre E-Mail-Adresse gesendet.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-yellow-400 font-medium mb-3">Bankdaten</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Empfänger:</strong> Transport Online Handel</p>
                <p><strong>IBAN:</strong> DE76 7002 0270 0045 0809 78</p>
                <p><strong>BIC:</strong> HYVEDEMMXXX</p>
                <p><strong>Betrag:</strong> €{totalCost.toFixed(2)}</p>
                <p><strong>Verwendungszweck:</strong> ENGEL-TRANS {formData.customerName}</p>
              </div>
            </div>

            <div className="bg-blue-900 border border-blue-400 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">⚠️ Wichtige Hinweise</h4>
              <ul className="text-sm space-y-1 text-blue-300">
                <li>• Bitte geben Sie Ihren Namen als Verwendungszweck an</li>
                <li>• Die Zahlung wird nach Eingang bestätigt</li>
                <li>• Sie erhalten eine E-Mail mit den Zahlungsdetails</li>
                <li>• Service wird nach Zahlungseingang geplant</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowManualPayment(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Abbrechen
              </Button>
              <Button
                onClick={async () => {
                  setIsSendingManualPayment(true)
                  try {
                    // Send manual payment instructions email
                    const response = await fetch("/api/send-manual-payment", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        customerName: formData.customerName,
                        email: formData.email,
                        phone: formData.phone,
                        bookingDate: formData.bookingDate ? formData.bookingDate.toISOString().split('T')[0] : null,
                        bookingTime: formData.bookingTime,
                        startAddress: formData.startAddress,
                        endAddress: formData.endAddress,
                        distance: formData.distance,
                        selectedServices: formData.selectedServices,
                        additionalNotes: formData.additionalNotes,
                        totalCost: totalCost,
                      }),
                    })

                    const result = await response.json()
                    
                    if (result.success) {
                      toast.success("Zahlungsanweisung per E-Mail gesendet!")
                      setShowManualPayment(false)
                      
                      // Reset form after successful manual payment
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
                      setIsVipTransfer(false)
                      setVipAmount("")
                    } else {
                      toast.error("Fehler beim Senden der E-Mail. Bitte kontaktieren Sie uns direkt.")
                    }
                  } catch (error) {
                    console.error("Error sending manual payment email:", error)
                    toast.error("Fehler beim Senden der E-Mail. Bitte kontaktieren Sie uns direkt.")
                  } finally {
                    setIsSendingManualPayment(false)
                  }
                }}
                className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
                disabled={isSendingManualPayment}
              >
                {isSendingManualPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    E-Mail wird gesendet...
                  </>
                ) : (
                  "📧 Zahlungsanweisung senden"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content - Only shown after age verification */}
      {ageVerified && (
        <div className="min-h-screen bg-black text-white">
          {/* Header */}
          <header className="bg-gradient-to-r from-black to-gray-900 border-b-2 border-yellow-400">
            <div className="container mx-auto px-4 py-6">
                        <h1 className="text-3xl font-bold text-yellow-400 text-center">ENGEL-TRANS</h1>
          <p className="text-gray-300 text-center mt-2">
            ABSCHLEPPEN UND TRANSPORT VON AUTOS/LKW 5T – KONTAKT: +49 152 13550785
          </p>
          <div className="text-center mt-4">
            <Button
              onClick={() => setShowVipTransfer(true)}
              className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold px-6 py-2"
            >
              🚀 VIP Transfer - Direktzahlung
            </Button>
          </div>
            </div>
          </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Customer Information */}
          <Card className="bg-gray-900 border-yellow-400 border-2">
            <CardHeader>
                          <CardTitle className="text-yellow-400 flex items-center gap-2">
              <User className="w-5 h-5" />
              Kundeninformationen
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName" className="text-white">
                  Vollständiger Name *
                </Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                  className="bg-black border-gray-600 text-white focus:border-yellow-400"
                  placeholder="Geben Sie Ihren vollständigen Namen ein"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white">
                  E-Mail-Adresse *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-black border-gray-600 text-white focus:border-yellow-400"
                  placeholder="ihre.email@beispiel.com"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white">
                  Telefonnummer *
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="bg-black border-gray-600 text-white focus:border-yellow-400"
                  placeholder="+49 (0) 123 456789"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bookingDate" className="text-white">
                    Gewünschtes Datum *
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
                          <span className="text-gray-400">Datum auswählen</span>
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
                    Gewünschte Uhrzeit *
                  </Label>
                  <Input
                    id="bookingTime"
                    type="time"
                    value={formData.bookingTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bookingTime: e.target.value }))}
                    className="bg-black border-gray-600 text-white focus:border-yellow-400"
                    placeholder="Uhrzeit auswählen"
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
              Fahrtdetails
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="autocomplete-container relative">
                <Label htmlFor="pickupAddress" className="text-white">
                  Abholadresse *
                </Label>
                <div className="relative">
                  <Input
                    id="pickupAddress"
                    value={formData.startAddress}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    className="bg-black border-gray-600 text-white focus:border-yellow-400 mt-2 pr-10"
                    placeholder="Abholadresse eingeben..."
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

                <p className="text-sm text-gray-400 mt-1">Beginnen Sie mit der Eingabe, um Adressvorschläge in Deutschland, Österreich, Slowenien und Kroatien zu sehen</p>
              </div>

              <div className="autocomplete-container relative">
                <Label htmlFor="destinationAddress" className="text-white">
                  Zieladresse *
                </Label>
                <div className="relative">
                  <Input
                    id="destinationAddress"
                    value={formData.endAddress}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    className="bg-black border-gray-600 text-white focus:border-yellow-400 mt-2 pr-10"
                    placeholder="Zieladresse eingeben..."
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

                <p className="text-sm text-gray-400 mt-1">Beginnen Sie mit der Eingabe, um Adressvorschläge in Deutschland, Österreich, Slowenien und Kroatien zu sehen</p>
              </div>

              <div>
                <Label className="text-white">Entfernung</Label>
                <div className="relative">
                  <Input
                    value={
                      isCalculatingDistance
                        ? "Berechne..."
                        : formData.distance > 0
                          ? `${formData.distance} km`
                          : "Wählen Sie beide Adressen zur Berechnung"
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
                <p className="text-sm text-gray-400 mt-1">Entfernung wird automatisch über Google Routes API berechnet</p>
              </div>


            </CardContent>
          </Card>
        </div>

        {/* Service Selection */}
        <Card className="bg-gray-900 border-yellow-400 border-2 mt-8">
                      <CardHeader>
              <CardTitle className="text-yellow-400">Dienstleistungen auswählen</CardTitle>
              <p className="text-gray-300">Wählen Sie die benötigten Dienstleistungen. Alle Preise inklusive 19% MwSt (deutscher Steuersatz).</p>
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
            <CardTitle className="text-yellow-400">Zusätzliche Informationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="additionalNotes" className="text-white">
                Besondere Anweisungen oder Notizen
              </Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))}
                className="bg-black border-gray-600 text-white focus:border-yellow-400 mt-2"
                placeholder="Besondere Anforderungen, zerbrechliche Gegenstände, Zeitpräferenzen, etc."
                rows={3}
              />
            </div>

            {/* File Upload Section */}
            <div>
              <Label className="text-white">
                Attach Files (Optional)
              </Label>
              <p className="text-sm text-gray-400 mb-2">
                Laden Sie Fotos Ihres Fahrzeugs, Dokumente oder andere relevante Dateien hoch (Max. 10MB pro Datei)
              </p>
              
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black bg-transparent"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Dateien auswählen
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
                    <p className="text-sm text-gray-300">Angehängte Dateien:</p>
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
              Kostenberechnung & Zahlung
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
                    Anfrage wird gesendet...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Detailliertes Angebot anfordern
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
                    <span>Entfernung:</span>
                    <span>{formData.distance} km</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Ausgewählte Dienstleistungen:</span>
                    <span>{formData.selectedServices.length} Dienstleistung(en)</span>
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
                    <span>Gesamtkosten:</span>
                    <span>€{totalCost.toFixed(2)}</span>
                  </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="space-y-3">
                    <Button
                      onClick={handleProceedToPayment}
                      className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-bold py-3"
                      disabled={!isVipTransfer && (!formData.customerName || !formData.email || !formData.phone)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {isVipTransfer ? "🚀 VIP Transfer bezahlen" : "Zur PayPal-Zahlung"}
                    </Button>
                    
                    {!isVipTransfer && (
                      <Button
                        onClick={() => setShowManualPayment(true)}
                        variant="outline"
                        className="w-full border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold py-3"
                        disabled={!formData.customerName || !formData.email || !formData.phone}
                      >
                        🏦 Überweisung (Banküberweisung)
                      </Button>
                    )}
                  </div>

                  {showPayPal && (
                    <div id="paypal-section" className="mt-4">
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
                                  description: isVipTransfer 
                                    ? `VIP Transfer - €${(totalCost / 1.19).toFixed(2)} + 19% MwSt`
                                    : `Transport Service - ${formData.distance}km from ${formData.startAddress.split(",")[0]} to ${formData.endAddress.split(",")[0]}`,
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
                                  customerInfo: isVipTransfer ? {
                                    name: "VIP Transfer Customer",
                                    email: "vip@engel-trans.de",
                                    phone: "VIP Transfer",
                                  } : {
                                    name: formData.customerName,
                                    email: formData.email,
                                    phone: formData.phone,
                                  },
                                  serviceDetails: isVipTransfer ? {
                                    bookingDate: null,
                                    bookingTime: "",
                                    startAddress: "VIP Transfer",
                                    endAddress: "VIP Transfer",
                                    distance: 0,
                                    services: ["vip-transfer"],
                                    notes: `VIP Transfer - €${(totalCost / 1.19).toFixed(2)} + 19% MwSt`,
                                  } : {
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
                                setIsVipTransfer(false)
                                setVipAmount("")
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

            {isVipTransfer && (
              <div className="bg-yellow-900 border border-yellow-400 p-4 rounded-lg">
                <p className="text-yellow-400 font-medium">
                  🚀 VIP Transfer aktiv - Betrag: €{(totalCost / 1.19).toFixed(2)} + 19% MwSt = €{totalCost.toFixed(2)}
                </p>
                <p className="text-yellow-300 text-sm mt-1">
                  Keine Kundendaten erforderlich - direkte PayPal-Zahlung
                </p>
              </div>
            )}

            {formData.distance === 0 && formData.selectedServices.length > 0 && !isVipTransfer && (
              <div className="bg-blue-900 border border-blue-400 p-4 rounded-lg">
                <p className="text-blue-400">
                  Bitte wählen Sie sowohl Abhol- als auch Zieladresse aus, um die Gesamtkosten zu berechnen.
                </p>
              </div>
            )}

            {formData.estimateRequested && (
              <div className="bg-green-900 border border-green-400 p-4 rounded-lg">
                <p className="text-green-400 font-medium">
                  ✓ Angebotsanfrage erfolgreich gesendet! Sie erhalten ein detailliertes Angebot innerhalb von 24 Stunden.
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
              Hilfe benötigt?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-white">
              <div>
                <p className="font-medium">E-Mail-Support:</p>
                <p className="text-yellow-400">app2023trans@gmail.com</p>
              </div>
              <div>
                <p className="font-medium">Telefon-Support:</p>
                <p className="text-yellow-400">+49 152 13550785</p>
              </div>
            </div>
            <p className="text-gray-400 mt-4 text-sm">Geschäftszeiten: Montag - Freitag, 9:00 - 18:00 Uhr</p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-black border-t-2 border-yellow-400 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <p className="text-gray-400">© 2024 ENGEL-TRANS. Alle Rechte vorbehalten.</p>
          </div>
          
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href="#" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              AGB
            </a>
            <a href="#" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              Datenschutz
            </a>
            <button 
              onClick={() => setShowImpressum(true)}
              className="text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Impressum
            </button>
          </div>
        </div>
      </footer>
        </div>
      )}
    </>
  )
}
