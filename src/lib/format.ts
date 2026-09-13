export function formatKz(value: number): string {
  return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' Kz'
}

export function monthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1)
  const label = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}
