import { type NextRequest, NextResponse } from "next/server"
import { sendQuoteEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract text fields
    const customerName = formData.get('customerName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const bookingDate = formData.get('bookingDate') as string
    const bookingTime = formData.get('bookingTime') as string
    const startAddress = formData.get('startAddress') as string
    const endAddress = formData.get('endAddress') as string
    const distance = parseFloat(formData.get('distance') as string)
    const selectedServices = JSON.parse(formData.get('selectedServices') as string) as string[]
    const additionalNotes = formData.get('additionalNotes') as string

    console.log("Estimate request received:", {
      customerName,
      email,
      phone,
      bookingDate,
      bookingTime,
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

    // Handle file attachments
    const files = formData.getAll('files') as File[]
    const validFiles = files.filter(file => file.size > 0)

    // Send email with quote details and attachments
    const emailResult = await sendQuoteEmail({
      customerName,
      email,
      phone,
      bookingDate,
      bookingTime,
      startAddress,
      endAddress,
      distance,
      selectedServices,
      additionalNotes,
      totalCost,
      attachments: validFiles,
    })

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: "Estimate request sent successfully! You will receive a detailed quote via email.",
        messageId: emailResult.messageId,
        filesAttached: validFiles.length,
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
