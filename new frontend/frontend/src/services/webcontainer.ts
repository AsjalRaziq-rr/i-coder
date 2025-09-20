import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (!webcontainerInstance) {
    try {
      webcontainerInstance = await WebContainer.boot();
    } catch (error) {
      throw new Error('WebContainer not supported in this environment');
    }
  }
  return webcontainerInstance;
}

export async function mountFiles(webcontainer: WebContainer, files: any[]) {
  try {
    // Convert files array to WebContainer format
    const fileTree: { [key: string]: any } = {};
    
    if (files && Array.isArray(files)) {
      files.forEach(file => {
        if (file && file.name && typeof file.content === 'string') {
          fileTree[file.name] = {
            file: {
              contents: file.content
            }
          };
        }
      });
    }
    
    await webcontainer.mount(fileTree);
  } catch (error) {
    throw new Error(`Failed to mount files: ${error.message}`);
  }
}

export async function runCommand(webcontainer: WebContainer, command: string): Promise<string> {
  try {
    if (!command || typeof command !== 'string') {
      return 'Error: Invalid command';
    }
    
    const process = await webcontainer.spawn('sh', ['-c', command]);
    
    let output = '';
    let error = '';
    
    // Handle stdout
    if (process.output) {
      const reader = process.output.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          output += new TextDecoder().decode(value);
        }
      } catch (e) {
        // Reader error, continue
      }
    }
    
    const exitCode = await process.exit;
    
    if (exitCode !== 0 && !output) {
      return `Command failed with exit code: ${exitCode}`;
    }
    
    return output || `Command executed successfully (exit code: ${exitCode})`;
  } catch (error) {
    return `WebContainer error: ${error.message || 'Command execution failed'}`;
  }
}

export async function startDevServer(isReactApp: boolean = false): Promise<string> {
  const webcontainer = await getWebContainer();
  
  // Install dependencies first
  await runCommand('npm install');
  
  // Start appropriate dev server
  const command = isReactApp ? 'npm start' : 'npm run dev';
  const serverProcess = await webcontainer.spawn('sh', ['-c', command]);
  
  // Wait for server to be ready
  webcontainer.on('server-ready', (port, url) => {
    console.log(`Server ready at ${url}`);
  });
  
  const defaultPort = isReactApp ? '3000' : '5173';
  return `http://localhost:${defaultPort}`;
}