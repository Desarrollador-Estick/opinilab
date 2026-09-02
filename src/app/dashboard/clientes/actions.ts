"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { randomUUID } from "crypto"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createClientRecord, updateClient, deleteClient } from "@/lib/supabase/queries"
import { provisionClientAccess } from "./account-actions"
import { sendClientCredentialsEmail } from "@/lib/email/client-credentials"
import { sendEmail } from "@/lib/email/send"
import { invoiceWithLinkEmail } from "@/lib/email/templates"
import { generateInvoiceNumber } from "@/lib/utils"
import { Database } from "@/types/database"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"]
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"]

export type CreateClientState = {
  error?: string
  success?: boolean
  accountCreated?: boolean
  email?: string
  accountNotice?: string
}

export async function createClientAction(
  prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const supabase = await createClient()

  const data: ClientInsert = {
    business_name: formData.get("business_name") as string,
    contact_name: formData.get("contact_name") as string,
    email: (formData.get("email") as string)?.trim().toLowerCase(),
    phone: (formData.get("phone") as string) || null,
    website: (formData.get("website") as string) || null,
    address: (formData.get("address") as string) || null,
    city: (formData.get("city") as string) || null,
    province: (formData.get("province") as string) || null,
    postal_code: (formData.get("postal_code") as string) || null,
    nif_cif: (formData.get("nif_cif") as string) || null,
    industry: (formData.get("industry") as string) || null,
    google_maps_url: (formData.get("google_maps_url") as string) || null,
    monthly_budget: parseFloat(formData.get("monthly_budget") as string) || 0,
    lead_source: (formData.get("lead_source") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: (formData.get("status") as ClientInsert["status"]) || "active",
  }

  const { data: created, error } = await createClientRecord(supabase, data)

  if (error) {
    return { error: error.message }
  }

  let accountCreated = false
  let accountNotice: string | undefined

  // Crear automáticamente el acceso del cliente: contraseña temporal aleatoria.
  if (created?.id && data.email) {
    const provision = await provisionClientAccess({
      clientId: created.id,
      email: data.email,
      fullName: data.contact_name || data.business_name,
    })
    if (provision.ok) {
      accountCreated = true
      // Enviar credenciales temporales por email (nunca rompe el flujo).
      if (provision.temporaryPassword) {
        await sendClientCredentialsEmail({
          email: data.email,
          temporaryPassword: provision.temporaryPassword,
          fullName: data.contact_name || data.business_name,
          clientId: created.id,
        })
      }
    } else {
      accountNotice = provision.error
    }
  }

  revalidatePath("/dashboard/clientes")

  if (accountCreated) {
    revalidatePath(`/dashboard/clientes/${created!.id}`)
    return {
      success: true,
      accountCreated: true,
      email: data.email,
    }
  }

  return {
    success: true,
    accountNotice,
  }
}

export async function updateClientAction(id: string, formData: FormData) {
  const supabase = await createClient()

  const data: ClientUpdate = {
    business_name: formData.get("business_name") as string,
    contact_name: formData.get("contact_name") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || null,
    website: (formData.get("website") as string) || null,
    address: (formData.get("address") as string) || null,
    city: (formData.get("city") as string) || null,
    province: (formData.get("province") as string) || null,
    postal_code: (formData.get("postal_code") as string) || null,
    nif_cif: (formData.get("nif_cif") as string) || null,
    industry: (formData.get("industry") as string) || null,
    google_maps_url: (formData.get("google_maps_url") as string) || null,
    monthly_budget: parseFloat(formData.get("monthly_budget") as string) || 0,
    lead_source: (formData.get("lead_source") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: (formData.get("status") as ClientUpdate["status"]),
  }

  const { error } = await updateClient(supabase, id, data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/clientes/${id}`)
  revalidatePath("/dashboard/clientes")
  redirect(`/dashboard/clientes/${id}`)
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient()

  const { error } = await deleteClient(supabase, id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard/clientes")
  revalidatePath("/dashboard")
  redirect("/dashboard/clientes")
}

type ClientServiceInsert = Database["public"]["Tables"]["client_services"]["Insert"]
type ClientServiceUpdate = Database["public"]["Tables"]["client_services"]["Update"]

export type ClientServiceState = {
  error?: string
  success?: boolean
}

// Asigna un servicio del catálogo a un cliente (lo activa y registra la fecha de inicio).
export async function addClientServiceAction(
  clientId: string,
  serviceId: string
): Promise<ClientServiceState> {
  const supabase = await createClient()

  // Evitar duplicados: si ya existe la asignación, no la vuelve a crear.
  const { data: existing } = await supabase
    .from("client_services")
    .select("id, status")
    .eq("client_id", clientId)
    .eq("service_id", serviceId)
    .maybeSingle()

  if (existing) {
    if (existing.status === "cancelled") {
      const { error } = await supabase
        .from("client_services")
        .update({ status: "active", end_date: null })
        .eq("id", existing.id)
      if (error) return { error: error.message }
      revalidatePath(`/dashboard/clientes/${clientId}`)
      return { success: true }
    }
    return { error: "El cliente ya tiene este servicio asignado" }
  }

  const data: ClientServiceInsert = {
    client_id: clientId,
    service_id: serviceId,
    status: "active",
    custom_price: null,
    start_date: new Date().toISOString(),
  }

  const { error } = await supabase.from("client_services").insert(data)
  if (error) return { error: error.message }

  // Cargo de setup (alta): si hay un importe configurado en Administración →
  // Configuración → Facturación, se crea una factura inmediata y se intenta
  // cobrar con la tarjeta guardada. Este paso nunca rompe la asignación.
  await chargeSetupFee(supabase, clientId, serviceId)

  // Informa al cliente qué herramientas debe aportar para este servicio.
  await notifyRequiredTools(supabase, clientId, serviceId)

  revalidatePath(`/dashboard/clientes/${clientId}`)
  return { success: true }
}

// Envía al cliente un email indicando las herramientas necesarias para el
// servicio recién asignado, invitándole a dejarlas en su portal. Tolerante a
// fallos: cualquier error solo se loguea, nunca rompe la asignación.
async function notifyRequiredTools(supabase: any, clientId: string, serviceId: string) {
  try {
    const [serviceRes, clientRes] = await Promise.all([
      supabase
        .from("services")
        .select("name, category")
        .eq("id", serviceId)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("email, contact_name, business_name")
        .eq("id", clientId)
        .maybeSingle(),
    ])
    const service = Array.isArray(serviceRes.data) ? serviceRes.data[0] : serviceRes.data
    const client = Array.isArray(clientRes.data) ? clientRes.data[0] : clientRes.data
    if (!client?.email || !service?.name || !service?.category) return

    const { sendRequiredToolsEmail } = await import("@/lib/email/required-tools")
    await sendRequiredToolsEmail({
      email: client.email,
      fullName: client.contact_name || undefined,
      businessName: client.business_name || undefined,
      serviceName: service.name,
      category: service.category,
    })
  } catch (e) {
    console.warn("[required-tools] Error notificando herramientas:", e instanceof Error ? e.message : e)
  }
}

// Crea y cobra la factura de setup (alta) al asignar un servicio nuevo.
// - lee el importe desde settings ("setup_fee")
// - crea una factura inmediata
// - intenta cobrarla off_session con la tarjeta guardada
// - si no hay tarjeta → marca "sent" y envía el email con enlace de pago
// Nunca rompe la asignación del servicio: cualquier error solo se loguea.
async function chargeSetupFee(supabase: any, clientId: string, serviceId: string) {
  try {
    const { data: feeRows } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "setup_fee")
      .maybeSingle()
    const setupFee = Number(feeRows?.value ?? 0)
    if (!feeRows || isNaN(setupFee) || setupFee <= 0) return

    const [serviceRes, clientRes] = await Promise.all([
      supabase
        .from("services")
        .select("name, billing_cycle")
        .eq("id", serviceId)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("id, business_name, contact_name, email, status, stripe_customer_id, stripe_default_payment_method_id")
        .eq("id", clientId)
        .maybeSingle(),
    ])
    const service = Array.isArray(serviceRes.data) ? serviceRes.data[0] : serviceRes.data
    const client = Array.isArray(clientRes.data) ? clientRes.data[0] : clientRes.data
    if (!client?.email) return

    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
    const year = new Date().getFullYear()
    const invoiceNumber = generateInvoiceNumber(year, (count || 0) + 1)
    const paymentToken = randomUUID().replace(/-/g, "")

    const issueDate = new Date().toISOString().split("T")[0]
    const due = new Date()
    due.setDate(due.getDate() + 30)
    const dueDate = due.toISOString().split("T")[0]

    const subtotal = Math.round(setupFee * 100) / 100
    const tax_rate = 21
    const taxAmount = Math.round(subtotal * (tax_rate / 100) * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: clientId,
        invoice_number: invoiceNumber,
        status: "draft",
        subtotal,
        tax_rate,
        tax_amount: taxAmount,
        total,
        issue_date: issueDate,
        due_date: dueDate,
        notes: `Setup de alta del servicio ${service?.name ?? ""}`.trim(),
        payment_token: paymentToken,
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      console.warn("[setup] No se pudo crear la factura de setup:", invoiceError?.message || "sin datos")
      return
    }

    await supabase.from("invoice_items").insert({
      invoice_id: invoice.id,
      description: `Setup de alta - ${service?.name ?? "servicio"}`,
      quantity: 1,
      unit_price: setupFee,
      total: setupFee,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const payUrl = `${appUrl}/pagar/${paymentToken}`

    // Cargo automático con la tarjeta guardada.
    if (stripe && client.stripe_customer_id && client.stripe_default_payment_method_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100),
          currency: "eur",
          customer: client.stripe_customer_id,
          payment_method: client.stripe_default_payment_method_id,
          off_session: true,
          confirm: true,
          metadata: {
            client_id: clientId,
            invoice_id: invoice.id,
            invoice_number: invoiceNumber,
            type: "setup",
          },
        })

        await supabase
          .from("invoices")
          .update({ stripe_payment_intent_id: paymentIntent.id, updated_at: new Date().toISOString() })
          .eq("id", invoice.id)

        if (paymentIntent.status === "succeeded") {
          await supabase
            .from("invoices")
            .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_method: "card", updated_at: new Date().toISOString() })
            .eq("id", invoice.id)
          await supabase.from("payments").insert({
            invoice_id: invoice.id,
            amount: total,
            payment_method: "card",
            payment_date: new Date().toISOString().split("T")[0],
            reference: paymentIntent.id,
            notes: `Cobro setup de alta (${paymentIntent.id})`,
          })
          return
        }
      } catch (e: any) {
        console.warn("[setup] Cargo automático fallido:", e?.message)
      }
    }

    // Sin tarjeta guardada o cobro fallido: factura enviada con enlace de pago.
    await supabase
      .from("invoices")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", invoice.id)

    await sendEmail({
      to: client.email,
      template: "invoice",
      subject: `Factura ${invoiceNumber} - ${process.env.COMPANY_NAME || "Agencia Marketing"}`,
      html: invoiceWithLinkEmail(invoiceNumber, total, dueDate, client.contact_name || client.business_name, payUrl).html,
      clientId: clientId,
      data: { invoiceNumber, total, dueDate, clientName: client.business_name, payUrl },
    })
  } catch (e) {
    console.warn("[setup] Error procesando el cargo de setup:", e instanceof Error ? e.message : e)
  }
}
export async function removeClientServiceAction(
  clientServiceId: string
): Promise<ClientServiceState> {
  const supabase = await createClient()

  const { data: cs, error: fetchError } = await supabase
    .from("client_services")
    .select("client_id")
    .eq("id", clientServiceId)
    .single()
  if (fetchError || !cs) return { error: "Asignación no encontrada" }

  const { error } = await supabase
    .from("client_services")
    .delete()
    .eq("id", clientServiceId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clientes/${cs.client_id}`)
  return { success: true }
}

// Activa / pausa un servicio asignado a un cliente.
export async function toggleClientServiceStatusAction(
  clientServiceId: string,
  status: ClientServiceUpdate["status"]
): Promise<ClientServiceState> {
  const supabase = await createClient()

  const { data: cs, error: fetchError } = await supabase
    .from("client_services")
    .select("id, client_id, status")
    .eq("id", clientServiceId)
    .single()
  if (fetchError || !cs) return { error: "Asignación no encontrada" }

  const next =
    status === "active" ? "paused" : status === "paused" ? "active" : status

  const update: ClientServiceUpdate = { status: next }
  if (next === "active") update.end_date = null
  if (next === "paused") update.end_date = new Date().toISOString()

  const { error } = await supabase
    .from("client_services")
    .update(update)
    .eq("id", clientServiceId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clientes/${cs.client_id}`)
  return { success: true }
}
