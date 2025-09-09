/// <reference types="https://deno.land/x/supabase_functions@v1.3.3/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Функция для получения публичного URL файла через GraphQL API
async function getPublicAssetUrl(assetId: string, token: string): Promise<string | null> {
  try {
    const graphqlQuery = {
      query: `
        query {
          assets(ids: [${assetId}]) {
            id
            url
            public_url
          }
        }
      `
    };

    console.log(`🔍 Выполняем GraphQL запрос для получения URL ресурса: ${assetId}`);

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!response.ok) {
      console.log(`❌ GraphQL API ответил с ошибкой: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.errors) {
      console.log('❌ GraphQL вернул ошибки:', data.errors);
      return null;
    }
    
    if (data.data?.assets?.length > 0) {
      const asset = data.data.assets[0];
      console.log('✅ Получены данные о ресурсе:', asset);
      
      // Сначала пробуем получить public_url, затем обычный url
      return asset.public_url || asset.url || null;
    } else {
      console.log('❌ Ресурс не найден в ответе API');
      return null;
    }
  } catch (error: any) {
    console.log(`❌ Ошибка при получении публичного URL: ${error.message}`);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const imageUrl = url.searchParams.get('url')
    const assetId = url.searchParams.get('id') || ''
    
    if (!imageUrl) {
      return new Response('Missing url parameter', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    // Проверяем, что это Monday.com URL
    if (!imageUrl.includes('monday.com')) {
      return new Response('Invalid URL - must be Monday.com URL', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    const token = Deno.env.get('MONDAY_API_TOKEN') || '';
    if (!token) {
      return new Response('Missing API token', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    console.log(`🔗 Proxying image from Monday.com: ${imageUrl.substring(0, 100)}...`);

    // Извлекаем ID ресурса из URL, если он не был передан как параметр
    let resourceId = assetId;
    if (!resourceId && imageUrl.includes('/files/')) {
      const match = imageUrl.match(/\/files\/(\d+)/);
      if (match && match[1]) {
        resourceId = match[1];
        console.log(`🆔 Извлечен ID ресурса из URL: ${resourceId}`);
      }
    }
    
    // Также пробуем извлечь из resources URL (старый формат)
    if (!resourceId && imageUrl.includes('/resources/')) {
      const match = imageUrl.match(/\/resources\/(\d+)\//);
      if (match && match[1]) {
        resourceId = match[1];
        console.log(`🆔 Извлечен ID ресурса из resources URL: ${resourceId}`);
      }
    }

    if (!resourceId) {
      console.log('❌ Не удалось извлечь ID ресурса');
      return new Response('Could not extract asset ID', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // НОВЫЙ МЕТОД: Получаем публичный URL через GraphQL API
    const publicApiUrl = await getPublicAssetUrl(resourceId, token);
    
    if (publicApiUrl) {
      console.log(`🌐 Получен публичный URL через API: ${publicApiUrl}`);
      
      try {
        const imageResponse = await fetch(publicApiUrl, { cache: 'no-store' });
        
        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          const imageBlob = await imageResponse.blob();
          
          console.log(`✅ Успешно загружено изображение через официальный API URL: ${imageBlob.size} байт`);
          
          return new Response(imageBlob, {
            headers: {
              ...corsHeaders,
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600',
              'X-Source': 'MondayAPI'
            }
          });
        } else {
          console.log(`❌ Ошибка при загрузке через публичный API URL: ${imageResponse.status}`);
        }
      } catch (e: any) {
        console.log(`❌ Ошибка при загрузке через публичный API URL: ${e.message}`);
      }
    }

    // Если API метод не сработал, пробуем файловый API
    const fileDownloadUrl = `https://files.monday.com/file/download/${resourceId}`;
    console.log(`📁 Пробуем download URL: ${fileDownloadUrl}`);

    const fileResponse = await fetch(fileDownloadUrl, {
      headers: {
        'Authorization': token,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store'
    });

    if (fileResponse.ok) {
      const contentType = fileResponse.headers.get('content-type') || 'image/jpeg';
      const imageBlob = await fileResponse.blob();
      
      console.log(`✅ Успешно получен файл через download URL: ${imageBlob.size} байт`);
      
      return new Response(imageBlob, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'X-Source': 'FileAPI'
        }
      });
    }

    // Пробуем прямой запрос в последнюю очередь
    console.log(`🔗 Прямой запрос к URL: ${imageUrl}`);
    
    const directResponse = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `monday_token=${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'image/*, */*'
      },
      cache: 'no-store'
    });
    
    if (!directResponse.ok) {
      console.log(`❌ Ошибка при прямом запросе: ${directResponse.status}`);
      return new Response(`Failed to fetch image: ${directResponse.status}`, { 
        status: directResponse.status,
        headers: corsHeaders 
      });
    }
    
    const contentType = directResponse.headers.get('content-type') || 'image/jpeg';
    const imageBlob = await directResponse.blob();
    
    console.log(`✅ Успешно получен файл через прямой запрос: ${imageBlob.size} байт`);
    
    return new Response(imageBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Source': 'DirectURL'
      }
    });

  } catch (error: any) {
    console.error('❌ Error proxying image:', error)
    
    return new Response(`Error fetching image: ${error.message}`, { 
      status: 500,
      headers: corsHeaders 
    })
  }
})
