import type { ReportItem } from '@/types/report'

/**
 * Generates and downloads a CSV file from a list of reports.
 */
export function exportReportsToCsv(
  reports: ReportItem[],
  filename = `PDRRMO_Tarragona_Incident_Report_${new Date().toISOString().split('T')[0]}.csv`
) {
  const headers = [
    'Report ID',
    'Date & Time (UTC)',
    'Incident Title',
    'Situation Caption',
    'Status',
    'Latitude',
    'Longitude',
    'GPS Accuracy (m)',
    'Reporter Name',
    'Reporter Phone',
    'Reporter Email',
    'Media Type',
    'Media URL',
    'Verified At',
    'Rejection / Action Reason',
  ]

  const rows = reports.map((r) => [
    r.id,
    r.created_at,
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.caption || '').replace(/"/g, '""')}"`,
    r.status.toUpperCase(),
    r.latitude ?? '',
    r.longitude ?? '',
    r.accuracy ?? '',
    `"${(r.profiles?.full_name || '').replace(/"/g, '""')}"`,
    `"${(r.profiles?.phone_number || '').replace(/"/g, '""')}"`,
    `"${(r.profiles?.email || '').replace(/"/g, '""')}"`,
    r.media_type,
    `"${(r.media_url || '').replace(/"/g, '""')}"`,
    r.verified_at || '',
    `"${(r.rejection_reason || '').replace(/"/g, '""')}"`,
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
