// Daily Price Sync Edge Function for Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MondayItem {
  id: string;
  name: string;
  column_values: Array<{
    id: string;
    text: string;
    value: string;
  }>;
}

interface PriceUpdate {
  price_key: string;
  price_value: number;
  monday_item_id: string;
  unit: string;
  last_updated: string;
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
    const BOARD_ID = Deno.env.get('MONDAY_BOARD_ID') || '2090208832'

    if (!API_TOKEN) {
      throw new Error('Monday.com API token not configured')
    }

    console.log('🔄 Starting daily price sync...')

    // Check if sync is needed (last successful sync > 24 hours ago)
    const { data: lastSync } = await supabaseClient
      .from('pricing_sync_log')
      .select('sync_completed_at')
      .eq('status', 'completed')
      .order('sync_completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSync?.sync_completed_at) {
      const lastSyncTime = new Date(lastSync.sync_completed_at)
      const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceSync < 24) {
        console.log(`⏰ Last sync was ${Math.round(hoursSinceSync)} hours ago, skipping`)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Sync not needed yet',
            hoursSinceLastSync: Math.round(hoursSinceSync)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Start sync log
    const { data: syncLog, error: logError } = await supabaseClient
      .from('pricing_sync_log')
      .insert({ status: 'running' })
      .select()
      .single()

    if (logError) {
      throw new Error(`Failed to create sync log: ${logError.message}`)
    }

    // Fetch data from Monday.com
    const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
          name
          items_page {
            items {
              id
              name
              column_values {
                id
                text
                value
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
    const items: MondayItem[] = data.data.boards[0]?.items_page?.items || []
    const priceUpdates: PriceUpdate[] = []

    // Monday.com Item ID mapping
    const itemMapping: Record<string, string> = {
      '2090213361': 'uv_print',
      '2090249238': 'verwaltungskosten',
      '2090255592': 'wasserdichtigkeit',
      '2090256392': 'mehrteilig',
      '2090288932': 'zeit_pro_m²',
      '2090294337': 'zeit_pro_element',
      '2090228072': 'stundenlohn',
      '2090227751': 'montage',
      '2090242018': 'entfernungspreis',
      '2090273149': 'controller',
      '2091194484': 'controller_high_power',
      '2092808058': 'hanging_system',
      '2090232832': 'dhl_klein_20cm',
      '2090231734': 'dhl_mittel_60cm',
      '2090234197': 'dhl_gross_100cm',
      '2090236189': 'spedition_120cm',
      '2090240832': 'gutertransport_240cm'
    }

    for (const item of items) {
      const priceKey = itemMapping[item.id]
      
      if (priceKey) {
        // Find price column (assuming it's named 'Preis' or contains a numeric value)
        const priceColumn = item.column_values.find(col => 
          col.text && !isNaN(parseFloat(col.text.replace(',', '.')))
        )

        if (priceColumn) {
          const priceValue = parseFloat(priceColumn.text.replace(',', '.'))
          
          priceUpdates.push({
            price_key: priceKey,
            price_value: priceValue,
            monday_item_id: item.id,
            unit: priceKey.includes('percent') ? 'percent' : 'eur',
            last_updated: new Date().toISOString()
          })
        }
      }
    }

    console.log(`📊 Processing ${priceUpdates.length} price updates`)

    // Update prices in Supabase
    const { error: upsertError } = await supabaseClient
      .from('pricing_cache')
      .upsert(priceUpdates, { onConflict: 'price_key' })

    if (upsertError) {
      throw new Error(`Failed to update prices: ${upsertError.message}`)
    }

    // Complete sync log
    await supabaseClient
      .from('pricing_sync_log')
      .update({
        status: 'completed',
        items_updated: priceUpdates.length,
        sync_completed_at: new Date().toISOString()
      })
      .eq('id', syncLog.id)

    console.log('✅ Daily price sync completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        itemsUpdated: priceUpdates.length,
        syncId: syncLog.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Sync error:', error)
    
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
