'use client'

import { PhoneCall, Phone, Radio } from 'lucide-react'

const EMERGENCY_CONTACTS = [
  {
    name: 'MDRRMO Tarragona Operations Center',
    role: 'Disaster Risk Reduction & Rescue',
    phone: '0917-827-7278',
    desc: '24/7 Operations Center for floods, typhoons, landslides, and vehicular accidents.',
  },
  {
    name: 'Tarragona Municipal Police Station (PNP)',
    role: 'Law Enforcement & Peace / Order',
    phone: '0998-598-7281',
    desc: 'Emergency security response and crime reporting.',
  },
  {
    name: 'Bureau of Fire Protection (BFP) Tarragona',
    role: 'Fire & Rescue Operations',
    phone: '0912-456-7890',
    desc: 'Fire fighting, extraction, and emergency search & rescue.',
  },
  {
    name: 'Tarragona Municipal Health Office (MHO)',
    role: 'Ambulance & Medical Emergency',
    phone: '0920-334-5566',
    desc: 'Urgent medical assistance, patient transport, and emergency triage.',
  },
  {
    name: 'Philippine Coast Guard (PCG) Tarragona',
    role: 'Maritime & Coastal Search / Rescue',
    phone: '0917-555-8899',
    desc: 'Sea incidents, coastal storm surges, and fishing emergency.',
  },
  {
    name: 'Davao Oriental Provincial DRRMO (PDRRMO)',
    role: 'Provincial Command Center',
    phone: '0929-111-2233',
    desc: 'Provincial coordination and secondary support dispatch.',
  },
]

export function CitizenContactsTab() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-red-600" />
          MDRRMO Tarragona Emergency Hotlines
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Direct contact numbers for immediate dispatch and assistance in Tarragona, Davao Oriental.
        </p>
      </div>

      <div className="space-y-3">
        {EMERGENCY_CONTACTS.map((contact) => (
          <div
            key={contact.name}
            className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-900">{contact.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                  {contact.role}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{contact.desc}</p>
              <div className="font-mono text-xs font-bold text-red-600 mt-1">{contact.phone}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-2xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
              <a
                href={`sms:${contact.phone.replace(/[^0-9]/g, '')}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>SMS</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
