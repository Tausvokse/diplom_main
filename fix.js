import fs from 'fs';
import path from 'path';

const dir = './src/server/services';

function processDir(directory) {
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.spec.ts') || file.endsWith('.test.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace anything like vi.mock('../lib/prisma', ...) with nothing
      content = content.replace(/vi\.mock\(['"]\.\.\/lib\/prisma['"].*?\n\}\);/gs, "");
      
      // Also remove any leftover single line vi.mock for prisma
      content = content.replace(/vi\.mock\(['"]\.\.\/lib\/prisma['"]\);?/g, "");
      content = content.replace(/vi\.mock\(['"]\.\.\/lib\/__mocks__\/prisma['"]\);?/g, "");
      
      // Clean up empty lines caused by removal
      content = content.replace(/\n\n\n+/g, "\n\n");

      // Inject standard mock
      const lines = content.split('\n');
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, "vi.mock('../lib/prisma');");
      }
      content = lines.join('\n');

      fs.writeFileSync(fullPath, content, 'utf8');
      console.log('Fixed:', fullPath);
    }
  });
}

processDir(dir);
