import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const fileUrl = url.searchParams.get('url')
    
    if (!fileUrl) {
      return new Response('Missing url parameter', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    const API_TOKEN = Deno.env.get('MONDAY_API_TOKEN')
    if (!API_TOKEN) {
      return new Response('Monday.com API token not configured', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    console.log(`🔗 Proxying file: ${fileUrl}`)

    // Запрашиваем файл из Monday.com с авторизацией
    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': API_TOKEN,
        'User-Agent': 'Supabase-Proxy/1.0'
      }
    })

    if (!response.ok) {
      console.error(`❌ Failed to fetch file: ${response.status}`)
      return new Response(`Failed to fetch file: ${response.status}`, { 
        status: response.status, 
        headers: corsHeaders 
      })
    }

    // Получаем тип контента
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    
    // Возвращаем файл с правильными заголовками
    const fileData = await response.arrayBuffer()
    
    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Кешируем на час
        'Content-Length': fileData.byteLength.toString()
      }
    })

  } catch (error) {
    console.error('❌ Proxy error:', error)
    return new Response(`Proxy error: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
