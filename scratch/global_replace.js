const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2] || 'client/src';
const absoluteRootDir = path.resolve(process.cwd(), rootDir);

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replacements
    // 1. Specific string values
    content = content.replace(/["']First Semester["']/g, '"TERM 1 2026"');
    content = content.replace(/["']Second Semester["']/g, '"TERM 2 2026"');
    content = content.replace(/["']Third Semester["']/g, '"TERM 3 2026"');
    
    // 2. Component labels and variables
    content = content.replace(/Semester/g, 'Term');
    content = content.replace(/semester/g, 'term');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`Directory not found: ${dir}`);
        return;
    }
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.css') || fullPath.endsWith('.json')) {
            replaceInFile(fullPath);
        }
    });
}

console.log(`Starting global replacement in ${absoluteRootDir}...`);
walkDir(absoluteRootDir);
console.log('Done.');
