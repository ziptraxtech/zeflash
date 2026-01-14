import { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { evse_id, connector_id = 1 } = req.body;

    if (!evse_id) {
      return res.status(400).json({ error: 'evse_id is required' });
    }

    console.log(`Generating report for EVSE: ${evse_id}, Connector: ${connector_id}`);

    // Fetch fresh token
    const tokenResponse = await fetch('https://cms.charjkaro.in/admin/api/v1/zipbolt/token');
    if (!tokenResponse.ok) {
      throw new Error('Failed to fetch authorization token');
    }
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    // Construct the API URL
    const apiUrl = `https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed?role=Admin&operator=All&evse_id=${evse_id}&connector_id=${connector_id}&page=1&limit=60`;

    // Run the Python inference pipeline
    const pythonPath = process.env.PYTHON_PATH || '/Users/ritvik/Desktop/zeflash /.venv/bin/python';
    
    const command = `cd "/Users/ritvik/Desktop/zeflash /battery-ml-lambda" && "${pythonPath}" inference_pipeline.py ${evse_id} --api-url "${apiUrl}" --auth-token "${token}" --limit 60 2>&1`;

    console.log('Executing inference pipeline...');

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 120000 // 2 minute timeout
    });

    // Parse the output to extract the S3 URL
    const output = stdout + stderr;
    console.log('Pipeline completed, parsing output...');

    // Extract JSON result from output
    const jsonMatch = output.match(/\{[\s\S]*"device_id"[\s\S]*"s3_url"[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return res.status(200).json({
        success: true,
        image_url: result.s3_url,
        status: result.status,
        anomalies: result.anomalies,
        device_id: result.device_id,
        generated_at: result.generated_at
      });
    }

    // Try to extract the presigned URL from the output
    const urlMatch = output.match(/📊 Image URL: (https:\/\/[^\s]+)/);
    if (urlMatch) {
      return res.status(200).json({
        success: true,
        image_url: urlMatch[1]
      });
    }

    // If we can't parse the result, return error
    console.error('Could not parse pipeline output:', output.substring(0, 500));
    return res.status(500).json({
      success: false,
      error: 'Could not parse pipeline output',
      output: output.substring(0, 1000)
    });

  } catch (error: any) {
    console.error('Error generating report:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate report',
      details: error.stderr || error.stdout || error.toString()
    });
  }
}
