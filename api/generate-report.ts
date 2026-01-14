import { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { evse_id, connector_id = 1, auth_token } = req.body;

    if (!evse_id) {
      return res.status(400).json({ success: false, error: 'evse_id is required' });
    }

    console.log(`Generating report for EVSE: ${evse_id}, Connector: ${connector_id}`);

    // Construct the API URL
    const apiUrl = `https://cms.charjkaro.in/commands/secure/api/v1/get/charger/time_lapsed?role=Admin&operator=All&evse_id=${evse_id}&connector_id=${connector_id}&page=1&limit=60`;

    // Call AWS Lambda function to run the inference pipeline
    const lambdaPayload = {
      device_id: evse_id,
      api_url: apiUrl,
      auth_token: auth_token,
      limit: 60
    };

    console.log('Calling Lambda function with payload:', JSON.stringify(lambdaPayload));

    // Use AWS Lambda invoke (assuming it's exposed via API Gateway or direct invoke)
    // For now, let's construct a direct call to the inference endpoint
    let lambdaResponse: any = await fetch(
      'https://your-lambda-api-gateway-url/generate-report',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lambdaPayload)
      }
    ).catch(async (fetchError) => {
      console.log('Lambda direct call failed, trying local inference...');
      
      // Fallback: Try to run locally if available
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      try {
        const pythonPath = process.env.PYTHON_PATH || 'python3';
        const command = `cd "/Users/ritvik/Desktop/zeflash /battery-ml-lambda" && "${pythonPath}" inference_pipeline.py ${evse_id} --api-url "${apiUrl}" --auth-token "${auth_token}" --limit 60 2>&1`;

        console.log('Executing local inference...');
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 1024 * 1024 * 10,
          timeout: 300000
        });

        const output = stdout + stderr;
        console.log('Local inference output:', output.substring(0, 500));

        // Extract S3 URL from output
        const urlMatch = output.match(/https:\/\/battery-ml-results[^\s]+/);
        if (urlMatch) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              image_url: urlMatch[0]
            })
          };
        }

        // Try JSON parsing
        const jsonMatch = output.match(/\{[\s\S]*"s3_url"[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            ok: true,
            json: async () => ({
              success: true,
              image_url: result.s3_url || result.image_url
            })
          };
        }

        throw new Error('Could not extract S3 URL from inference output');
      } catch (localError: any) {
        console.error('Local inference failed:', localError.message);
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ error: localError.message })
        };
      }
    });

    if (!lambdaResponse.ok) {
      const errorText = typeof lambdaResponse.text === 'function' 
        ? await lambdaResponse.text() 
        : JSON.stringify({ error: 'Unknown error' });
      console.error('Lambda error response:', errorText);
      return res.status(lambdaResponse.status || 500).json({
        success: false,
        error: `Error: ${errorText.substring(0, 200)}`
      });
    }

    const result = await lambdaResponse.json();
    
    if (result.image_url || result.s3_url) {
      return res.status(200).json({
        success: true,
        image_url: result.image_url || result.s3_url,
        status: result.status,
        anomalies: result.anomalies
      });
    }

    throw new Error('No image URL in response');

  } catch (error: any) {
    console.error('Error generating report:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate report'
    });
  }
}
