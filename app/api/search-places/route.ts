import { type NextRequest, NextResponse } from "next/server"

// Function to check if a place is in Germany only
// Function to check if a place is in Germany only
function isInGermany(formattedAddress: string): boolean {
  const address = formattedAddress.toLowerCase()

  // More comprehensive German indicators including postal codes and common terms
  const germanIndicators = [
    'germany', 'deutschland', 'de', 'd-',
    // Common German terms that might appear in addresses
    'bundesrepublik deutschland',
    // Check for German postal code patterns (5 digits)
    /\b\d{5}\b.*deutschland/,
    /\b\d{5}\b.*germany/,
    // Check if address ends with Germany/Deutschland
    /,\s*deutschland\s*$/,
    /,\s*germany\s*$/
  ]

  return germanIndicators.some(indicator => {
    if (typeof indicator === 'string') {
      return address.includes(indicator.toLowerCase())
    } else {
      // Handle regex patterns
      return indicator.test(address)
    }
  })
}

// Function to check if a place is in one of the allowed countries
function isInAllowedCountry(formattedAddress: string): boolean {
  const address = formattedAddress.toLowerCase()

  // More comprehensive country indicators
  const countryIndicators = [
    // Germany
    'germany', 'deutschland', 'de', 'd-', 'bundesrepublik deutschland',
    // Austria
    'austria', 'österreich', 'at', 'republik österreich',
    // Slovenia
    'slovenia', 'slovenija', 'si', 'republika slovenija',
    // Croatia
    'croatia', 'hrvatska', 'hr', 'republika hrvatska'
  ]

  // Also check for country codes at the end of addresses
  const countryCodePatterns = [
    /,\s*(germany|deutschland)\s*$/,
    /,\s*(austria|österreich)\s*$/,
    /,\s*(slovenia|slovenija)\s*$/,
    /,\s*(croatia|hrvatska)\s*$/
  ]

  const hasCountryIndicator = countryIndicators.some(indicator =>
    address.includes(indicator.toLowerCase())
  )

  const hasCountryCode = countryCodePatterns.some(pattern =>
    pattern.test(address)
  )

  return hasCountryIndicator || hasCountryCode
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

    if (!query) {
      return NextResponse.json({ success: false, message: "Query is required" }, { status: 400 })
    }

    // Use the new Places API (New) Text Search with broader search area
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents",
      },
      body: JSON.stringify({
        textQuery: query,
        // Remove regionCode restriction to get more results
        maxResultCount: 20, // Increased to get more results for filtering
        locationBias: {
          rectangle: {
            low: {
              latitude: 44.0, // Southern boundary (Croatia)
              longitude: 8.0,  // Western boundary (France)
            },
            high: {
              latitude: 55.0, // Northern boundary (Germany)
              longitude: 20.0, // Eastern boundary (Poland)
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Places API error:", errorText)
      return NextResponse.json({ success: false, message: "Failed to search places" }, { status: 500 })
    }

    const data = await response.json()

    if (data.places && data.places.length > 0) {
      console.log(`Found ${data.places.length} places for query: "${query}"`)

      // Filter places based on whether it's pickup (Germany only) or destination (all allowed countries)
      const filteredPlaces = data.places
        .filter((place: any) => {
          // Try address components first (more reliable), fallback to formatted address
          const useComponents = place.addressComponents && place.addressComponents.length > 0

          const isAllowed = isPickup
            ? (useComponents ? isInGermanyByComponents(place.addressComponents) : isInGermany(place.formattedAddress))
            : (useComponents ? isInAllowedCountryByComponents(place.addressComponents) : isInAllowedCountry(place.formattedAddress))

          if (!isAllowed) {
            console.log(`Filtered out ${isPickup ? '(pickup - Germany only)' : '(destination)'}: ${place.formattedAddress}`)
          }
          return isAllowed
        })
        .slice(0, 10) // Increased limit to show more results
        .map((place: any) => {
          // Create a better display name that emphasizes street address
          let displayName = place.displayName?.text || place.formattedAddress

          // If we have address components, try to create a more street-focused display
          if (place.addressComponents) {
            const streetNumber = place.addressComponents.find((comp: any) =>
              comp.types.includes('street_number')
            )?.longText
            const route = place.addressComponents.find((comp: any) =>
              comp.types.includes('route')
            )?.longText

            if (streetNumber && route) {
              displayName = `${streetNumber} ${route}, ${place.formattedAddress.split(',').slice(-2).join(', ')}`
            } else if (route) {
              displayName = `${route}, ${place.formattedAddress.split(',').slice(-2).join(', ')}`
            }
          }

          return {
            place_id: place.id,
            display_name: displayName,
            formatted_address: place.formattedAddress,
            location: place.location,
          }
        })

      return NextResponse.json({
        success: true,
        places: filteredPlaces,
      })
    } else {
      return NextResponse.json({ success: true, places: [] })
    }
  } catch (error) {
    console.error("Error searching places:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
