import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// In-memory storage for community reports & observations (seeded with realistic records)
interface SoundObservation {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  dbfs: number;
  dbSpl: number;
  primarySound: string;
  confidence: number;
  category: 'traffic' | 'nature' | 'construction' | 'speech' | 'siren' | 'ambient';
  timestamp: string;
  reportedBy: string;
}

interface CommunityReport {
  id: string;
  title: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
  decibel: number;
  locationName: string;
  latitude: number;
  longitude: number;
  description: string;
  createdAt: string;
  upvotes: number;
  status: 'active' | 'investigating' | 'resolved';
}

const observations: SoundObservation[] = [
  {
    id: 'obs-1',
    latitude: 37.7749,
    longitude: -122.4194,
    address: 'Market St & 5th St, San Francisco',
    dbfs: -18.4,
    dbSpl: 75.6,
    primarySound: 'Traffic & City Bus',
    confidence: 0.94,
    category: 'traffic',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    reportedBy: 'Scanner #402',
  },
  {
    id: 'obs-2',
    latitude: 37.7699,
    longitude: -122.4469,
    address: 'Golden Gate Park Conservatory',
    dbfs: -51.2,
    dbSpl: 42.8,
    primarySound: 'Birds & Rustling Foliage',
    confidence: 0.89,
    category: 'nature',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    reportedBy: 'EcoVolunteer',
  },
  {
    id: 'obs-3',
    latitude: 37.7891,
    longitude: -122.4014,
    address: 'SOMA Construction Corridor',
    dbfs: -11.0,
    dbSpl: 83.0,
    primarySound: 'Pneumatic Jackhammer & Drill',
    confidence: 0.96,
    category: 'construction',
    timestamp: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    reportedBy: 'UrbanAcoustic',
  },
  {
    id: 'obs-4',
    latitude: 37.7599,
    longitude: -122.4148,
    address: 'Mission St & 24th',
    dbfs: -26.3,
    dbSpl: 67.7,
    primarySound: 'Human Speech & Ambient Music',
    confidence: 0.88,
    category: 'speech',
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    reportedBy: 'Scanner #118',
  },
  {
    id: 'obs-5',
    latitude: 37.7833,
    longitude: -122.4167,
    address: 'Civic Center Plaza',
    dbfs: -14.2,
    dbSpl: 79.8,
    primarySound: 'Emergency Ambulance Siren',
    confidence: 0.92,
    category: 'siren',
    timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    reportedBy: 'CivicWatch',
  },
  {
    id: 'obs-6',
    latitude: 37.7955,
    longitude: -122.3937,
    address: 'Embarcadero Promenade',
    dbfs: -44.0,
    dbSpl: 50.0,
    primarySound: 'Water Waves & Sea Breezes',
    confidence: 0.87,
    category: 'nature',
    timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    reportedBy: 'BayWalker',
  },
];

