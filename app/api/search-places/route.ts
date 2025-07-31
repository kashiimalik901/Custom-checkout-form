import { type NextRequest, NextResponse } from "next/server"

// Function to check if a place is in one of the allowed countries
function isInAllowedCountry(formattedAddress: string): boolean {
  const allowedCountries = ['Germany', 'Austria', 'Slovenia', 'Croatia', 'Deutschland', 'Österreich']
  const address = formattedAddress.toLowerCase()
  
  return allowedCountries.some(country => 
    address.includes(country.toLowerCase()) || 
    address.includes('germany') || 
    address.includes('austria') || 
    address.includes('slovenia') || 
    address.includes('croatia')
  )
}

export async function POST(request: NextRequest) {
  try {
    const { query, region } = await request.json()

    if (!query) {
      return NextResponse.json({ success: false, message: "Query is required" }, { status: 400 })
    }

    // Use the new Places API (New) Text Search with restrictions to Germany, Austria, Slovenia, and Croatia
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents",
      },
      body: JSON.stringify({
        textQuery: query,
        regionCode: "DE", // Default to Germany, but we'll filter by specific countries
        maxResultCount: 10, // Increased to get more results for filtering
        locationBias: {
          rectangle: {
            low: {
              latitude: 45.0, // Southern boundary (Slovenia/Croatia)
              longitude: 8.0,  // Western boundary (Germany)
            },
            high: {
              latitude: 55.0, // Northern boundary (Germany)
              longitude: 20.0, // Eastern boundary (Slovenia/Croatia)
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
      // Filter places to only include those from allowed countries
      const filteredPlaces = data.places
        .filter((place: any) => isInAllowedCountry(place.formattedAddress))
        .slice(0, 5) // Limit to 5 results after filtering
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
