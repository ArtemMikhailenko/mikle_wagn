import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

// Включаем CORS для всех запросов
app.use(cors());

// Proxy endpoint для загрузки SVG файлов
app.get('/proxy-svg', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('🌐 Proxy request for URL:', url);

    // Загружаем файл через axios
    const response = await axios.get(url, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/svg+xml,*/*'
      },
      timeout: 10000 // 10 секунд таймаут
    });

    // Устанавливаем правильные заголовки
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    console.log('✅ Successfully proxied SVG, length:', response.data.length);
    res.send(response.data);

  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch SVG', 
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SVG Proxy server running on http://localhost:${PORT}`);
  console.log(`📋 Usage: http://localhost:${PORT}/proxy-svg?url=<encoded-svg-url>`);
});