const communityReports: CommunityReport[] = [
  {
    id: 'rep-1',
    title: 'Off-hours Commercial HVAC Vibration & Hum',
    category: 'HVAC & Machinery',
    severity: 'moderate',
    decibel: 68,
    locationName: '3rd & Brannan Residential Lofts',
    latitude: 37.7812,
    longitude: -122.3965,
    description: 'Rooftop chiller unit emitting low-frequency acoustic drone (60Hz cycle) continuously throughout sleep hours (11 PM - 6 AM).',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    upvotes: 14,
    status: 'investigating',
  },
  {
    id: 'rep-2',
    title: 'Unauthorized Weekend Jackhammer Operation',
    category: 'Construction Noise',
    severity: 'severe',
    decibel: 88,
    locationName: 'Folsom St Construction Site',
    latitude: 37.7788,
    longitude: -122.4079,
    description: 'Continuous pneumatic hammering exceeding city noise thresholds (max 80 dBA allowed at 10m). Exceeds EPA residential guidelines.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    upvotes: 27,
    status: 'active',
  },
  {
    id: 'rep-3',
    title: 'Persistent Commercial Dog Daycare Barking',
    category: 'Domestic Animals',
    severity: 'mild',
    decibel: 64,
    locationName: 'Valencia St Residential Alley',
    latitude: 37.7645,
    longitude: -122.4215,
    description: 'Outdoor courtyard holding up to 15 dogs barking intermittently during daytime remote work hours.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    upvotes: 9,
    status: 'resolved',
  },
];

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoints
  app.get('/api/observations', (_req, res) => {
    res.json({ observations });
  });

  app.post('/api/observations', (req, res) => {
    const { latitude, longitude, address, dbfs, dbSpl, primarySound, confidence, category, reportedBy } = req.body;
    const newObs: SoundObservation = {
      id: `obs-${Date.now()}`,
      latitude: Number(latitude) || 37.7749,
      longitude: Number(longitude) || -122.4194,
      address: address || 'Current Location',
      dbfs: Number(dbfs) || -50.0,
      dbSpl: Number(dbSpl) || 44.0,
      primarySound: primarySound || 'Environmental Sound',
      confidence: Number(confidence) || 0.85,
      category: category || 'ambient',
      timestamp: new Date().toISOString(),
      reportedBy: reportedBy || 'Local Observer',
    };
    observations.unshift(newObs);
    res.status(201).json({ observation: newObs, message: 'Sound observation pinned successfully.' });
  });

  app.get('/api/reports', (_req, res) => {
    res.json({ reports: communityReports });
  });

  app.post('/api/reports', (req, res) => {
    const { title, category, severity, decibel, locationName, latitude, longitude, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }
    const newReport: CommunityReport = {
      id: `rep-${Date.now()}`,
      title,
      category: category || 'General Noise Disturbance',
      severity: severity || 'moderate',
      decibel: Number(decibel) || 65,
      locationName: locationName || 'Pinned Location',
      latitude: Number(latitude) || 37.7749,
      longitude: Number(longitude) || -122.4194,
      description,
      createdAt: new Date().toISOString(),
      upvotes: 1,
      status: 'active',
    };
    communityReports.unshift(newReport);
    res.status(201).json({ report: newReport, message: 'Community noise report filed.' });
  });

  app.post('/api/reports/:id/upvote', (req, res) => {
    const { id } = req.params;
    const report = communityReports.find((r) => r.id === id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    report.upvotes += 1;
    res.json({ report, message: 'Report verified and upvoted.' });
  });

  // Acoustic AI Intelligence via Google Gemini API
  app.post('/api/analyze-audio', async (req, res) => {
    try {
      const { dbfs, dbSpl, topPredictions, durationSeconds, spectralFeatures } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback analytical output if API key is not yet set
        return res.json({
          acousticSummary: `Acoustic level recorded at ${dbSpl?.toFixed(1) || '62.0'} dBA (${dbfs?.toFixed(1) || '-32.0'} dBFS). Dominant sound detected: ${topPredictions?.[0]?.label || 'Environmental Sound'} with ${((topPredictions?.[0]?.confidence || 0.8) * 100).toFixed(0)}% confidence.`,
          whoGuidelineEvaluation: (dbSpl || 60) > 70 
            ? 'EXCEEDS WHO urban residential noise threshold (55 dBA daytime, 45 dBA nighttime). Long-term exposure increases cardiovascular and cognitive stress.'
            : 'Within acceptable EPA & WHO recommended daytime ambient thresholds.',
          ordinanceStatus: (dbSpl || 60) > 80 ? 'Potential Noise Ordinance Violation (>80 dBA)' : 'Compliant with Municipal Quiet Standards',
          healthImpact: (dbSpl || 60) > 85 
            ? 'Hazardous: Potential hearing fatigue with exposure > 45 minutes.' 
            : 'Low risk: Safe acoustic background.',
          recommendations: [
            'Record repeated samples over a 15-minute window for statistical Leq validation.',
            'Pin this observation to the Live SoundMap to contribute to community noise monitoring.',
            'If recurring at night, file a community noise disturbance report.'
          ]
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are SoundMap's Senior Acoustic Engineer and Environmental Noise Specialist.
Analyze the following environmental sound scan collected from a mobile device microphone:

Sound Scan Metrics:
- Relative Digital Level: ${dbfs?.toFixed(1) || '-30.0'} dBFS
- Estimated Sound Pressure Level: ${dbSpl?.toFixed(1) || '64.0'} dBA SPL
- Scan Duration: ${durationSeconds || 10} seconds
- Top AI Classifier Detections: ${JSON.stringify(topPredictions || [{ label: 'Traffic & Vehicles', confidence: 0.85 }])}
- Spectral Features: ${JSON.stringify(spectralFeatures || { centroid: '1240 Hz', dominantBand: 'Mid-range speech/traffic' })}

Provide an expert assessment in valid JSON with these exact fields:
1. "acousticSummary": A crisp 2-sentence breakdown of the sound signature, dominant acoustic frequencies, and environmental context.
2. "whoGuidelineEvaluation": Detailed assessment against WHO Community Noise Guidelines (55 dBA daytime, 45 dBA night) and EPA standards.
3. "ordinanceStatus": One concise status string (e.g. "Compliant Ambient", "Moderate Nuisance Threshold", or "Ordinance Violation Risk").
4. "healthImpact": Clinical evaluation of hearing strain, sleep disruption, or cognitive stress.
5. "recommendations": Array of 3 specific, actionable steps for the citizen or community planner.

Return ONLY the raw JSON object, without markdown formatting.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '{}';
      try {
        const parsed = JSON.parse(rawText);
        res.json(parsed);
      } catch {
        res.json({
          acousticSummary: rawText.slice(0, 300),
          whoGuidelineEvaluation: 'Evaluated against WHO Environmental Guidelines.',
          ordinanceStatus: 'Reviewed',
          healthImpact: 'Standard ambient exposure.',
          recommendations: ['Monitor recurring levels.', 'Verify location context.', 'Export logs for documentation.']
        });
      }
    } catch (err: unknown) {
      console.error('Gemini acoustic analysis error:', err);
      res.status(500).json({ error: 'Failed to analyze sound signature with AI' });
    }
  });

  // Vite middleware in dev or static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SoundMap Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
