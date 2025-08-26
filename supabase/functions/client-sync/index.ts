// Client Sync Edge Function for Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MondayColumn {
  id: string;
  text: string;
  value: string;
  title?: string;
}

interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumn[];
}

interface ClientUpdate {
  project_id: string;
  client_email: string;
  client_name: string;
  design_name: string;
  svg_content?: string;
  notes?: string;
  status: string;
  updated_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Monday.com API configuration
    const MONDAY_API_URL = 'https://api.monday.com/v2'
    const API_TOKEN = Deno.env.get('MONDAY_API_TOKEN')
    const CLIENTS_BOARD_ID = '1923600883' // CRM доска 🔥WorkSpace

    if (!API_TOKEN) {
      throw new Error('Monday.com API token not configured')
    }

    console.log('🔄 Starting client sync from Monday.com...')

    // Fetch data from Monday.com
    const query = `
      query {
        boards(ids: [${CLIENTS_BOARD_ID}]) {
          name
          columns {
            id
            title
            type
          }
          items_page {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `

    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_TOKEN,
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      throw new Error(`Monday.com API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(`Monday.com GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

        // Process Monday.com data
    const boardData = data.data.boards[0]
    if (!boardData) {
      throw new Error('Board not found')
    }

    const { items_page, columns } = boardData
    const items: MondayItem[] = items_page?.items || []

    // Create column mapping
    const columnMap = new Map()
    columns.forEach((col: any) => {
      columnMap.set(col.id, { title: col.title, type: col.type })
    })

    console.log(`📊 Processing ${items.length} items from Monday.com`)

    const clientUpdates: ClientUpdate[] = []

    for (const item of items) {
      // Ищем колонки для клиентских данных
      const emailColumn = item.column_values.find(col => 
        columnMap.get(col.id)?.title?.toLowerCase().includes('mail') ||
        (col.text && col.text.includes('@'))
      )
      
      const statusColumn = item.column_values.find(col => 
        columnMap.get(col.id)?.title?.toLowerCase().includes('lead status') ||
        columnMap.get(col.id)?.title?.toLowerCase().includes('design status')
      )

      const notesColumn = item.column_values.find(col => 
        columnMap.get(col.id)?.title?.toLowerCase().includes('read me') ||
        columnMap.get(col.id)?.title?.toLowerCase().includes('request')
      )

      if (emailColumn && emailColumn.text) {
        const projectId = `CRM-MONDAY-${item.id}`
        const clientEmail = emailColumn.text.trim()
        const clientName = item.name || 'Unknown Client'
        const designName = `Design for ${clientName}`
        const status = statusColumn?.text?.toLowerCase() || 'draft'
        const notes = notesColumn?.text || `Imported from Monday.com item ${item.id}`

        clientUpdates.push({
          project_id: projectId,
          client_email: clientEmail,
          client_name: clientName,
          design_name: designName,
          notes: notes,
          status: mapMondayStatus(status),
          updated_at: new Date().toISOString()
        })
      }
    }

    console.log(`📝 Found ${clientUpdates.length} client projects to sync`)

    if (clientUpdates.length > 0) {
      // Update clients in Supabase
      const { error: upsertError } = await supabaseClient
        .from('crm_projects')
        .upsert(clientUpdates, { onConflict: 'project_id' })

      if (upsertError) {
        throw new Error(`Failed to update clients: ${upsertError.message}`)
      }
    }

    console.log('✅ Client sync completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        clientsUpdated: clientUpdates.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Client sync error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to map Monday.com status to CRM status
function mapMondayStatus(mondayStatus: string): string {
  const status = mondayStatus.toLowerCase()
  
  if (status.includes('done') || status.includes('completed') || status.includes('готово')) {
    return 'completed'
  } else if (status.includes('approved') || status.includes('одобрено')) {
    return 'approved'
  } else if (status.includes('sent') || status.includes('отправлено')) {
    return 'sent'
  } else if (status.includes('viewed') || status.includes('просмотрено')) {
    return 'viewed'
  } else {
    return 'draft'
  }
}
