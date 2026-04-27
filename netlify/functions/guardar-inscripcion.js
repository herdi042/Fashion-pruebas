// netlify/functions/guardar-inscripcion.js
// Guarda los datos del formulario usando la API de GitHub directamente

const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const data = JSON.parse(event.body);

    // Validar campos requeridos
    const required = ['nombre', 'apellido', 'email', 'telefono', 'cursos'];
    for (const field of required) {
      if (!data[field]) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Campo requerido: ${field}` }) };
      }
    }

    const inscripcion = {
      id: 'FIMX-' + Date.now(),
      fecha: new Date().toISOString(),
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      edad: data.edad || '',
      ciudad: data.ciudad || '',
      experiencia: data.experiencia || '',
      motivo: data.motivo || '',
      cursos: data.cursos,
      total: data.total || 0,
      estado: 'pendiente_pago'
    };

    // Guardar en GitHub usando la API
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO; // ej: "usuario/fimx-web"
    const filePath = `data/inscripciones/${inscripcion.id}.json`;

    if (GITHUB_TOKEN && GITHUB_REPO) {
      const content = Buffer.from(JSON.stringify(inscripcion, null, 2)).toString('base64');
      const [owner, repo] = GITHUB_REPO.split('/');

      await new Promise((resolve, reject) => {
        const body = JSON.stringify({
          message: `Nueva inscripción: ${inscripcion.nombre} ${inscripcion.apellido}`,
          content: content,
          branch: 'main'
        });

        const req = https.request({
          hostname: 'api.github.com',
          path: `/repos/${owner}/${repo}/contents/${filePath}`,
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'FIMx-Netlify-Function',
            'Content-Length': Buffer.byteLength(body)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.write(body);
        req.end();
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: inscripcion.id })
    };

  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
};
