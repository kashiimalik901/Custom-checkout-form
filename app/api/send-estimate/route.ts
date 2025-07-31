import { type NextRequest, NextResponse } from "next/server"
import { sendQuoteEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, email, phone, startAddress, endAddress, distance, selectedServices, additionalNotes } = body

    console.log("Estimate request received:", {
      customerName,
      email,
      phone,
      startAddress,
      endAddress,
      distance,
      selectedServices,
      additionalNotes,
      timestamp: new Date().toISOString(),
    })

    // Calculate total cost for the email
    const services = [
      { id: "towing-germany", baseFee: 60, pricePerKm: 1.0 },
      { id: "towing-outside", baseFee: 100, pricePerKm: 0.8 },
      { id: "moving", baseFee: 0, pricePerKm: 1.5 },
      { id: "vehicle-transfer", baseFee: 0, pricePerKm: 1.5 },
    ]

    const totalCost = selectedServices.reduce((total: number, serviceId: string) => {
      const service = services.find((s) => s.id === serviceId)
      if (!service) return total
      const serviceCost = service.baseFee + (distance * service.pricePerKm)
      return total + serviceCost
    }, 0) * 1.19 // Add 19% VAT

    // Send email with quote details
    const emailResult = await sendQuoteEmail({
      customerName,
      email,
      phone,
      startAddress,
      endAddress,
      distance,
      selectedServices,
      additionalNotes,
      totalCost,
    })

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: "Estimate request sent successfully! You will receive a detailed quote via email.",
        messageId: emailResult.messageId,
      })
    } else {
      console.error("Email sending failed:", emailResult.error)
      return NextResponse.json({
        success: false,
        message: "Estimate request received but email delivery failed. Please contact us directly.",
      })
    }
  } catch (error) {
    console.error("Error processing estimate request:", error)
    return NextResponse.json({ success: false, message: "Failed to process estimate request" }, { status: 500 })
  }
}
