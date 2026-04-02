const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { generateId } = require('../db');

// Supabase client for Storage
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('📦 Supabase Storage ready');
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY not set - Storage disabled, using base64 fallback');
}

const BUCKET = 'media';

// Ensure bucket exists
async function ensureBucket() {
  if (!supabase) return;
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 104857600, // 100MB
    });
    console.log('📦 Created media bucket');
  }
}
ensureBucket().catch(console.error);

// Upload media file
// Accepts: { data: base64string, type: 'image'|'video'|'document', fileName?: string }
// Returns: { url: string, size: number }
router.post('/upload', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  if (!supabase) {
    // Fallback: return the base64 as-is (no storage available)
    return res.json({ url: req.body.data, size: req.body.data?.length || 0, fallback: true });
  }

  try {
    const { data, type, fileName } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    // Parse base64
    const matches = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato base64 non valido' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique path
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace('quicktime', 'mov') || 'bin';
    const filePath = `${type || 'file'}/${userId}/${generateId()}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Upload fallito: ' + uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    res.json({
      url: urlData.publicUrl,
      path: filePath,
      size: buffer.length,
      mimeType,
    });
  } catch (err) {
    console.error('Media upload error:', err);
    res.status(500).json({ error: 'Errore upload: ' + err.message });
  }
});

// Delete media file
router.delete('/delete', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  if (!supabase) {
    return res.json({ success: true });
  }

  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: 'Path mancante' });
    }

    // Security: only allow deleting own files
    if (!path.includes(`/${userId}/`)) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    await supabase.storage.from(BUCKET).remove([path]);
    res.json({ success: true });
  } catch (err) {
    console.error('Media delete error:', err);
    res.status(500).json({ error: 'Errore eliminazione' });
  }
});

module.exports = router;
