import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes for tools
app.post('/api/tools/get_files_info', (req, res) => {
  const { directory } = req.body;
  const workingDir = path.join(process.cwd(), 'calculator');
  const target = path.join(workingDir, directory || '.');
  
  if (!target.startsWith(workingDir)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    if (!fs.existsSync(target)) return res.json({ result: "Error: Directory not found." });
    const files = fs.readdirSync(target);
    const result = files.map(f => {
      const stat = fs.statSync(path.join(target, f));
      return `- ${f}: size=${stat.size}, is_dir=${stat.isDirectory()}`;
    }).join('\n') || "Empty directory.";
    res.json({ result });
  } catch (err: any) {
    res.json({ result: `Error: ${err.message}` });
  }
});

app.post('/api/tools/get_file_content', (req, res) => {
  const { file_path } = req.body;
  const workingDir = path.join(process.cwd(), 'calculator');
  const target = path.join(workingDir, file_path);

  if (!target.startsWith(workingDir)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    if (!fs.existsSync(target)) return res.json({ result: "Error: File not found." });
    const content = fs.readFileSync(target, 'utf-8');
    res.json({ result: content });
  } catch (err: any) {
    res.json({ result: `Error: ${err.message}` });
  }
});

app.post('/api/tools/write_file', (req, res) => {
  const { file_path, content } = req.body;
  const workingDir = path.join(process.cwd(), 'calculator');
  const target = path.join(workingDir, file_path);

  if (!target.startsWith(workingDir)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    res.json({ result: `Successfully wrote to ${file_path}` });
  } catch (err: any) {
    res.json({ result: `Error: ${err.message}` });
  }
});

app.post('/api/tools/run_python_file', async (req, res) => {
  const { file_path, args = [] } = req.body;
  const workingDir = path.join(process.cwd(), 'calculator');
  const target = path.join(workingDir, file_path);

  if (!target.startsWith(workingDir)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    if (!fs.existsSync(target)) return res.json({ result: "Error: File not found." });
    
    const result = await new Promise((resolve) => {
      const child = spawn('python3', [target, ...args]);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => stdout += d);
      child.stderr.on('data', d => stderr += d);
      child.on('close', code => {
        resolve(`STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nExit Code: ${code}`);
      });
      setTimeout(() => {
        child.kill();
        resolve("Error: Execution timed out.");
      }, 30000);
    });
    res.json({ result });
  } catch (err: any) {
    res.json({ result: `Error: ${err.message}` });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
