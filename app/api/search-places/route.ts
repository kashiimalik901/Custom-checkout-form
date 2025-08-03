import { type NextRequest, NextResponse } from "next/server"

// Function to check if a place is in Germany only
function isInGermany(formattedAddress: string): boolean {
  const address = formattedAddress.toLowerCase()
  const germanIndicators = [
    'germany', 'deutschland', 'de', 'd-',
    'bundesrepublik deutschland'
  ]
  return germanIndicators.some(indicator => 
    address.includes(indicator.toLowerCase())
  )
}

// Function to check if a place is in one of the allowed countries
function isInAllowedCountry(formattedAddress: string): boolean {
  const address = formattedAddress.toLowerCase()
  const countryIndicators = [
    'germany', 'deutschland', 'de', 'd-',
    'austria', 'österreich', 'at',
    'slovenia', 'slovenija', 'si',
    'croatia', 'hrvatska', 'hr'
  ]
  return countryIndicators.some(indicator => 
    address.includes(indicator.toLowerCase())
  )
}

// Alternative approach using address components for more reliable detection
function isInGermanyByComponents(addressComponents: any[]): boolean {
  if (!addressComponents) return false
  
  const country = addressComponents.find((comp: any) => 
    comp.types.includes('country')
  )
  
  return country?.shortText === 'DE' || 
         country?.longText?.toLowerCase().includes('germany') ||
         country?.longText?.toLowerCase().includes('deutschland')
}

function isInAllowedCountryByComponents(addressComponents: any[]): boolean {
  if (!addressComponents) return false
  
  const country = addressComponents.find((comp: any) => 
    comp.types.includes('country')
  )
  
  const allowedCountryCodes = ['DE', 'AT', 'SI', 'HR']
  const allowedCountryNames = [
    'germany', 'deutschland',
    'austria', 'österreich', 
    'slovenia', 'slovenija',
    'croatia', 'hrvatska'
  ]
  
  if (country?.shortText && allowedCountryCodes.includes(country.shortText)) {
    return true
  }
  
  if (country?.longText) {
    const countryName = country.longText.toLowerCase()
    return allowedCountryNames.some(name => countryName.includes(name))
  }
  
  return false
}


export async function POST(request: NextRequest) {
  try {
    const { query, region, isPickup } = await request.json()

    // Return empty results for very short queries
    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, places: [] })
    }

    // Use Autocomplete API with country restrictions
    const autocompleteBody: any = {
      input: query,
      locationBias: {
        rectangle: {
          low: {
            latitude: 44.0, // Southern boundary (Croatia)
            longitude: 8.0,  // Western boundary
          },
          high: {
            latitude: 55.0, // Northern boundary (Germany)
            longitude: 20.0, // Eastern boundary
          },
        },
      },
      includedPrimaryTypes: ["establishment", "street_address", "route", "locality", "sublocality"],
      languageCode: "en",
    }

    // Add country restriction for pickup (Germany only)
    if (isPickup) {
      autocompleteBody.includedRegionCodes = ["DE"]
    } else {
      // For destinations, include all allowed countries
      autocompleteBody.includedRegionCodes = ["DE", "AT", "SI", "HR"]
    }

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      },
      body: JSON.stringify(autocompleteBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Places Autocomplete API error:", errorText)
      return NextResponse.json({ success: false, message: "Failed to get autocomplete suggestions" }, { status: 500 })
    }

    const data = await response.json()

    if (data.suggestions && data.suggestions.length > 0) {
      console.log(`Found ${data.suggestions.length} suggestions for query: "${query}"`)
      
      // Process suggestions without additional API calls for better performance
      const processedPlaces = data.suggestions
        .filter((suggestion: any) => suggestion.placePrediction?.placeId)
        .slice(0, 8) // Limit results
        .map((suggestion: any) => {
          const prediction = suggestion.placePrediction
          
          // Extract display information from the prediction
          const mainText = prediction.structuredFormat?.mainText?.text || ''
          const secondaryText = prediction.structuredFormat?.secondaryText?.text || ''
          const fullText = prediction.text?.text || ''
          
          // Create a display name prioritizing street address
          let displayName = fullText
          if (mainText && secondaryText) {
            displayName = `${mainText}, ${secondaryText}`
          }
          
          return {
            place_id: prediction.placeId,
            display_name: displayName,
            formatted_address: fullText,
            main_text: mainText,
            secondary_text: secondaryText,
            // We'll get location details when user selects this item
            location: null,
          }
        })

      return NextResponse.json({
        success: true,
        places: processedPlaces,
      })
    } else {
      return NextResponse.json({ success: true, places: [] })
    }
  } catch (error) {
    console.error("Error in autocomplete:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}


// Optional: Create a separate endpoint for getting full place details when user selects an item
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('placeId')
    
    if (!placeId) {
      return NextResponse.json({ success: false, message: "Place ID is required" }, { status: 400 })
    }

    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents",
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ success: false, message: "Failed to get place details" }, { status: 500 })
    }
    
    const placeDetails = await response.json()
    
    return NextResponse.json({
      success: true,
      place: placeDetails,
    })
  } catch (error) {
    console.error("Error getting place details:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
