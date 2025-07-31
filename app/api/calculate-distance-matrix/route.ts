import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { origins, destinations } = await request.json()

    if (!origins || !destinations) {
      return NextResponse.json({ success: false, message: "Origins and destinations are required" }, { status: 400 })
    }

    console.log("Using Routes API for distance calculation...")

    // Use the new Routes API instead of Distance Matrix API
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: {
          address: origins,
        },
        destination: {
          address: destinations,
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
        languageCode: "en-US",
        units: "METRIC",
      }),
    })

    console.log("Routes API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Routes API error:", errorText)
      return NextResponse.json({ success: false, message: "Failed to calculate route" }, { status: 500 })
    }

    const data = await response.json()
    console.log("Routes API response:", data)

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      const distanceMeters = route.distanceMeters
      const duration = route.duration

      // Convert duration from seconds string (e.g., "1234s") to readable format
      const durationSeconds = Number.parseInt(duration.replace("s", ""))
      const durationMinutes = Math.round(durationSeconds / 60)
      const durationText = `${durationMinutes} min`

      console.log("Route calculated successfully:", {
        distance: distanceMeters,
        duration: durationText,
      })

      return NextResponse.json({
        success: true,
        distance: distanceMeters,
        duration: durationText,
        distanceText: `${Math.round(distanceMeters / 1000)} km`,
      })
    } else {
      console.error("No routes found in response")
      return NextResponse.json({ success: false, message: "No route found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Error calculating distance:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
