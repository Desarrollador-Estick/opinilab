import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function generateInvoiceNumber(year: number, sequence: number): string {
  return `FAC-${year}-${String(sequence).padStart(4, '0')}`
}

export function generateContractNumber(year: number, sequence: number): string {
  return `CON-${year}-${String(sequence).padStart(4, '0')}`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    churned: 'bg-red-100 text-red-800',
    prospect: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    signed: 'bg-green-100 text-green-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    new: 'bg-purple-100 text-purple-800',
    contacted: 'bg-blue-100 text-blue-800',
    won: 'bg-green-100 text-green-800',
    interested: 'bg-yellow-100 text-yellow-800',
    proposal_sent: 'bg-indigo-100 text-indigo-800',
    negotiation: 'bg-orange-100 text-orange-800',
    lost: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
    expired: 'bg-gray-200 text-gray-700',
    terminated: 'bg-red-200 text-red-900',
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
    flagged: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-500',
    scheduled: 'bg-blue-100 text-blue-800',
    published: 'bg-green-100 text-green-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
