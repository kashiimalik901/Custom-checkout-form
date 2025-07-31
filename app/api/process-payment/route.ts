import { type NextRequest, NextResponse } from "next/server"
import { sendQuoteEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, customerInfo, serviceDetails, totalAmount } = body

    console.log("Payment processed:", {
      paymentId,
      customerInfo,
      serviceDetails,
      totalAmount,
      timestamp: new Date().toISOString(),
    })

    // Send confirmation email with payment details
    const emailData = {
      customerName: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      startAddress: serviceDetails.startAddress,
      endAddress: serviceDetails.endAddress,
      distance: serviceDetails.distance,
      selectedServices: serviceDetails.services,
      additionalNotes: serviceDetails.notes || "",
      totalCost: totalAmount,
    }

    const emailResult = await sendQuoteEmail(emailData)

    if (!emailResult.success) {
      console.error("Failed to send confirmation email:", emailResult.error)
      // Continue with payment processing even if email fails
    }

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // TODO: Save to database
    // TODO: Schedule service

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      orderId: orderId,
      paymentId: paymentId,
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to process payment",
        error: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
}
