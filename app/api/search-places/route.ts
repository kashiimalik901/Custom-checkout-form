import { type NextRequest, NextResponse } from "next/server"

// Function to check if a place is in one of the allowed countries
function isInAllowedCountry(formattedAddress: string): boolean {
  const allowedCountries = ['Germany', 'Austria', 'Slovenia', 'Croatia', 'Deutschland', 'Österreich']
  const address = formattedAddress.toLowerCase()
  
  // Check for exact country matches
  const hasExactMatch = allowedCountries.some(country => 
    address.includes(country.toLowerCase())
  )
  
  if (hasExactMatch) return true
  
  // Additional checks for German addresses that might not explicitly mention "Germany"
  const germanIndicators = [
    'germany', 'deutschland', 'de', 'd-', 'munich', 'münchen', 'berlin', 'hamburg', 
    'hannover', 'frankfurt', 'cologne', 'köln', 'düsseldorf', 'stuttgart', 'dresden',
    'leipzig', 'nürnberg', 'nuremberg', 'bremen', 'hannover', 'bonn', 'mannheim',
    'karlsruhe', 'wiesbaden', 'gelsenkirchen', 'münster', 'augsburg', 'braunschweig',
    'kiel', 'aachen', 'halle', 'magdeburg', 'freiburg', 'krefeld', 'lübeck', 'oberhausen',
    'erfurt', 'mainz', 'rostock', 'kassel', 'potsdam', 'hagen', 'saarbrücken', 'mülheim',
    'ludwigshafen', 'leverkusen', 'oldenburg', 'neuss', 'darmstadt', 'paderborn', 'regensburg',
    'ingolstadt', 'würzburg', 'fürth', 'wolfsburg', 'ulm', 'heilbronn', 'pforzheim',
    'offenbach', 'bottrop', 'göttingen', 'trier', 'reutlingen', 'bremerhaven', 'koblenz',
    'bergisch gladbach', 'remscheid', 'jena', 'erlangen', 'moers', 'siegen', 'hildesheim',
    'salzgitter', 'cottbus', 'kaiserslautern', 'gütersloh', 'schwerin', 'düren', 'esslingen',
    'ludwigsburg', 'wilhelmshaven', 'herne', 'tübingen', 'doberlug-kirchhain', 'detmold',
    'lüneburg', 'marburg', 'arnstadt', 'lüdenscheid', 'bamberg', 'bayreuth', 'bocholt',
    'celle', 'fulda', 'giessen', 'hamm', 'hanau', 'hof', 'kempten', 'landshut', 'minden',
    'offenburg', 'passau', 'rosenheim', 'stralsund', 'traunstein', 'weiden', 'wetzlar',
    'wismar', 'wolfenbüttel', 'zwickau'
  ]
  
  // Check for German city/region indicators
  const hasGermanIndicator = germanIndicators.some(indicator => 
    address.includes(indicator.toLowerCase())
  )
  
  if (hasGermanIndicator) return true
  
  // Austrian city indicators
  const austrianIndicators = [
    'austria', 'österreich', 'vienna', 'wien', 'salzburg', 'graz', 'linz', 'innsbruck',
    'klagenfurt', 'villach', 'wels', 'sankt pölten', 'dornbirn', 'steyr', 'wiener neustadt',
    'feldkirch', 'bregenz', 'wolfsberg', 'leoben', 'krems', 'traun', 'amstetten', 'lienz'
  ]
  
  const hasAustrianIndicator = austrianIndicators.some(indicator => 
    address.includes(indicator.toLowerCase())
  )
  
  if (hasAustrianIndicator) return true
  
  // Slovenian city indicators
  const slovenianIndicators = [
    'slovenia', 'slovenija', 'ljubljana', 'maribor', 'celje', 'kranj', 'velenje',
    'koper', 'novo mesto', 'ptuj', 'trbovlje', 'kamnik', 'jesenice', 'nova gorica',
    'domžale', 'škofja loka', 'murska sobota', 'ajdovščina', 'bovec', 'brežice'
  ]
  
  const hasSlovenianIndicator = slovenianIndicators.some(indicator => 
    address.includes(indicator.toLowerCase())
  )
  
  if (hasSlovenianIndicator) return true
  
  // Croatian city indicators
  const croatianIndicators = [
    'croatia', 'hrvatska', 'zagreb', 'split', 'rijeka', 'osijek', 'zadar', 'slavonski brod',
    'pula', 'šibenik', 'varazdin', 'dubrovnik', 'karlovac', 'sisak', 'velika gorica',
    'vinkovci', 'požega', 'koprivnica', 'čakovec', 'dakovo', 'vukovar', 'kutina'
  ]
  
  const hasCroatianIndicator = croatianIndicators.some(indicator => 
    address.includes(indicator.toLowerCase())
  )
  
  return hasCroatianIndicator
}

export async function POST(request: NextRequest) {
  try {
    const { query, region } = await request.json()

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
        maxResultCount: 15, // Increased to get more results for filtering
        locationBias: {
          rectangle: {
            low: {
              latitude: 45.0, // Southern boundary (Slovenia/Croatia)
              longitude: 5.0,  // Western boundary (France/Switzerland)
            },
            high: {
              latitude: 55.0, // Northern boundary (Germany)
              longitude: 25.0, // Eastern boundary (Poland/Slovakia)
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
      
      // Filter places to only include those from allowed countries
      const filteredPlaces = data.places
        .filter((place: any) => {
          const isAllowed = isInAllowedCountry(place.formattedAddress)
          if (!isAllowed) {
            console.log(`Filtered out: ${place.formattedAddress}`)
          }
          return isAllowed
        })
        .slice(0, 8) // Increased limit to show more results
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
